import chalk from "chalk";
import { resolveConfiguredModelRef } from "../agents/model-selection.js";
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from "../agents/defaults.js";
import type { loadConfig } from "../config/config.js";

export async function runLlmConnectionTest(params: {
  cfg: ReturnType<typeof loadConfig>;
  log: {
    info: (msg: string, meta?: Record<string, unknown>) => void;
    warn: (msg: string) => void;
    error: (msg: string) => void;
  };
}) {
  const { provider, model } = resolveConfiguredModelRef({
    cfg: params.cfg,
    defaultProvider: DEFAULT_PROVIDER,
    defaultModel: DEFAULT_MODEL,
  });

  if (provider !== "blablador") {
    return;
  }

  const apiKey = process.env.BLABLADOR_API_KEY;
  if (!apiKey) {
    params.log.warn("[test] skipping LLM connection test: BLABLADOR_API_KEY missing");
    return;
  }

  const endpoint = "https://api.helmholtz-blablador.fz-juelich.de/v1/chat/completions";
  params.log.info(`[test] testing connection to ${endpoint}...`);

  try {
    const start = Date.now();
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 5,
      }),
    });

    const duration = Date.now() - start;
    if (response.ok) {
      const data = (await response.json()) as any;
      const text = data.choices?.[0]?.message?.content || JSON.stringify(data);
      params.log.info(`[test] connection successful (${duration}ms): ${text.replace(/\n/g, " ")}`, {
        consoleMessage: chalk.green(
          `[test] connection successful (${duration}ms): ${chalk.white(text.replace(/\n/g, " "))}`,
        ),
      });
    } else {
      const errorText = await response.text();
      params.log.error(
        `[test] connection failed (${duration}ms): ${response.status} ${response.statusText} - ${errorText}`,
      );
    }
  } catch (err) {
    params.log.error(`[test] connection error: ${String(err)}`);
  }
}
