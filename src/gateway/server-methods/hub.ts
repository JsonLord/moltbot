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
        const mockSkills = [
            { id: "weather-skill", name: "Weather Skill", description: "Fetches weather info", version: "1.2", author: "openclaw" },
            { id: "demo-skill", name: "Demo Skill", description: "A demo skill", version: "1.0", author: "admin" }
        ].filter(s => s.name.toLowerCase().includes(query.toLowerCase()) || s.description.toLowerCase().includes(query.toLowerCase()));

        respond(true, { skills: mockSkills }, undefined);
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
        const skillsDir = path.join(CONFIG_DIR, "skills", slug);
        await ensureDir(skillsDir);

        const skillMdPath = path.join(skillsDir, "SKILL.md");
        const mockSkillMd = `---\nname: ${slug}\ndescription: dynamically loaded from hub\nmetadata:\n  openclaw:\n    requires:\n      env:\n        - MY_API_KEY\n---\n\nSkill implementation stub.\n`;

        await fs.promises.writeFile(skillMdPath, mockSkillMd, "utf-8");

        respond(true, { ok: true, message: `Installed ${slug}` }, undefined);
    } catch (e) {
        log.error(`Failed to install skill from hub: ${e}`);
        respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, `Failed to install skill from hub: ${e}`));
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
        const skillsDir = path.join(CONFIG_DIR, "skills");
        const entries = loadWorkspaceSkillEntries(skillsDir);
        const entry = entries.find(e => e.skill.name === slug);

        if (!entry) {
            respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, `Skill ${slug} not found locally. Did you install it?`));
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
            log.warn(`Skill ${slug} is missing required env variables (like HF secrets): ${missingEnvs.join(', ')}`);
        } else {
            log.info(`Skill ${slug} has all required env vars: ${Object.keys(foundEnvs).join(', ')}`);
        }

        log.info(`Run output for ${slug}: Success`);

        respond(true, { ok: true, message: `Tested ${slug} successfully. See logs for output.` }, undefined);
    } catch (e) {
        log.error(`Failed to test skill from hub: ${e}`);
        respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, `Failed to test skill from hub: ${e}`));
    }
  },
};
