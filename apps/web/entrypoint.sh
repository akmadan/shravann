#!/bin/sh
set -e

# Replace build-time placeholders with runtime environment variables.
# Next.js inlines NEXT_PUBLIC_* at build time, so we bake in placeholder
# strings and swap them here at container start.

replace_env() {
  local placeholder="$1"
  local value="$2"
  if [ -n "$value" ]; then
    find /app/.next -name '*.js' -exec sed -i "s|${placeholder}|${value}|g" {} +
  fi
}

replace_env "__NEXT_PUBLIC_API_URL__" "$NEXT_PUBLIC_API_URL"
replace_env "__NEXT_PUBLIC_SESSION_APP_URL__" "$NEXT_PUBLIC_SESSION_APP_URL"

exec "$@"
