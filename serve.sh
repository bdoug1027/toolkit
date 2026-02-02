#!/bin/bash
# Serve the toolkit dashboard locally
cd "$(dirname "$0")"
echo "🚀 Starting Toolkit Dashboard at http://localhost:8080"
python3 -m http.server 8080
