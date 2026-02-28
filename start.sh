#!/bin/bash
set -e

# Start the ClawHub FastAPI backend in the background
python3 clawhub_api.py &

# Start the main Node.js application
# We disable gateway auth entirely for Hugging Face Spaces using --allow-unconfigured
# And we write a small override config to ensure the proxy is trusted
cat << 'EOF' > /tmp/override.json
{
  "gateway": {
    "auth": {
      "mode": "token",
      "token": "hf_space_token"
    },
    "trustedProxies": ["0.0.0.0", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "127.0.0.1", "::ffff:127.0.0.1", "::1"]
  }
}
EOF

export CLAWDBOT_CONFIG_PATH=/tmp/override.json

# Use the gateway port properly bound if available
exec node dist/index.js gateway --port ${PORT:-7860} --bind lan --allow-unconfigured --token hf_space_token
