from fastapi import FastAPI
from typing import List, Dict, Any, Union
from pydantic import BaseModel

app = FastAPI()

class DummyModel(BaseModel):
    model_config = {"extra": "ignore"}
    content: Union[str, List[Dict[str, Any]]]

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/api-docs")
def get_api_docs():
    return {"docs": "Available at /docs"}
