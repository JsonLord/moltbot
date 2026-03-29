import fs from "fs/promises";
import path from "path";
import { MoltbotConfig, loadConfig, writeConfigFile } from "../../config/config.js";
import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from "../../agents/agent-scope.js";
import type { GatewayRequestHandlers } from "./types.js";

const PMSKILLS_DIR = path.resolve(process.cwd(), "pm-skills");
const OPENCLAW_DIR = path.resolve(process.cwd(), "openclaw-master-skills");

async function parsePmSkillsRepo() {
  const skills = [];
  try {
    const entries = await fs.readdir(PMSKILLS_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith("pm-")) {
        const catDir = path.join(PMSKILLS_DIR, entry.name);
        const subDirs = await fs.readdir(catDir, { withFileTypes: true });

        for (const subDir of subDirs) {
          if (subDir.isDirectory() && subDir.name === "skills") {
            const skillsDir = path.join(catDir, subDir.name);
            const skillFolders = await fs.readdir(skillsDir, { withFileTypes: true });

            for (const sf of skillFolders) {
              if (sf.isDirectory()) {
                const skillPath = path.join(skillsDir, sf.name, "SKILL.md");
                try {
                  const content = await fs.readFile(skillPath, "utf-8");
                  const descMatch = content.match(/^(?:#.*?\n+)?([^\n]+)/m);
                  const description = descMatch ? descMatch[1].trim() : "A PM skill";

                  skills.push({
                    id: `pm-skills/${entry.name}/${sf.name}`,
                    name: sf.name.replace(/-/g, " "),
                    category: entry.name.replace("pm-", "").replace(/-/g, " "),
                    description: description,
                    installed: false,
                    contentPath: skillPath,
                  });
                } catch {
                  // ignore missing SKILL.md
                }
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("Failed to parse pm-skills repo", err);
  }
  return skills;
}

async function parseOpenClawRepo() {
  const skills = [];
  try {
    const entries = await fs.readdir(OPENCLAW_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name !== ".git") {
        const skillPath = path.join(OPENCLAW_DIR, entry.name, "SKILL.md");
        try {
          const content = await fs.readFile(skillPath, "utf-8");
          const descMatch = content.match(/^(?:#.*?\n+)?([^\n]+)/m);
          const description = descMatch ? descMatch[1].trim() : "OpenClaw skill";

          skills.push({
            id: `openclaw/${entry.name}`,
            name: entry.name.replace(/-/g, " "),
            category: "openclaw",
            description: description,
            installed: false,
            contentPath: skillPath,
          });
        } catch {
          // ignore missing SKILL.md
        }
      }
    }
  } catch (err) {
    console.error("Failed to parse openclaw-master-skills repo", err);
  }
  return skills;
}

export const skillhubHandlers: GatewayRequestHandlers = {
  "skillhub.list": async ({ respond }) => {
    const pmSkills = await parsePmSkillsRepo();
    const openclawSkills = await parseOpenClawRepo();

    const skills = [...pmSkills, ...openclawSkills];
    const cfg = loadConfig();
    const installedList = cfg.skills?.entries ? Object.keys(cfg.skills.entries) : [];

    for (const skill of skills) {
      const shortName = skill.name.toLowerCase().replace(/\s+/g, "-");
      if (installedList.includes(shortName)) {
        skill.installed = true;
      }
    }

    respond(true, { skills }, undefined);
  },

  "skillhub.install": async ({ params, respond }) => {
    const p = params as { id: string };
    if (!p.id) {
      respond(false, undefined, { code: "invalid_request", message: "Missing skill id" });
      return;
    }

    const pmSkills = await parsePmSkillsRepo();
    const openclawSkills = await parseOpenClawRepo();
    const skills = [...pmSkills, ...openclawSkills];

    const skill = skills.find((s) => s.id === p.id);
    if (!skill) {
      respond(false, undefined, { code: "not_found", message: "Skill not found in marketplace" });
      return;
    }

    try {
      const cfg = loadConfig();
      const workspaceDir = resolveAgentWorkspaceDir(cfg, resolveDefaultAgentId(cfg));
      const targetDir = path.join(
        workspaceDir,
        "skills",
        skill.name.toLowerCase().replace(/\s+/g, "-"),
      );
      await fs.mkdir(targetDir, { recursive: true });

      const targetPath = path.join(targetDir, "SKILL.md");
      const content = await fs.readFile(skill.contentPath, "utf-8");
      await fs.writeFile(targetPath, content, "utf-8");

      const shortName = skill.name.toLowerCase().replace(/\s+/g, "-");
      const skillsConfig = cfg.skills ? { ...cfg.skills } : {};
      const entries = skillsConfig.entries ? { ...skillsConfig.entries } : {};
      entries[shortName] = { enabled: true };
      skillsConfig.entries = entries;
      const nextConfig: MoltbotConfig = { ...cfg, skills: skillsConfig };
      await writeConfigFile(nextConfig);

      respond(true, { ok: true, path: targetPath }, undefined);
    } catch (err) {
      respond(false, undefined, {
        code: "server_error",
        message: `Failed to install: ${String(err)}`,
      });
    }
  },
};
