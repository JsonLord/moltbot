import type { IncomingMessage, ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function handleApiDocsHttpRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (url.pathname === "/api-docs" || url.pathname.startsWith("/api-docs/")) {
    try {
      let subPath = url.pathname.slice("/api-docs".length);
      if (subPath === "" || subPath === "/") {
        subPath = "/index.html";
      }

      const filePath = join(__dirname, "api-docs", subPath);

      // Basic path traversal prevention
      if (!filePath.startsWith(join(__dirname, "api-docs"))) {
        res.statusCode = 403;
        res.end("Forbidden");
        return true;
      }

      const content = await readFile(filePath, "utf-8");

      if (filePath.endsWith(".html")) {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
      } else if (filePath.endsWith(".css")) {
        res.setHeader("Content-Type", "text/css; charset=utf-8");
      } else if (filePath.endsWith(".js")) {
        res.setHeader("Content-Type", "application/javascript; charset=utf-8");
      }

      res.statusCode = 200;
      res.end(content);
      return true;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        res.statusCode = 404;
        res.end("Not Found");
        return true;
      }
      res.statusCode = 500;
      res.end("Internal Server Error");
      return true;
    }
  }

  return false;
}
