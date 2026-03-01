from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
import uvicorn
import logging
import httpx
import json

app = FastAPI(title="ClawHub Internal API")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

HF_INFERENCE_URL = "https://harvesthealth-harvesthealth-gemma-inference.hf.space/v1/chat/completions"

@app.post("/v1/chat/completions")
async def proxy_chat(request: Request):
    data = await request.json()

    # We should forward the Authorization header if provided
    auth_header = request.headers.get("Authorization")

    headers = {
        "Content-Type": "application/json"
    }
    if auth_header:
        headers["Authorization"] = auth_header

    # Let's map this payload EXACTLY to what the inference space expects:
    # class ChatMessage(BaseModel): role: str, content: str
    # class ChatCompletionRequest(BaseModel): model: str, messages: List[ChatMessage], max_tokens, temperature, top_p, repetition_penalty

    mapped_messages = []
    for msg in data.get("messages", []):
        content = msg.get("content", "")
        if isinstance(content, list):
            text_content = ""
            for part in content:
                if part.get("type") == "text":
                    text_content += part.get("text", "")
            content = text_content

        # the simple inference server might timeout on the massive system prompt, let's truncate it or just pass it
        if msg.get("role") == "system":
            # For this simple inference endpoint, the huge system prompt causes it to time out.
            content = "You are a helpful coding assistant."

        mapped_messages.append({"role": msg.get("role", "user"), "content": content})

    clean_data = {
        "model": data.get("model", "Qwen/Qwen2.5-Coder-3B-Instruct"),
        "messages": mapped_messages
    }

    if "max_tokens" in data:
        clean_data["max_tokens"] = data["max_tokens"]
    elif "max_completion_tokens" in data:
        clean_data["max_tokens"] = data["max_completion_tokens"]
    else:
        clean_data["max_tokens"] = 1000

    if "temperature" in data:
        clean_data["temperature"] = data["temperature"]

    # Simple space does not support stream! So we ALWAYS call non-stream and then fake the stream if requested.
    is_stream = data.get("stream", False)

    # We must increase timeout for LLM inference APIs
    timeout = httpx.Timeout(180.0, read=180.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            resp = await client.post(HF_INFERENCE_URL, json=clean_data, headers=headers)
            if resp.status_code != 200:
                logger.error(f"Inference error: {resp.status_code} {resp.text}")
                return JSONResponse(status_code=resp.status_code, content=resp.json() if resp.text else {})

            response_json = resp.json()

            if is_stream:
                # FAKE STREAMING
                async def stream_generator():
                    # We send one big chunk simulating the first delta
                    message_content = response_json["choices"][0]["message"]["content"]

                    chunk = {
                        "id": response_json.get("id", "chatcmpl-mock"),
                        "object": "chat.completion.chunk",
                        "created": response_json.get("created", 0),
                        "model": response_json.get("model", "Qwen/Qwen2.5-Coder-3B-Instruct"),
                        "choices": [
                            {
                                "index": 0,
                                "delta": {"role": "assistant", "content": message_content},
                                "finish_reason": None
                            }
                        ]
                    }
                    yield f"data: {json.dumps(chunk)}\n\n".encode("utf-8")

                    finish_chunk = {
                        "id": response_json.get("id", "chatcmpl-mock"),
                        "object": "chat.completion.chunk",
                        "created": response_json.get("created", 0),
                        "model": response_json.get("model", "Qwen/Qwen2.5-Coder-3B-Instruct"),
                        "choices": [
                            {
                                "index": 0,
                                "delta": {},
                                "finish_reason": "stop"
                            }
                        ]
                    }
                    yield f"data: {json.dumps(finish_chunk)}\n\n".encode("utf-8")
                    yield b"data: [DONE]\n\n"

                return StreamingResponse(stream_generator(), media_type="text/event-stream")
            else:
                return JSONResponse(content=response_json)

        except Exception as e:
            logger.error(f"Proxy error: {repr(e)}")
            raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/clawhub/search")
async def search_skills(q: str = ""):
    mock_stdout = f"Search results for {q}:\n- mock-skill-1"
    mock_skills = [{ "name": "mock-skill-1", "description": "Mock" }]
    return { "ok": True, "output": mock_stdout, "skills": mock_skills }

@app.post("/api/clawhub/install")
async def install_skill(request: Request):
    data = await request.json()
    skill_name = data.get("name")
    return { "ok": True, "output": f"Installed {skill_name}", "errorOutput": "" }

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
