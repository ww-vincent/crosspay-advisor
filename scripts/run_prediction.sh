#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."

# Setup Python venv if not present
if [ ! -d "venv" ]; then
  echo "Creating Python venv..."
  python3 -m venv venv
  ./venv/bin/pip install --quiet yfinance statsmodels arch pandas numpy
fi

# Ensure deps are installed
./venv/bin/pip install --quiet yfinance statsmodels arch pandas numpy 2>/dev/null || true

# Run prediction for all pairs
echo "Running prediction pipeline..."
./venv/bin/python3 output/generate_report.py "$@"
echo "Done."
