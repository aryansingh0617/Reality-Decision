"""
REALITY//DECISION — Agentic decision-support system.
Entry point: streamlit run app.py
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.ui.dashboard import run_dashboard

if __name__ == "__main__":
    run_dashboard()
