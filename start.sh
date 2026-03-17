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
  },
  "models": {
    "providers": {
      "blablador": {
        "baseUrl": "https://api.helmholtz-blablador.fz-juelich.de/v1",
        "api": "openai-completions",
        "models": [
          {
            "id": "alias-large",
            "name": "Blablador Large",
            "reasoning": false,
            "input": ["text"],
            "cost": {
              "input": 0,
              "output": 0,
              "cacheRead": 0,
              "cacheWrite": 0
            },
            "contextWindow": 128000,
            "maxTokens": 4096
          }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "models": {
        "alias-large": {
          "alias": "chat"
        }
      }
    }
  }
}
EOF

uvicorn clawhub_api:app --host 127.0.0.1 --port 8000 &
node dist/index.js gateway --bind lan --port 7860 --allow-unconfigured
