#!/usr/bin/env bash
# MCP Shell wrapper script for Docker container
# This script connects to the running mcp-shell-dev container

exec docker exec -i mcp-shell-dev mcp-shell

