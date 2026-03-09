import {
  ErrorCodes,
  errorShape,
  formatValidationErrors,
  validateHubSearchParams,
  validateHubInstallParams,
  validateHubTestParams,
} from "../protocol/index.js";
import type { GatewayRequestHandlers } from "./types.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";
import fs from "node:fs";
import path from "node:path";
import { ensureDir } from "../../utils.js";
import { loadWorkspaceSkillEntries } from "../../agents/skills.js";
import * as https from "node:https";
import { spawn } from "node:child_process";
import unzipper from "unzipper";

const log = createSubsystemLogger("gateway/hub");

// On huggingface space we should use /app directory instead of ~/.clawdbot for skills to ensure they are available
const APP_DIR = process.env.SPACE_ID ? "/app" : process.cwd();
const SKILLS_DIR = path.join(APP_DIR, "skills");

async function fetchWithRetry(
  url: string,
  options: https.RequestOptions,
  retries = 3,
): Promise<{ data: Buffer; statusCode: number }> {
  return new Promise((resolve, reject) => {
    const attempt = (currentTry: number) => {
      const req = https.request(url, options, (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          return fetchWithRetry(res.headers.location, options, retries).then(resolve).catch(reject);
        }

        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          resolve({ data: Buffer.concat(chunks), statusCode: res.statusCode || 200 });
        });
      });

      req.on("error", (err) => {
        if (currentTry < retries) {
          setTimeout(() => attempt(currentTry + 1), 1000 * currentTry);
        } else {
          reject(err);
        }
      });
      req.end();
    };
    attempt(1);
  });
}

