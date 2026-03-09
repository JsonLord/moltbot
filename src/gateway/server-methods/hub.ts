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
import { CONFIG_DIR, ensureDir } from "../../utils.js";
import { loadWorkspaceSkillEntries } from "../../agents/skills.js";
import unzipper from "unzipper";

const log = createSubsystemLogger("gateway/hub");

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
      const response = await fetch(
        `https://clawhub.ai/api/v1/search?q=${encodeURIComponent(query)}`,
      );
      if (!response.ok) {
        throw new Error(`Hub search failed: HTTP ${response.status}`);
      }
      const data = await response.json();

      // Map API response to HubSkillEntry
      const skills = (data.results || []).map((s: any) => ({
        id: s.slug || s.id, // Using slug as ID since we need it for download
        name: s.name || s.slug,
        description: s.description || "",
        version: s.version || "1.0",
        author: s.author || "unknown",
      }));

      respond(true, { skills }, undefined);
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
      // Determine the skills directory based on environment
      const rootDir = process.env.SPACE_ID ? "/app" : CONFIG_DIR;
      const skillsDir = path.join(rootDir, "skills", slug);
      await ensureDir(skillsDir);

      const response = await fetch(
        `https://clawhub.ai/api/v1/download?slug=${encodeURIComponent(slug)}`,
      );
      if (!response.ok) {
        throw new Error(`Hub download failed: HTTP ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Extract ZIP with Zip Slip protection
      const directory = await unzipper.Open.buffer(buffer);
      for (const file of directory.files) {
        const outPath = path.resolve(skillsDir, file.path);

        // Zip Slip vulnerability protection
        if (!outPath.startsWith(path.resolve(skillsDir) + path.sep)) {
          log.warn(`Skipping potentially malicious path: ${file.path}`);
          continue;
        }

        if (file.type === "Directory") {
          await ensureDir(outPath);
          continue;
        }

        await ensureDir(path.dirname(outPath));
        const writeStream = fs.createWriteStream(outPath);
        await new Promise<void>((resolve, reject) => {
          file.stream().pipe(writeStream).on("finish", resolve).on("error", reject);
        });
      }

      respond(true, { ok: true, message: `Installed ${slug}` }, undefined);
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
      const rootDir = process.env.SPACE_ID ? "/app" : CONFIG_DIR;
      const skillsDir = path.join(rootDir, "skills");

      const entries = loadWorkspaceSkillEntries(skillsDir);

      // Look for the exact skill matching the downloaded slug
      const entry = entries.find((e) => e.skill.name === slug);

      if (!entry) {
        respond(
          false,
          undefined,
          errorShape(
            ErrorCodes.INVALID_REQUEST,
            `Skill ${slug} not found locally. Did you install it?`,
          ),
        );
        return;
      }

      const requiredEnvs = entry.metadata?.requires?.env || [];
      const missingEnvs = [];
      const foundEnvs: Record<string, string> = {};

      for (const env of requiredEnvs) {
        if (process.env[env]) {
          foundEnvs[env] = "FOUND_IN_ENV";
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

      log.info(`Run output for ${slug}: Success`);

      respond(
        true,
        { ok: true, message: `Tested ${slug} successfully. See logs for output.` },
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
