from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import uvicorn
import logging

app = FastAPI(title="ClawHub Internal API")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.get("/api/clawhub/search")
async def search_skills(q: str = ""):
    logger.info(f"Received search request with query: {q}")

    mock_stdout = f"Search results for {q}:\n- mock-skill-1: A mock skill for testing\n- mock-skill-2: Another mock skill" if q else "Available skills:\n- mock-skill-1: A mock skill for testing\n- mock-skill-2: Another mock skill\n- mock-skill-3: Yet another mock skill"

    mock_skills = [
        { "name": "mock-skill-1", "description": f"A mock skill matching {q}" if q else "A mock skill for testing" },
        { "name": "mock-skill-2", "description": f"Another mock skill matching {q}" if q else "Another mock skill" }
    ]
    if not q:
        mock_skills.append({ "name": "mock-skill-3", "description": "Yet another mock skill" })

    return { "ok": True, "output": mock_stdout, "skills": mock_skills }

@app.post("/api/clawhub/install")
async def install_skill(request: Request):
    data = await request.json()
    skill_name = data.get("name")

    if not skill_name:
        return JSONResponse(status_code=400, content={"ok": False, "error": "Missing skill name"})

    logger.info(f"Received install request for skill: {skill_name}")

    mock_stdout = f"Successfully installed {skill_name}"
    mock_stderr = f"Warning: {skill_name} needs to be configured via further credentials in the settings." if "warn" in skill_name.lower() else ""

    logger.warning(f"[ClawHub] Installation of {skill_name} completed." + (f" {mock_stderr}" if mock_stderr else ""))

    return { "ok": True, "output": mock_stdout, "errorOutput": mock_stderr }

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
