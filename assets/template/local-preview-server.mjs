import http from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const requestedPort = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";
let activePort = requestedPort;

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf"
};

async function serveStatic(request, response, url) {
  if (!["GET", "HEAD"].includes(request.method || "GET")) {
    response.writeHead(405, { "content-type": "text/plain; charset=utf-8", allow: "GET, HEAD" });
    response.end("Method not allowed");
    return;
  }
  const requested = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const filePath = path.resolve(root, `.${requested}`);
  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }
  try {
    const body = await fs.readFile(filePath);
    response.writeHead(200, {
      "content-type": contentTypes[path.extname(filePath)] || "application/octet-stream",
      "cache-control": "no-store"
    });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${host}:${activePort}`);
    await serveStatic(request, response, url);
  } catch (error) {
    response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    response.end(`Local preview server failed: ${error.message}`);
  }
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE" && !process.env.PORT && activePort < requestedPort + 20) {
    activePort += 1;
    server.listen(activePort, host);
    return;
  }
  throw error;
});

server.listen(activePort, host, () => {
  console.log(`Travel plan local preview: http://${host}:${activePort}/`);
  console.log("Local preview only. Runtime state stays in this browser; no database or D1 is used.");
});
