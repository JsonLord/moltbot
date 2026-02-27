#!/bin/bash
set -e

# Start the ClawHub FastAPI backend in the background
python3 clawhub_api.py &

# Start the main Node.js application
# Use the gateway port properly bound if available
exec node dist/index.js gateway --port ${PORT:-7860} --bind ${HOST:-0.0.0.0} --allow-unconfigured
