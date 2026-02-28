# Agent.md

## 1. Deployment Configuration

### Target Space
- **Profile:** `harvesthealth`
- **Space:** `xxg`
- **Full Identifier:** `harvesthealth/xxg`
- **Frontend Port:** `7860` (mandatory for all Hugging Face Spaces)

### Deployment Method
- **Docker SDK** — The application is built using a combination of Node.js (Moltbot Gateway) and a Python FastAPI backend for specific ClawHub extensions.

### HF Token
- The environment variable **`HF_TOKEN` will always be provided at execution time**.
- Never hardcode the token. Always read it from the environment.
- All monitoring and log-streaming commands rely on `HF_TOKEN`.

### Required Files
- `Dockerfile`
- `README.md` with Hugging Face YAML frontmatter:
  ```yaml
  ---
  title: Moltbot
  emoji: 🦞
  colorFrom: blue
  colorTo: green
  sdk: docker
  app_port: 7860
  pinned: false
  ---
  ```
- `.hfignore` to exclude unnecessary files (e.g. `node_modules`, `dist`, `.git`, `pnpm-lock.yaml`)
- This `Agent.md` file (must be committed before deployment)

---

## 2. API Exposure and Documentation

### Mandatory Endpoints
Every deployment **must** expose:

- **`/health`**
  - Returns HTTP 200 when the app is ready.
  - Required for Hugging Face to transition the Space from *starting* → *running*.

- **`/api-docs`**
  - Documents **all** available API endpoints.
  - Reachable at: `https://harvesthealth-xxg.hf.space/api-docs`

### Functional Endpoints

#### /api/clawhub/search
- **Method:** GET
- **Purpose:** Searches the ClawHub marketplace for available skills.
- **Request Example:** `?q=test`
- **Response Example:**
  ```json
  {
    "ok": true,
    "output": "Search results for test:\n- mock-skill-1: A mock skill for testing\n- mock-skill-2: Another mock skill",
    "skills": [
      {
        "name": "mock-skill-1",
        "description": "A mock skill matching test"
      },
      {
        "name": "mock-skill-2",
        "description": "Another mock skill matching test"
      }
    ]
  }
  ```

#### /api/clawhub/install
- **Method:** POST
- **Purpose:** Installs a specific skill from the ClawHub marketplace into the local agent instance.
- **Request Example:**
  ```json
  {
    "name": "my-mock-skill-with-warning"
  }
  ```
- **Response Example:**
  ```json
  {
    "ok": true,
    "output": "Successfully installed my-mock-skill-with-warning",
    "errorOutput": "Warning: my-mock-skill-with-warning needs to be configured via further credentials in the settings."
  }
  ```

---

## 3. Deployment Workflow

### Standard Deployment Command
After any code change, run:

```bash
hf upload harvesthealth/xxg --repo-type=space
```

This command must be executed **after updating and committing Agent.md**.

### Deployment Steps
1. Ensure all code changes are committed.
2. Ensure `Agent.md` is updated and committed.
3. Run the upload command.
4. Wait for the Space to build.
5. Monitor logs (see next section).
6. When the Space is running, execute all test cases.

### Continuous Deployment Rule
After **every** relevant edit (logic, dependencies, API changes):

- Update `Agent.md`
- Redeploy using the upload command
- Re-run all test cases
- Confirm `/health` and `/api-docs` are functional

This applies even for long-running projects.

---

## 4. Monitoring and Logs

### Build Logs (SSE)
```bash
curl -N \
  -H "Authorization: Bearer $HF_TOKEN" \
  "https://huggingface.co/api/spaces/harvesthealth/xxg/logs/build"
```

### Run Logs (SSE)
```bash
curl -N \
  -H "Authorization: Bearer $HF_TOKEN" \
  "https://huggingface.co/api/spaces/harvesthealth/xxg/logs/run"
```

### Notes
- If the Space stays in *starting* for too long, `/health` is usually failing.
- If the Space times out after ~30 minutes, check logs immediately.
- Fix issues, commit changes, redeploy.

---

## 5. Test Run Cases (Mandatory After Every Deployment)

These tests ensure the agentic system can verify the deployment automatically.

### 1. Health Check
```
GET https://harvesthealth-xxg.hf.space/health
Expected: HTTP 200, body: {"status": "ok"}
```

### 2. API Docs Check
```
GET https://harvesthealth-xxg.hf.space/api-docs
Expected: HTTP 200, valid documentation UI or HTML structure.
```

### 3. Functional Endpoint Tests

**Search API Check**
```
GET https://harvesthealth-xxg.hf.space/api/clawhub/search?q=test
Expected:
- HTTP 200
- JSON with key "ok": true
- "skills" array containing items with "name" and "description"
```

**Install API Check**
```
POST https://harvesthealth-xxg.hf.space/api/clawhub/install
Payload:
{
  "name": "my-mock-skill-with-warning"
}
Expected:
- HTTP 200
- JSON with key "ok": true
- "output" field indicating successful installation
- "errorOutput" field indicating potential warning regarding credentials
```

### 4. End-to-End Behaviour
- Confirm the UI loads at the base URL
- Confirm API endpoints respond within reasonable time
- Confirm no errors appear in run logs

---

## 6. Maintenance Rules

- `Agent.md` must always reflect the **current** deployment configuration, API surface, and test cases.
- Any change to:
  - API routes
  - Dockerfile
  - Dependencies
  - App logic
  - Deployment method
  requires updating this file.
- This file must be committed **before** every deployment.
- This file is the operational contract for autonomous agents interacting with the project.
