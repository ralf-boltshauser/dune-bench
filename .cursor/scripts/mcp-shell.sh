#!/bin/sh
# Wrapper for mcp-shell with Node.js and pnpm support
# Uses custom Docker image that includes development tools

WORKSPACE="$(cd "$(dirname "$0")/../.." && pwd)"
USER_ID=$(id -u)
GROUP_ID=$(id -g)

# Use custom image with Node.js and pnpm
IMAGE_NAME="mcp-shell-dev:latest"

# Check if image exists, if not, build it
if ! docker image inspect "$IMAGE_NAME" >/dev/null 2>&1; then
  echo "Building mcp-shell-dev image (this may take a minute)..." >&2
  docker build -f "${WORKSPACE}/Dockerfile.mcp-shell" -t "$IMAGE_NAME" "${WORKSPACE}" >&2 || {
    echo "Failed to build Docker image. Make sure Docker is running." >&2
    exit 1
  }
fi

exec docker run --rm -i \
  -v "${WORKSPACE}:/workspace:rw" \
  -v "${WORKSPACE}/mcp-shell-security.yaml:/etc/mcp-shell/security.yaml:ro" \
  -w /workspace \
  -u "${USER_ID}:${GROUP_ID}" \
  -e MCP_SHELL_SEC_CONFIG_FILE=/etc/mcp-shell/security.yaml \
  -e MCP_SHELL_LOG_LEVEL=info \
  -e MCP_SHELL_LOG_FORMAT=json \
  -e HOME=/workspace \
  -e XDG_CACHE_HOME=/workspace/.cache \
  -e XDG_CONFIG_HOME=/workspace/.config \
  -e XDG_DATA_HOME=/workspace/.local/share \
  -e NEXT_TELEMETRY_DISABLED=1 \
  -e PLATFORM=linux \
  -e ARCH=arm64 \
  "$IMAGE_NAME"

