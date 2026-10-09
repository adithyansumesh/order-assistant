"""Vercel Serverless Function entry point for Order Assistant FastAPI backend."""

import os
import sys
from pathlib import Path

# Add project root directory to Python path
CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Ensure dataset path is resolved properly in serverless environment
os.environ.setdefault("ORDERS_CSV_PATH", str(PROJECT_ROOT / "orders.csv"))

from backend.main import app  # ASGI app for Vercel Python runtime