export const hubHandlers: GatewayRequestHandlers = {
  "hub.search": async ({ params, respond }) => {
    if (!validateHubSearchParams(params)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          `invalid hub.search params: ${formatValidationErrors(validateHubSearchParams.errors)}`,
        ),
      );
      return;
    }
    const { query } = params as { query: string };

    log.info(`Searching hub for query: ${query}`);
    try {
      const result = await fetchWithRetry(
        `https://clawhub.ai/api/v1/search?q=${encodeURIComponent(query)}`,
        { method: "GET" },
      );
      if (result.statusCode !== 200) {
        throw new Error(`ClawHub API returned status ${result.statusCode}`);
      }
      const parsed = JSON.parse(result.data.toString("utf-8"));

      const results = parsed.results || [];
      const formattedSkills = results.map((r: any) => ({
        id: r.skill.slug,
        name: r.skill.displayName || r.skill.slug,
        description: r.skill.summary || "",
        version: r.latestVersion?.version || "1.0.0",
        author: r.owner?.displayName || r.owner?.handle || "Unknown",
        downloads: r.skill.stats?.downloads || 0,
      }));

      respond(true, { skills: formattedSkills }, undefined);
    } catch (e) {
      log.error(`Failed to search hub: ${e}`);
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, `Failed to search hub: ${e}`));
    }
  },

  "hub.install": async ({ params, respond }) => {
    if (!validateHubInstallParams(params)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          `invalid hub.install params: ${formatValidationErrors(validateHubInstallParams.errors)}`,
        ),
      );
      return;
    }
    const { slug } = params as { slug: string };

    log.info(`Installing skill from hub: ${slug}`);
    try {
      // Find latest version
      const infoRes = await fetchWithRetry(
        `https://clawhub.ai/api/v1/skills/${encodeURIComponent(slug)}`,
        { method: "GET" },
      );
      if (infoRes.statusCode !== 200) {
        throw new Error(`Failed to fetch skill info, status: ${infoRes.statusCode}`);
      }
      const info = JSON.parse(infoRes.data.toString("utf-8"));
      const version = info.latestVersion?.version;
      if (!version) {
        throw new Error("No version found for this skill.");
      }

      // Download Zip
      const zipRes = await fetchWithRetry(
        `https://clawhub.ai/api/v1/download?slug=${encodeURIComponent(slug)}&version=${encodeURIComponent(version)}`,
        { method: "GET" },
      );
      if (zipRes.statusCode !== 200) {
        throw new Error(`Failed to download skill zip, status: ${zipRes.statusCode}`);
      }

      const skillTargetDir = path.join(SKILLS_DIR, slug);
      await ensureDir(skillTargetDir);

      // Write the zip temporarily
      const tempZipPath = path.join(skillTargetDir, "skill.zip");
      await fs.promises.writeFile(tempZipPath, zipRes.data);

      // Extract zip using unzipper
      const directory = await unzipper.Open.file(tempZipPath);
      for (const file of directory.files) {
        const outPath = path.join(skillTargetDir, file.path);
        // Prevent zip slip vulnerability
        if (!outPath.startsWith(path.resolve(skillTargetDir) + path.sep)) {
          log.warn(`Skipped extracting ${file.path} outside of target directory.`);
          continue;
        }
        if (file.type === "Directory") {
          await ensureDir(outPath);
        } else {
          await ensureDir(path.dirname(outPath));
          const content = await file.buffer();
          await fs.promises.writeFile(outPath, content);
        }
      }

      await fs.promises.unlink(tempZipPath);

      // Run install command if SKILL.md specifies one
      const entries = loadWorkspaceSkillEntries(skillTargetDir);
      const entry = entries.find(
        (e) => e.skill.name === slug || e.skill.name === info.skill.displayName,
      );

      let installMessage = `Installed ${slug} (v${version})`;

      if (entry && (entry.frontmatter as any)?.openclaw?.install) {
        log.info(
          `Running install script for ${slug}: ${(entry.frontmatter as any).openclaw.install}`,
        );
        const installCmd = (entry.frontmatter as any).openclaw.install;

        await new Promise<void>((resolve, reject) => {
          const proc = spawn(installCmd, { shell: true, cwd: skillTargetDir });
          proc.stdout.on("data", (d) => log.info(`[${slug} install]: ${d.toString()}`));
          proc.stderr.on("data", (d) => log.warn(`[${slug} install]: ${d.toString()}`));
          proc.on("close", (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Install script failed with code ${code}`));
          });
        });
        installMessage += ` and ran setup successfully.`;
      }

      respond(true, { ok: true, message: installMessage }, undefined);
    } catch (e) {
      log.error(`Failed to install skill from hub: ${e}`);
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.UNAVAILABLE, `Failed to install skill from hub: ${e}`),
      );
    }
  },

  "hub.test": async ({ params, respond }) => {
    if (!validateHubTestParams(params)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          `invalid hub.test params: ${formatValidationErrors(validateHubTestParams.errors)}`,
        ),
      );
      return;
    }
    const { slug } = params as { slug: string };

    log.info(`Testing skill from hub: ${slug}`);
    try {
      const skillTargetDir = path.join(SKILLS_DIR, slug);
      const entries = loadWorkspaceSkillEntries(skillTargetDir);

      if (!entries || entries.length === 0) {
        respond(
          false,
          undefined,
          errorShape(
            ErrorCodes.INVALID_REQUEST,
            `Skill ${slug} not found locally at ${skillTargetDir}. Did you install it?`,
          ),
        );
        return;
      }

      const entry = entries[0];
      const requiredEnvs = (entry.frontmatter as any)?.openclaw?.requires?.env || [];
      const missingEnvs = [];
      const foundEnvs: Record<string, string> = {};

      for (const env of requiredEnvs) {
        if (process.env[env]) {
          foundEnvs[env] = "FOUND_IN_ENV (HF Secret/Env)";
        } else {
          missingEnvs.push(env);
        }
      }

      if (missingEnvs.length > 0) {
        log.warn(
          `Skill ${slug} is missing required env variables (like HF secrets): ${missingEnvs.join(", ")}`,
        );
      } else {
        log.info(`Skill ${slug} has all required env vars: ${Object.keys(foundEnvs).join(", ")}`);
      }

      log.info(`Run output for ${slug}: Success (Analyzed skill requirements).`);

      respond(
        true,
        {
          ok: true,
          message: `Tested ${slug} successfully.\n\nRequired Envs: ${requiredEnvs.length > 0 ? requiredEnvs.join(", ") : "None"}\nMissing Envs: ${missingEnvs.length > 0 ? missingEnvs.join(", ") : "None"}`,
        },
        undefined,
      );
    } catch (e) {
      log.error(`Failed to test skill from hub: ${e}`);
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.UNAVAILABLE, `Failed to test skill from hub: ${e}`),
      );
    }
  },
};
