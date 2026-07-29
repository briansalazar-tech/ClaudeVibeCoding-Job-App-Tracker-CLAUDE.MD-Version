#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "Running database migration..."
npm run db:migrate

echo "Starting Job Application Tracker..."
echo "  API  -> http://localhost:3001"
echo "  App  -> http://localhost:5173"
npm run dev
