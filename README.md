# sp-performance-analysis-and-ranking-176402-176411

This workspace contains:
- sp_ranking_backend: FastAPI backend providing ranking APIs and Excel/CSV export
- sp_ranking_frontend: React dashboard for running and viewing rankings

Quick Start (dev):
1) Backend
   - cd sp_ranking_backend
   - cp .env.example .env
   - Set FINNHUB_API_KEY and ensure ALLOWED_ORIGINS includes http://localhost:3000
   - pip install -r requirements.txt
   - uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload

2) Frontend
   - cd sp_ranking_frontend
   - cp .env.example .env
   - Set REACT_APP_BACKEND_BASE_URL=http://localhost:8000
   - npm install
   - npm start

3) Visit http://localhost:3000 and use the dashboard to run rankings and export Excel/CSV.