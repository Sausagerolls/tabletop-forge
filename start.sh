#!/bin/bash
set -e
cd "$(dirname "$0")"

# Copy .env if it doesn't exist
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example — edit it to change passwords!"
fi

# Build and start
docker compose down
docker compose build --no-cache
docker compose up -d

echo ""
echo "✅ D&D VTT is running!"
echo "   Open: http://localhost"
echo ""
echo "   DM master password: $(grep DM_MASTER_PASSWORD .env | cut -d= -f2)"
echo ""
