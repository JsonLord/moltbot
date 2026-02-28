#!/bin/bash
set -e

# Start the ClawHub FastAPI backend in the background
python3 clawhub_api.py &

# Start the main Node.js application
# We disable gateway auth entirely for Hugging Face Spaces using --allow-unconfigured
# And we write a small override config to ensure the proxy is trusted
# Default to hf_space_token if CLAWDBOT_GATEWAY_TOKEN is not provided in HF Secrets
GATEWAY_TOKEN="${CLAWDBOT_GATEWAY_TOKEN:-hf_space_token}"

cat << EOF > /tmp/override.json
{
  "gateway": {
    "auth": {
      "mode": "token",
      "token": "${GATEWAY_TOKEN}"
    },
    "trustedProxies": ["*"],
    "controlUi": {
      "dangerouslyDisableDeviceAuth": true
    }
  }
}
EOF

export CLAWDBOT_CONFIG_PATH=/tmp/override.json

# Use the gateway port properly bound if available
exec node dist/index.js gateway --port ${PORT:-7860} --bind lan --allow-unconfigured --token "${GATEWAY_TOKEN}"
