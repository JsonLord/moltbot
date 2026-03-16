#!/bin/bash
uvicorn clawhub_api:app --host 127.0.0.1 --port 8000 &
node dist/index.js gateway --bind lan --port 7860 --allow-unconfigured
