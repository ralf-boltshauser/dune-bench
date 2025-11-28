#!/bin/bash
# Build the custom mcp-shell Docker image with Node.js and pnpm

WORKSPACE="$(cd "$(dirname "$0")/../.." && pwd)"

echo "Building mcp-shell-dev image..."
docker build -f "${WORKSPACE}/Dockerfile.mcp-shell" -t mcp-shell-dev:latest "${WORKSPACE}"

if [ $? -eq 0 ]; then
  echo "✓ Image built successfully!"
  echo "You can now use mcp-shell with pnpm and Node.js support."
else
  echo "✗ Build failed. Check the error messages above."
  exit 1
fi

