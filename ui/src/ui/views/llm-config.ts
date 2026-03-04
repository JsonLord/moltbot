import { html, nothing } from "lit";
import { renderIcon } from "./icons";

export type LlmConfigProps = {
  config: any;
  loading: boolean;
  saving: boolean;
  onSave: (payload: any) => void;
};

function getCustomOpenAiProvider(config: any) {
  const providers = config?.models?.providers || {};
  return providers["custom-openai"] || {};
}

export function renderLlmConfig(props: LlmConfigProps) {
  if (props.loading) {
    return html`
      <div class="p-6 text-[var(--color-text-dim)] flex items-center gap-2">
        ${renderIcon("loader", "animate-spin w-4 h-4")} Loading LLM configuration...
      </div>
    `;
  }

  const customOpenAi = getCustomOpenAiProvider(props.config);

  // Extract models
  const models = customOpenAi.models || [];
  let chatModel = "Qwen/Qwen2.5-Coder-3B-Instruct";
  if (models.length > 0) {
    chatModel = models[0].id;
  }

  const baseUrl = customOpenAi.baseUrl || "http://127.0.0.1:8000/v1";

  // The environment variable name
  const apiKeyVar = customOpenAi.apiKey || "dummy-key";

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const newChatModel = formData.get("chatModel") as string;
    const newBaseUrl = formData.get("baseUrl") as string;
    const newApiKeyVar = formData.get("apiKeyVar") as string;

    const payload = {
      models: {
        providers: {
          "custom-openai": {
            baseUrl: newBaseUrl,
            api: "openai-completions",
            apiKey: newApiKeyVar,
            models: [
              {
                id: newChatModel,
                name: newChatModel.split('/').pop() || newChatModel,
                reasoning: false,
                input: ["text"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 128000,
                maxTokens: 8192
              }
            ]
          }
        }
      },
      agents: {
        defaults: {
          model: {
            primary: `custom-openai/${newChatModel}`
          }
        }
      }
    };

    props.onSave(payload);
  };

  return html`
    <div class="p-6 max-w-3xl">
      <div class="mb-8">
        <h2 class="text-2xl font-semibold mb-2 flex items-center gap-2">
          ${renderIcon("cpu", "w-6 h-6")} LLM Setup
        </h2>
        <p class="text-[var(--color-text-dim)]">
          Configure the default chat model and inference endpoint. For Hugging Face Spaces,
          you can set the secret key name to map automatically.
        </p>
      </div>

      <form @submit=${handleSubmit} class="space-y-6 bg-[var(--color-bg-elevated)] p-6 rounded-lg border border-[var(--color-border)]">

        <div class="space-y-2">
          <label class="block font-medium">Chat Model ID</label>
          <input
            type="text"
            name="chatModel"
            .value=${chatModel}
            class="w-full p-2 rounded bg-[var(--color-bg-subtle)] border border-[var(--color-border)] focus:border-[var(--color-primary)] outline-none"
            placeholder="e.g. Qwen/Qwen2.5-Coder-3B-Instruct"
            required
          />
          <p class="text-sm text-[var(--color-text-dim)]">The model identifier to use for the main conversational agent.</p>
        </div>

        <div class="space-y-2">
          <label class="block font-medium">Provider Endpoint (Base URL)</label>
          <input
            type="url"
            name="baseUrl"
            .value=${baseUrl}
            class="w-full p-2 rounded bg-[var(--color-bg-subtle)] border border-[var(--color-border)] focus:border-[var(--color-primary)] outline-none"
            placeholder="https://harvesthealth-harvesthealth-gemma-inference.hf.space/v1"
            required
          />
          <p class="text-sm text-[var(--color-text-dim)]">
            The OpenAI-compatible endpoint. Note: <code>http://127.0.0.1:8000/v1</code> routes through the local sanitization proxy.
          </p>
        </div>

        <div class="space-y-2">
          <label class="block font-medium">API Key (or Secret Name)</label>
          <input
            type="text"
            name="apiKeyVar"
            .value=${apiKeyVar}
            class="w-full p-2 rounded bg-[var(--color-bg-subtle)] border border-[var(--color-border)] focus:border-[var(--color-primary)] outline-none"
            placeholder="BLABLADOR_API_KEY"
            required
          />
          <p class="text-sm text-[var(--color-text-dim)]">
            The environment variable name (e.g., from Hugging Face secrets) or the actual key. Use <code>dummy-key</code> if the endpoint doesn't require one.
          </p>
        </div>

        <div class="pt-4 flex justify-end">
          <button
            type="submit"
            ?disabled=${props.saving}
            class="px-4 py-2 bg-[var(--color-primary)] text-white rounded hover:opacity-90 disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            ${props.saving ? renderIcon("loader", "animate-spin w-4 h-4") : renderIcon("save", "w-4 h-4")}
            ${props.saving ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </form>
    </div>
  `;
}
