(() => {
  "use strict";

  const STORAGE_VERSION = 1;
  const DEFAULT_KEY_PREFIX = "travel-plan:runtime:v1";
  const RECORD_COLLECTIONS = Object.freeze(["bills", "travelers", "todos", "tickets"]);
  const SUPPORTED_COLLECTIONS = new Set([...RECORD_COLLECTIONS, "settings"]);

  function deepClone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function emptySnapshot() {
    return {
      version: STORAGE_VERSION,
      settings: null,
      bills: [],
      travelers: [],
      todos: [],
      tickets: [],
      updatedAt: new Date().toISOString()
    };
  }

  function normalizeSnapshot(raw) {
    const fallback = emptySnapshot();
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fallback;
    return {
      ...raw,
      version: Number.isSafeInteger(raw.version) ? raw.version : STORAGE_VERSION,
      settings: raw.settings && typeof raw.settings === "object" && !Array.isArray(raw.settings)
        ? deepClone(raw.settings)
        : null,
      bills: Array.isArray(raw.bills) ? deepClone(raw.bills) : [],
      travelers: Array.isArray(raw.travelers) ? deepClone(raw.travelers) : [],
      todos: Array.isArray(raw.todos) ? deepClone(raw.todos) : [],
      tickets: Array.isArray(raw.tickets) ? deepClone(raw.tickets) : [],
      updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : fallback.updatedAt
    };
  }

  function normalizeMode(mode) {
    return String(mode || "").trim().toLowerCase() === "d1" ? "d1" : "local";
  }

  function normalizeCollections(collections, fallback = []) {
    if (!Array.isArray(collections) || !collections.length) return [...fallback];
    const selected = [...new Set(collections.filter((collection) => SUPPORTED_COLLECTIONS.has(collection)))];
    return selected;
  }

  function normalizeApiBase(value = "/api/trip") {
    const raw = String(value || "").trim();
    if (!/^\/(?!\/)/.test(raw) || raw.includes("\\") || /[?#]/.test(raw)) {
      throw new Error("D1 apiBase must be a same-origin absolute path");
    }
    return raw.replace(/\/+$/, "") || "/";
  }

  function scopeSnapshot(raw, ownedCollections) {
    const snapshot = normalizeSnapshot(raw);
    if (!ownedCollections.includes("settings")) snapshot.settings = null;
    RECORD_COLLECTIONS.forEach((collection) => {
      if (!ownedCollections.includes(collection)) snapshot[collection] = [];
    });
    return snapshot;
  }

  function normalizeTripId(value) {
    const tripId = String(value || "").trim();
    return tripId || "default-trip";
  }

  function makeStorageKey(tripId, prefix = DEFAULT_KEY_PREFIX) {
    return `${String(prefix || DEFAULT_KEY_PREFIX)}:${encodeURIComponent(normalizeTripId(tripId))}`;
  }

  function resolveStorage(candidate) {
    if (candidate) return candidate;
    try {
      return globalThis.localStorage || null;
    } catch {
      return null;
    }
  }

  function updateSnapshot(snapshot, collection, value, op = "upsert") {
    if (!SUPPORTED_COLLECTIONS.has(collection)) {
      throw new Error(`Unsupported runtime collection: ${collection}`);
    }
    if (!["upsert", "delete"].includes(op)) {
      throw new Error(`Unsupported runtime operation: ${op}`);
    }
    const next = normalizeSnapshot(snapshot);
    if (collection === "settings") {
      next.settings = op === "delete" ? null : deepClone(value || {});
    } else {
      const id = String(typeof value === "object" && value !== null ? value.id || "" : value || "").trim();
      if (!id) throw new Error(`${collection} records require a stable id`);
      const index = next[collection].findIndex((item) => String(item?.id || "") === id);
      if (op === "delete") {
        if (index >= 0) next[collection].splice(index, 1);
      } else {
        const record = { ...deepClone(value), id };
        if (index >= 0) next[collection][index] = record;
        else next[collection].push(record);
      }
    }
    next.version = STORAGE_VERSION;
    next.updatedAt = new Date().toISOString();
    return next;
  }

  function createLocalAdapter(options = {}) {
    const tripId = normalizeTripId(options.tripId);
    const storageKey = options.storageKey || makeStorageKey(tripId, options.storageKeyPrefix);
    let storage = resolveStorage(options.storage);
    let memorySnapshot = null;
    let queue = Promise.resolve();
    const ownedCollections = normalizeCollections(options.collections, [...SUPPORTED_COLLECTIONS]);

    function readStoredSnapshot() {
      if (!storage) return memorySnapshot ? normalizeSnapshot(memorySnapshot) : emptySnapshot();
      try {
        const serialized = storage.getItem(storageKey);
        if (!serialized) return memorySnapshot ? normalizeSnapshot(memorySnapshot) : emptySnapshot();
        const parsed = JSON.parse(serialized);
        memorySnapshot = normalizeSnapshot(parsed);
        return normalizeSnapshot(memorySnapshot);
      } catch (error) {
        console.warn("TravelRuntimeStorage could not read localStorage; using memory for this tab.", error);
        storage = null;
        return memorySnapshot ? normalizeSnapshot(memorySnapshot) : emptySnapshot();
      }
    }

    function persistSnapshot(snapshot) {
      const normalized = normalizeSnapshot(snapshot);
      memorySnapshot = normalized;
      if (storage) {
        try {
          storage.setItem(storageKey, JSON.stringify(normalized));
        } catch (error) {
          console.warn("TravelRuntimeStorage could not write localStorage; using memory for this tab.", error);
          storage = null;
        }
      }
      return normalizeSnapshot(normalized);
    }

    function enqueue(operation) {
      const pending = queue.then(operation, operation);
      queue = pending.catch(() => {});
      return pending;
    }

    return {
      mode: "local",
      tripId,
      storageKey,
      async load() {
        return readStoredSnapshot();
      },
      async save(snapshot) {
        return enqueue(() => {
          const stored = readStoredSnapshot();
          const incoming = normalizeSnapshot(snapshot);
          for (const collection of ownedCollections) {
            stored[collection] = deepClone(incoming[collection]);
          }
          stored.version = STORAGE_VERSION;
          stored.updatedAt = incoming.updatedAt;
          const saved = persistSnapshot(stored);
          Object.assign(snapshot, saved);
          return saved;
        });
      },
      async applyChange(collection, value, op = "upsert") {
        return enqueue(() => persistSnapshot(updateSnapshot(readStoredSnapshot(), collection, value, op)));
      }
    };
  }

  function createD1Adapter(options = {}) {
    const tripId = normalizeTripId(options.tripId);
    const apiBase = normalizeApiBase(options.apiBase || "/api/trip");
    const ownedCollections = normalizeCollections(options.collections);
    const ownedRecordCollections = RECORD_COLLECTIONS.filter((collection) => ownedCollections.includes(collection));
    if (!ownedRecordCollections.length) throw new Error("D1 mode requires an explicit shared record collection allowlist");
    const settingsAdapter = createLocalAdapter({
      tripId,
      storage: options.storage,
      storageKey: options.settingsStorageKey,
      storageKeyPrefix: options.storageKeyPrefix || `${DEFAULT_KEY_PREFIX}:d1-settings`,
      collections: ["settings"]
    });
    let previous = null;
    let queue = Promise.resolve();

    function endpoint() {
      return `${apiBase}/${encodeURIComponent(tripId)}?collections=${encodeURIComponent(ownedRecordCollections.join(","))}`;
    }

    async function readLocalSettings() {
      const local = await settingsAdapter.load();
      return local.settings;
    }

    async function withLocalSettings(remote) {
      const snapshot = scopeSnapshot(remote, ownedCollections);
      if (ownedCollections.includes("settings")) {
        const localSettings = await readLocalSettings();
        if (localSettings) snapshot.settings = localSettings;
      }
      return snapshot;
    }

    async function request(method, changes) {
      const init = method === "GET"
        ? { cache: "no-store" }
        : {
            method,
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ changes })
          };
      const response = await fetch(endpoint(), init);
      if (!response.ok) throw new Error(`API ${response.status}`);
      previous = await withLocalSettings(await response.json());
      return normalizeSnapshot(previous);
    }

    function enqueue(operation) {
      const pending = queue.then(operation, operation);
      queue = pending.catch(() => {});
      return pending;
    }

    return {
      mode: "d1",
      tripId,
      apiBase,
      async load() {
        return request("GET");
      },
      async save(snapshot) {
        return enqueue(async () => {
          const next = normalizeSnapshot(snapshot);
          if (ownedCollections.includes("settings")) {
            await settingsAdapter.applyChange("settings", next.settings || {}, "upsert");
          }
          const changes = [];
          for (const collection of ownedRecordCollections) {
            const before = new Map((previous?.[collection] || []).map((item) => [String(item.id), item]));
            const after = new Map(next[collection].map((item) => [String(item.id), item]));
            before.forEach((_, id) => {
              if (!after.has(id)) changes.push({ op: "delete", collection, id });
            });
            after.forEach((record, id) => {
              if (JSON.stringify(before.get(id)) !== JSON.stringify(record)) {
                changes.push({ op: "upsert", collection, id, value: record });
              }
            });
          }
          if (!changes.length) {
            const merged = normalizeSnapshot(previous);
            for (const collection of ownedRecordCollections) {
              merged[collection] = deepClone(next[collection]);
            }
            if (ownedCollections.includes("settings")) merged.settings = deepClone(next.settings);
            merged.updatedAt = next.updatedAt;
            previous = merged;
            Object.assign(snapshot, normalizeSnapshot(previous));
            return normalizeSnapshot(previous);
          }
          const saved = await request("POST", changes);
          Object.assign(snapshot, saved);
          return saved;
        });
      },
      async applyChange(collection, value, op = "upsert") {
        return enqueue(async () => {
          if (!ownedCollections.includes(collection)) {
            throw new Error(`Runtime collection is not enabled for this D1 adapter: ${collection}`);
          }
          if (collection === "settings") {
            const local = await settingsAdapter.applyChange(collection, value, op);
            if (previous) previous.settings = local.settings;
            return previous ? normalizeSnapshot(previous) : withLocalSettings(emptySnapshot());
          }
          const id = String(typeof value === "object" && value !== null ? value.id || "" : value || "").trim();
          if (!id) throw new Error(`${collection} records require a stable id`);
          return request("POST", [{ op, collection, id, ...(op === "upsert" ? { value: deepClone(value) } : {}) }]);
        });
      }
    };
  }

  function createAdapter(options = {}) {
    return normalizeMode(options.mode) === "d1"
      ? createD1Adapter(options)
      : createLocalAdapter(options);
  }

  const publicApi = Object.freeze({
    createAdapter,
    createLocalAdapter,
    createD1Adapter,
    emptySnapshot,
    makeStorageKey,
    normalizeMode,
    normalizeCollections,
    normalizeApiBase,
    normalizeSnapshot
  });

  if (typeof module === "object" && module.exports) module.exports = publicApi;
  if (typeof window !== "undefined") window.TravelRuntimeStorage = publicApi;
})();
