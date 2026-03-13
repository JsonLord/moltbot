# Agent.md

## 1. Deployment Configuration

### Target Space
- **Profile:** \`harvesthealth\`
- **Space:** \`xxg\`
- **Full Identifier:** \`harvesthealth/xxg\`
- **Frontend Port:** \`7860\` (mandatory for all Hugging Face Spaces)

### Deployment Method
- **Docker SDK** — The application runs Node.js natively utilizing a bespoke Gateway and WebSocket UI.

### HF Token
- The environment variable **\`\$HF_TOKEN\` will always be provided at execution time**.
- Never hardcode the token. Always read it from the environment.
- All monitoring and log‑streaming commands rely on \`\$HF_TOKEN\`.

### Required Files
- \`Dockerfile\` (Specifies Node 22, installs Bun/pnpm, opens 7860, handles proxy bypass for HF Spaces).
- \`README.md\` with Hugging Face YAML frontmatter.
- \`.hfignore\` to exclude unnecessary files like node_modules.
- This \`Agent.md\` file (must be committed before deployment).

---

## 2. API Exposure and Documentation

### Mandatory Endpoints
Every deployment **must** expose:

- **\`/health\`**
  - Returns HTTP 200 when the app is ready.
  - Required for Hugging Face to transition the Space from *starting* → *running*.

- **\`/api-docs\`**
  - Documents **all** available API endpoints.
  - Reachable at: \`https://harvesthealth-xxg.hf.space/api-docs\`

### Functional Endpoints

### \`/v1/chat/completions\`
- **Method:** POST
- **Purpose:** Run model inference via OpenAI-compatible endpoints directly to the embedded agents.
- **Request Example:**
  \`\`\`json
  {
    "model": "alias-fast",
    "messages": [{"role": "user", "content": "hello world"}],
    "stream": true
  }
  \`\`\`
- **Response Example:**
  \`\`\`json
  {
    "id": "chatcmpl-123",
    "choices": [{
      "message": {"role": "assistant", "content": "hello"}
    }]
  }
  \`\`\`

### WebSocket Gateway
- **Method:** WS
- **Path:** \`/\`
- **Purpose:** Primary RPC for the dashboard, UI tab control, file management (CLI/Skills/Hub), and live agent streaming. Connects the frontend to the backend via a bespoke JSON RPC protocol over standard WebSockets.

---

## 3. Deployment Workflow

### Standard Deployment Command
After any code change, run:

\`\`\`bash
hf upload harvesthealth/xxg . --repo-type=space --token=\$HF_TOKEN
\`\`\`

This command must be executed **after updating and committing Agent.md**.

### Continuous Deployment Rule
After **every** relevant edit (logic, dependencies, API changes):

- Update \`Agent.md\`
- Redeploy using the upload command
- Re-run all test cases
- Confirm \`/health\` and \`/api-docs\` are functional

---

## 4. Monitoring and Logs

### Build Logs (SSE)
\`\`\`bash
curl -N \
  -H "Authorization: Bearer \$HF_TOKEN" \
  "https://huggingface.co/api/spaces/harvesthealth/xxg/logs/build"
\`\`\`

### Run Logs (SSE)
\`\`\`bash
curl -N \
  -H "Authorization: Bearer \$HF_TOKEN" \
  "https://huggingface.co/api/spaces/harvesthealth/xxg/logs/run"
\`\`\`

### Notes
- If the Space stays in *starting* for too long, \`/health\` is usually failing.
- If the Space times out after ~30 minutes, check logs immediately.
- Container OOM errors (Exit Code 137) can occur. We explicitly specify \`NODE_OPTIONS="--max-old-space-size=4096"\` in the Dockerfile to combat this.

---

## 5. Test Run Cases (Mandatory After Every Deployment)

These tests ensure the agentic system can verify the deployment automatically.

### 1. Health Check
\`\`\`
GET https://harvesthealth-xxg.hf.space/health
Expected: HTTP 200, body: {"status": "ok"}
\`\`\`

### 2. API Docs Check
\`\`\`
GET https://harvesthealth-xxg.hf.space/api-docs
Expected: HTTP 200, valid JSON spec detailing /health, /v1/chat/completions, and websocket endpoints.
\`\`\`

### 3. Functional Endpoint Tests
\`\`\`
POST https://harvesthealth-xxg.hf.space/v1/chat/completions
Payload:
{
  "model": "alias-fast",
  "messages": [{"role": "user", "content": "ping"}],
  "max_tokens": 10
}
Expected:
- HTTP 200
- JSON with key "choices"
- No error fields
\`\`\`

### 4. End-to-End Behaviour
- Confirm the UI loads successfully via browser control mapping or manual navigation.
- Confirm API endpoints respond within reasonable time.
- Confirm no errors appear in run logs.

---

## 6. Maintenance Rules

- \`Agent.md\` must always reflect the **current** deployment configuration, API surface, and test cases.
- Any change to:
  - API routes
  - Dockerfile
  - Dependencies
  - App logic
  - Deployment method
  requires updating this file.
- This file must be committed **before** every deployment.
- This file is the operational contract for autonomous agents interacting with the project.
