# S&P Ranking Backend (FastAPI)

FastAPI backend for the S&P performance analysis and ranking application. Provides REST APIs for health check, symbol listing, running rankings, status tracking, retrieving latest results, and exporting results.

This repository currently includes core scaffolding:
- FastAPI app with CORS configured
- Environment configuration loader
- SQLite database helper with initialization from schema.sql
- Database schema for symbols, runs, rankings, and cache tables
- Minimal /health route

More routes/services will be added subsequently.

## Quick Start

1) Create a virtualenv (recommended)
   python3 -m venv .venv
   source .venv/bin/activate  # Windows: .venv\Scripts\activate

2) Install dependencies
   pip install -r requirements.txt

3) Configure environment
   - Copy .env.example to .env
   - Update values as needed (DB_URL, BACKEND_PORT, ALLOWED_ORIGINS, etc.)

4) Initialize database
   - On first run, the backend will initialize the SQLite DB from db/schema.sql automatically.

5) Run the server
   uvicorn src.main:app --host 0.0.0.0 --port ${BACKEND_PORT:-8000} --reload

6) Open API docs
   http://localhost:8000/docs
   http://localhost:8000/redoc

## Environment Variables

See .env.example for full list:
- FINNHUB_API_KEY: API key for finnhub.com
- DB_URL: Database URL (e.g., sqlite:///./data/app.db)
- BACKEND_PORT: Port to run the backend (default 8000)
- BATCH_SIZE: Processing batch size for API calls
- MAX_CONCURRENCY: Concurrency limit for background tasks
- CACHE_TTL_MINUTES: Cache expiration in minutes
- EXPORT_TMP_DIR: Temp directory for export files
- ALLOWED_ORIGINS: Comma-separated list of CORS origins

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
    └── routes/
        ├── __init__.py
        └── health.py

## Notes

- The DB helper uses SQLite by default and will ensure tables are present using schema.sql.
- The app is configured with permissive CORS by default but can be narrowed using ALLOWED_ORIGINS.
- Subsequent tasks will implement the /symbols, /rankings/run, /rankings/status, /rankings/latest, and /rankings/export endpoints.
