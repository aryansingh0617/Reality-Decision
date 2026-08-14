import sys
import os
from pathlib import Path
import uvicorn

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"Launching REALITY//DECISION API server on port {port}...")
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
