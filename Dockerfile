FROM node:22-bookworm

# Install Bun (required for build scripts)
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

RUN corepack enable

WORKDIR /app

ARG CLAWDBOT_DOCKER_APT_PACKAGES=""
RUN if [ -n "$CLAWDBOT_DOCKER_APT_PACKAGES" ]; then \
      apt-get update && \
      DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends $CLAWDBOT_DOCKER_APT_PACKAGES && \
      apt-get clean && \
      rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*; \
    fi

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml .npmrc* ./
COPY ui/package.json ./ui/package.json
COPY patches ./patches
COPY scripts ./scripts

RUN pnpm install --frozen-lockfile

COPY . .
RUN CLAWDBOT_A2UI_SKIP_MISSING=1 pnpm build
# Force pnpm for UI build (Bun may fail on ARM/Synology architectures)
ENV CLAWDBOT_PREFER_PNPM=1
RUN pnpm ui:install
RUN pnpm ui:build

ENV NODE_ENV=production

# Expose the port for Hugging Face Spaces
ENV PORT=7860
ENV CLAWDBOT_GATEWAY_PORT=7860
EXPOSE 7860

# Create default config to avoid "Missing config" error
RUN mkdir -p /home/node/.moltbot && \
    echo '{"gateway": {"mode": "local", "bind": "lan", "port": 7860, "trustedProxies": ["*"], "controlUi": {"dangerouslyDisableDeviceAuth": true}}}' > /home/node/.moltbot/moltbot.json && \
    chown -R node:node /home/node/.moltbot

ENV MOLTBOT_CONFIG_PATH=/home/node/.moltbot/moltbot.json
ENV CLAWDBOT_GATEWAY_TOKEN=moltbot
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Security hardening: Run as non-root user
# The node:22-bookworm image includes a 'node' user (uid 1000)
# This reduces the attack surface by preventing container escape via root privileges
USER node

# Start the gateway in the foreground.
CMD ["node", "moltbot.mjs", "gateway", "run", "--bind", "lan", "--port", "7860", "--allow-unconfigured"]
