# S&P Ranking Frontend (Ocean Professional)

A lightweight React dashboard to view and manage S&P rankings based on performance data and formulas inspired by Warren Buffett and Jim Cramer.

## Features

- Dashboard layout with:
  - Top bar: Title and Formula selector (Buffett, Cramer, Both)
  - Left panel: Actions toolbar (Run, Refresh, Export) and Filters (Sectors, Market Cap, Completeness)
  - Main area: Ranking table with client-side sorting, server-friendly pagination and parameters
- Ocean Professional theme (blue primary, amber accents, subtle shadows, gradients)
- API client reads base URL from `REACT_APP_BACKEND_BASE_URL`
- Graceful handling when backend is not available
- CSV export fallback when backend export endpoint is not available

## Quick Start

1) Install dependencies
   npm install

2) Configure environment
   - Copy `.env.example` to `.env`
   - Set the backend API base URL (no trailing slash). Example:
     REACT_APP_BACKEND_BASE_URL=http://localhost:8000

3) Start the app
   npm start
   Open http://localhost:3000

## Backend Integration

The frontend expects the following backend endpoints and parameters:

- GET /health
- GET /symbols
- POST /rankings/run
  - body: { "formula_mode": "buffett" | "cramer" | "both", "options": { ... } }
  - returns: { "run_id": number, "status": "running" }
- GET /rankings/status?run_id=<id>
  - returns: { "run_id": number, "status": "running"|"completed"|"failed"|"queued", "progress": number, "message": string, "formula_mode": string }
- GET /rankings/latest
  - query params: page, pageSize, sortBy, sortDir, formula_mode, sectors (repeatable), marketCapMin, marketCapMax, completeness
  - returns: { "items": [...], "total": number, "run_id": number }
- GET /rankings/export?run_id=<id>&format=excel|csv
  - triggers a file download

Set `REACT_APP_BACKEND_BASE_URL` in `.env` to point to your backend. The value is read at build/start time. Ensure the backend CORS variable `ALLOWED_ORIGINS` includes `http://localhost:3000` during local development.

## End-to-End Usage

1) Start backend (FastAPI):
   - See backend README; typical:
     uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload

2) Start frontend:
   - npm start
   - Visit http://localhost:3000

3) In the UI:
   - Select a formula (top-right)
   - Optionally select filters (left panel)
   - Click "Run" to trigger a new ranking run
   - Status will update while running; when completed, results load automatically
   - Use Export CSV/Excel to download result files (Excel requires backend export endpoint)

## Development Notes

- No heavy UI libraries; styles are in `src/App.css`
- Components:
  - `src/components/FormulaSelector.jsx`
  - `src/components/FiltersPanel.jsx`
  - `src/components/Toolbar.jsx`
  - `src/components/RankingTable.jsx`
- Hook:
  - `src/hooks/useRankingData.js`
- API:
  - `src/api/client.js`
- CSV utility:
  - `src/utils/csv.js`

If the backend is unavailable, the UI will indicate errors and disable export (or use CSV fallback when data exists).

## Scripts

- npm start
- npm test
- npm run build

## License

MIT
