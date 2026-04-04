#!/bin/sh
set -e

# Replace build-time placeholders with runtime environment variables.

replace_env() {
  local placeholder="$1"
  local value="$2"
  if [ -n "$value" ]; then
    find /app/.next -name '*.js' -exec sed -i "s|${placeholder}|${value}|g" {} +
  fi
}

replace_env "__NEXT_PUBLIC_API_URL__" "$NEXT_PUBLIC_API_URL"
replace_env "__NEXT_PUBLIC_LIVEKIT_URL__" "$NEXT_PUBLIC_LIVEKIT_URL"

exec "$@"
