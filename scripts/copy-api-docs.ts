import { promises as fs } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function copyApiDocs() {
  const srcDir = path.join(__dirname, "../src/gateway/api-docs");
  const destDir = path.join(__dirname, "../dist/gateway/api-docs");

  try {
    await fs.mkdir(destDir, { recursive: true });

    const files = await fs.readdir(srcDir);
    for (const file of files) {
      const srcPath = path.join(srcDir, file);
      const destPath = path.join(destDir, file);
      const stats = await fs.stat(srcPath);

      if (stats.isFile()) {
        await fs.copyFile(srcPath, destPath);
      }
    }
    console.log("[copy-api-docs] Done");
  } catch (err) {
    console.error("[copy-api-docs] Failed to copy api-docs:", err);
    process.exit(1);
  }
}

void copyApiDocs();
