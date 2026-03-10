import { Type } from "@sinclair/typebox";
import type { MoltbotConfig } from "../../config/config.js";
import type { AnyAgentTool } from "./common.js";
import { jsonResult, readNumberParam, readStringParam } from "./common.js";

const SEARXNG_BASE_URL = "https://CJJ-on-HF-SearXNG.hf.space";

const WebSearchSchema = Type.Object({
  query: Type.String({ description: "The search query string." }),
  category: Type.Optional(
    Type.String({
      description:
        "The SearXNG category to search in (e.g., 'science', 'it', 'news'). Defaults to 'general' for a broad search.",
    }),
  ),
  num_results: Type.Optional(
    Type.Number({
      description: "The maximum number of search results to return. Defaults to 5.",
      minimum: 1,
    }),
  ),
});

export function createWebSearchTool(options?: { config?: MoltbotConfig }): AnyAgentTool {
  return {
    label: "Web Search",
    name: "web_search",
    description:
      "A tool to perform web searches using a public SearXNG instance. Allows for targeted searches using categories.",
    parameters: WebSearchSchema,
    execute: async (_toolCallId, args) => {
      const params = args as Record<string, unknown>;
      const query = readStringParam(params, "query", { required: true });
      const category = readStringParam(params, "category") || "general";
      const num_results = readNumberParam(params, "num_results", { integer: true }) || 5;

      if (!query) {
        return jsonResult({ error: "The search query cannot be empty." });
      }

      const searchQuery = category && category !== "general" ? `!${category} ${query}` : query;

      try {
        const url = new URL(`${SEARXNG_BASE_URL}/search`);
        url.searchParams.set("q", searchQuery);
        url.searchParams.set("format", "json");
        url.searchParams.set("pageno", "1");

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(url.toString(), {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          return jsonResult({
            error: `A network error occurred while contacting the search service: HTTP ${response.status}`,
          });
        }

        const data = await response.json();
        const results = data.results || [];

        if (results.length === 0) {
          return {
            content: [`No search results found for the query: '${query}'`],
            metadata: {},
          };
        }

        const formattedOutput = results.slice(0, num_results).map((res: any, i: number) => {
          const title = res.title || "No Title Provided";
          const url = res.url || "No URL Provided";
          const snippet = res.content || res.description || "No Snippet Provided";

          const cleanSnippet = snippet
            ? snippet.replace(/\s+/g, " ").trim()
            : "No Snippet Provided";

          return `Result ${i + 1}:\n  Title: ${title}\n  URL: ${url}\n  Snippet: ${cleanSnippet}`;
        });

        return {
          content: [formattedOutput.join("\n---\n")],
          metadata: {},
        };
      } catch (err: any) {
        if (err.name === "AbortError") {
          return jsonResult({
            error:
              "The search request timed out. The SearXNG instance may be offline or overloaded.",
          });
        }
        return jsonResult({
          error: `A network error occurred while contacting the search service: ${err.message}`,
        });
      }
    },
  };
}

export const __testing = {
  // Stub tests export
};
