#!/bin/sh
set -e

# Runtime environment variable injection for SPA
# This replaces placeholder values in the built JS with actual runtime values

# Define the placeholder and replacement for API URL
if [ -n "$VITE_API_URL" ]; then
  echo "Injecting VITE_API_URL: $VITE_API_URL"

  # Find and replace in all JS files
  find /usr/share/nginx/html -type f -name '*.js' -exec sed -i "s|__VITE_API_URL__|$VITE_API_URL|g" {} \;
fi

# Execute the main command
exec "$@"
