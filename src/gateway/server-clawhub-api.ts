import type { IncomingMessage, ServerResponse } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type ClawhubApiRequestOptions = {
  // If we need any options later like auth tokens
};

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.end(JSON.stringify(body));
}

async function readJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

export async function handleClawhubApiHttpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  opts?: ClawhubApiRequestOptions,
): Promise<boolean> {
  const urlRaw = req.url;
  if (!urlRaw) return false;

  const url = new URL(urlRaw, "http://localhost");
  const pathname = url.pathname;

  if (!pathname.startsWith("/api/clawhub/")) {
    return false;
  }

  if (pathname === "/api/clawhub/search" && req.method === "GET") {
    const query = url.searchParams.get("q") || "";
    try {
      // Actually we don't have a direct Node API from clawdhub CLI documented well,
      // so we use child_process or just mock it based on requirements if needed.
      // But it seems we CAN just run `npx clawdhub search <query>` or similar.
      // For now, let's execute the CLI command directly and parse the output if possible,
      // OR better, we can hit the clawdhub REST API if one exists?
      // Since `clawdhub` is installed as a dependency, maybe we can require it?

      // I'll try calling the CLI first.
      // Note: clawdhub search outputs human-readable text.
      // Let's see if we can just return dummy data for search, or parse the CLI?
      // Actually, since I must search skills from clawdhub, I will use `npx clawdhub search`.
      // Let's implement a dummy response for now just to verify the pipe.

      // Let's try requiring it if it exposes an API.
      // For safety, I will implement a placeholder that succeeds.
      const searchData = {
        skills: [{ name: "test-skill", description: "A test skill" }],
      };

      // Proxy to the internal FastAPI backend running on localhost:8000
      const fastApiUrl = `http://localhost:8000/api/clawhub/search${query ? `?q=${encodeURIComponent(query)}` : ""}`;
      const response = await fetch(fastApiUrl, { method: "GET" });
      const data = await response.json();

      sendJson(res, response.status, data);
      return true;
    } catch (e: any) {
      sendJson(res, 500, { ok: false, error: e.message });
      return true;
    }
  }

  if (pathname === "/api/clawhub/install" && req.method === "POST") {
    try {
      const body = await readJsonBody(req);
      const skillName = body.name;
      if (!skillName) {
        sendJson(res, 400, { ok: false, error: "Missing skill name" });
        return true;
      }

      // Proxy to the internal FastAPI backend running on localhost:8000
      const fastApiUrl = `http://localhost:8000/api/clawhub/install`;
      const response = await fetch(fastApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: skillName }),
      });
      const data = await response.json();

      sendJson(res, response.status, data);
      return true;
    } catch (e: any) {
      sendJson(res, 500, { ok: false, error: e.message });
      return true;
    }
  }

  // Not found under /api/clawhub/
  sendJson(res, 404, { ok: false, error: "Clawhub API not found" });
  return true;
}
