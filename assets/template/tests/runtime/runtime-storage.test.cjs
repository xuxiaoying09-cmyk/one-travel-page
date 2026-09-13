"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function loadBrowserCommonJs(relativePath) {
  const source = fs.readFileSync(path.resolve(__dirname, relativePath), "utf8");
  const module = { exports: {} };
  return new Function("module", "exports", "require", `${source}\nreturn module.exports;`)(module, module.exports, require);
}

const storageRuntime = loadBrowserCommonJs("../../runtime-storage.js");
const ledgerRuntime = loadBrowserCommonJs("../../ledger.js");

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    }
  };
}

test("the generic adapter defaults to local mode and never calls fetch", async () => {
  const originalFetch = global.fetch;
  let fetchCalls = 0;
  global.fetch = async () => {
    fetchCalls += 1;
    throw new Error("local mode must not call fetch");
  };
  try {
    const storage = createMemoryStorage();
    const adapter = storageRuntime.createAdapter({ tripId: "sample-trip", storage });
    assert.equal(adapter.mode, "local");
    await adapter.applyChange("travelers", { id: "person-1", name: "Traveler" });
    await adapter.applyChange("settings", { baseCurrency: "CNY" });
    const snapshot = await adapter.load();
    assert.deepEqual(snapshot.travelers, [{ id: "person-1", name: "Traveler" }]);
    assert.deepEqual(snapshot.settings, { baseCurrency: "CNY" });
    assert.equal(fetchCalls, 0);
  } finally {
    global.fetch = originalFetch;
  }
});

test("local snapshots are isolated by trip id", async () => {
  const storage = createMemoryStorage();
  const first = storageRuntime.createAdapter({ tripId: "trip-a", storage });
  const second = storageRuntime.createAdapter({ tripId: "trip-b", storage });
  await first.applyChange("todos", { id: "todo-1", text: "Pack" });
  assert.equal((await first.load()).todos.length, 1);
  assert.equal((await second.load()).todos.length, 0);
});

test("scoped saves preserve collections owned by other modules", async () => {
  const storage = createMemoryStorage();
  const shared = storageRuntime.createAdapter({ tripId: "shared-trip", storage });
  await shared.applyChange("todos", { id: "todo-1", text: "Pack" });

  const ledger = storageRuntime.createAdapter({
    tripId: "shared-trip",
    storage,
    collections: ["settings", "travelers", "bills"]
  });
  await ledger.save({
    version: 1,
    settings: { baseCurrency: "CNY" },
    travelers: [{ id: "person-1", name: "Traveler" }],
    bills: [],
    updatedAt: new Date().toISOString()
  });

  const snapshot = await shared.load();
  assert.deepEqual(snapshot.todos, [{ id: "todo-1", text: "Pack" }]);
  assert.equal(snapshot.travelers[0].id, "person-1");
});

test("the ledger local adapter persists settings, travelers, and bills offline", async () => {
  const storage = createMemoryStorage();
  const first = ledgerRuntime.createLocalStorageAdapter("ledger-trip", { storage });
  await first.save({
    version: 1,
    settings: { baseCurrency: "EUR", commonCurrencies: ["CHF"], lastCurrency: "EUR" },
    travelers: [{ id: "person-1", name: "Traveler" }],
    bills: [{ id: "bill-1", baseAmountCents: 1200 }],
    updatedAt: new Date().toISOString()
  });
  const second = ledgerRuntime.createLocalStorageAdapter("ledger-trip", { storage });
  const snapshot = await second.load();
  assert.equal(snapshot.settings.baseCurrency, "EUR");
  assert.equal(snapshot.travelers[0].id, "person-1");
  assert.equal(snapshot.bills[0].baseAmountCents, 1200);
});

test("D1 is contacted only after an explicit d1 mode selection", async () => {
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (url, init = {}) => {
    calls.push({ url, init });
    return {
      ok: true,
      async json() {
        return { version: 1, settings: null, travelers: [], bills: [], todos: [], tickets: [] };
      }
    };
  };
  try {
    const adapter = storageRuntime.createAdapter({
      mode: "d1",
      tripId: "shared trip",
      apiBase: "/custom-api",
      collections: ["todos"],
      storage: createMemoryStorage()
    });
    assert.equal(adapter.mode, "d1");
    await adapter.load();
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "/custom-api/shared%20trip?collections=todos");
  } finally {
    global.fetch = originalFetch;
  }
});

test("D1 requires and enforces an explicit collection allowlist", async () => {
  assert.throws(() => storageRuntime.createAdapter({ mode: "d1", tripId: "shared-trip" }), /explicit shared record collection allowlist/);
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    async json() { return { version: 1, todos: [], tickets: [{ id: "ticket-hidden", completed: true }] }; }
  });
  try {
    const adapter = storageRuntime.createAdapter({
      mode: "d1",
      tripId: "shared-trip",
      collections: ["todos"],
      storage: createMemoryStorage()
    });
    const snapshot = await adapter.load();
    assert.deepEqual(snapshot.tickets, []);
    await assert.rejects(adapter.applyChange("tickets", { id: "ticket-blocked", completed: true }), /not enabled/);
  } finally {
    global.fetch = originalFetch;
  }
});

test("D1 rejects cross-origin and backslash apiBase values", () => {
  for (const apiBase of ["https://evil.example/api", "//evil.example/api", "/\\evil.example/api", "/api/trip?leak=1"]) {
    assert.throws(() => storageRuntime.createAdapter({ mode: "d1", tripId: "shared-trip", collections: ["todos"], apiBase }), /same-origin/);
  }
});
