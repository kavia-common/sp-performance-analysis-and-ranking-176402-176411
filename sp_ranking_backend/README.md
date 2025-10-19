# S&P Ranking Backend (FastAPI)

FastAPI backend for the S&P performance analysis and ranking application. Provides REST APIs for health check, symbol listing, running rankings, status tracking, retrieving latest results, and exporting results.

Implemented features:
- FastAPI app with CORS configured via ALLOWED_ORIGINS
- Environment configuration loader (no hardcoded secrets)
- SQLite database helper with initialization from db/schema.sql
- Database schema for symbols, runs, rankings, and cache tables
- Routes: /health, /symbols, /rankings/run, /rankings/status, /rankings/latest, /rankings/export
- Finnhub client (httpx) with basic rate limiting and caching to DB
- Batch/concurrent processing for ranking runs
- Excel export using openpyxl

## Quick Start

1) Create a virtualenv (recommended)
   python3 -m venv .venv
   source .venv/bin/activate  # Windows: .venv\Scripts\activate

2) Install dependencies
   pip install -r requirements.txt

3) Configure environment
   - Copy .env.example to .env
   - Set FINNHUB_API_KEY and adjust values as needed (DB_URL, BACKEND_PORT, ALLOWED_ORIGINS, etc.)

4) Initialize database
   - On first run, the backend will initialize the SQLite DB from db/schema.sql automatically.
   - IMPORTANT: Load the symbols table with S&P constituents (symbol, name, sector, market_cap). A seeding script is not included in this repo.

5) Run the server
   uvicorn src.main:app --host 0.0.0.0 --port ${BACKEND_PORT:-8000} --reload

6) Open API docs
   http://localhost:8000/docs
   http://localhost:8000/redoc

## Endpoints

- GET /health
- GET /symbols
- POST /rankings/run { "formula_mode": "buffett"|"cramer"|"both" }
- GET /rankings/status?run_id=...
- GET /rankings/latest?page=&pageSize=&sortBy=&sortDir=&formula_mode=&sectors=&marketCapMin=&marketCapMax=&completeness=
- GET /rankings/export?run_id=...&format=excel|csv

### /symbols
Returns:
{
  "symbols": [{ "symbol": "...", "name": "...", "sector": "...", "marketCap": 12345 }, ...],
  "sectors": ["Technology", "Healthcare", ...]
}

### /rankings/run
Body:
{ "formula_mode": "buffett" | "cramer" | "both", "options": { ... } }
Returns:
{ "run_id": 1, "status": "running" }

### /rankings/status
Query: run_id (optional, latest if omitted)
Returns:
{ "run_id": 1, "status": "running"|"completed"|"failed"|"queued", "progress": 0-100, "message": "...", "formula_mode": "both" }

### /rankings/latest
- Supports pagination (page/pageSize), sorting (sortBy/sortDir), and filters (sectors, market cap min/max, completeness).
Returns:
{ "items": [...], "total": 123, "run_id": 1 }

### /rankings/export
- Streams an Excel file by default (application/vnd.openxmlformats-officedocument.spreadsheetml.sheet).
- CSV available with format=csv.
Response header includes Content-Disposition with a filename.

## Environment Variables

See .env.example for full list:
- FINNHUB_API_KEY: API key for finnhub.com
- DB_URL: Database URL (e.g., sqlite:///./data/app.db)
- BACKEND_PORT: Port to run the backend (default 8000)
- BATCH_SIZE: Processing batch size for API calls
- MAX_CONCURRENCY: Concurrency limit for background tasks
- CACHE_TTL_MINUTES: Cache expiration in minutes
- EXPORT_TMP_DIR: Temp directory for export files
- ALLOWED_ORIGINS: Comma-separated list of CORS origins or * for all

## Project Structure

sp_ranking_backend/
├── requirements.txt
├── .env.example
├── README.md
├── db/
│   └── schema.sql
└── src/
    ├── __init__.py
    ├── config.py
    ├── db.py
    ├── main.py
    ├── services/
    │   ├── batching.py
    │   ├── finnhub_client.py
    │   └── ranking_service.py
    ├── utils/
    │   └── excel_export.py
    └── routes/
        ├── __init__.py
        ├── health.py
        ├── symbols.py
        └── rankings.py

## Notes

- Ensure the symbols table is populated with S&P constituents; the run will fail if no symbols exist.
- CORS origins are controlled via ALLOWED_ORIGINS; set to your frontend origin in production.
- FINNHUB_API_KEY must be provided for live metrics; limited offline runs are not supported.
