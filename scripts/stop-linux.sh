#!/bin/bash

echo "Stopping Job Application Tracker..."

for port in 5173 3001; do
  pid=$(lsof -ti:"$port" 2>/dev/null)
  if [ -n "$pid" ]; then
    echo "  Killing process on port $port (PID: $pid)"
    kill -9 "$pid"
  else
    echo "  No process found on port $port"
  fi
done

echo "Done."
