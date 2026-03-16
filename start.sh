#!/bin/bash

# Configure Moltbot for Hugging Face Spaces (bypass local auth/pairing)
mkdir -p /home/node/.moltbot
cat << 'EOF' > /home/node/.moltbot/moltbot.json
{
  "gateway": {
    "trustedProxies": ["*"],
    "controlUi": {
      "dangerouslyDisableDeviceAuth": true
    }
  }
}
EOF

uvicorn clawhub_api:app --host 127.0.0.1 --port 8000 &
node dist/index.js gateway --bind lan --port 7860 --allow-unconfigured
