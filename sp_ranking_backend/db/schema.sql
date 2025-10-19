-- Core tables

CREATE TABLE IF NOT EXISTS symbols (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL UNIQUE,
    name TEXT,
    sector TEXT,
    market_cap REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_symbols_sector ON symbols(sector);
CREATE INDEX IF NOT EXISTS idx_symbols_market_cap ON symbols(market_cap);

CREATE TABLE IF NOT EXISTS runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    formula_mode TEXT NOT NULL, -- 'buffett' | 'cramer' | 'both'
    status TEXT NOT NULL DEFAULT 'queued', -- queued | running | completed | failed
    progress INTEGER DEFAULT 0,
    message TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);
CREATE INDEX IF NOT EXISTS idx_runs_started_at ON runs(started_at);

CREATE TABLE IF NOT EXISTS rankings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL,
    symbol TEXT NOT NULL,
    name TEXT,
    sector TEXT,
    market_cap REAL,
    score_buffett REAL,
    score_cramer REAL,
    combined_rank INTEGER,
    completeness REAL, -- percent of data completeness [0..100]
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(run_id) REFERENCES runs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rankings_run ON rankings(run_id);
CREATE INDEX IF NOT EXISTS idx_rankings_symbol ON rankings(symbol);
CREATE INDEX IF NOT EXISTS idx_rankings_combined_rank ON rankings(combined_rank);
CREATE INDEX IF NOT EXISTS idx_rankings_sector ON rankings(sector);

-- Cache tables

CREATE TABLE IF NOT EXISTS cache_price (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    date TEXT NOT NULL, -- ISO yyyy-mm-dd
    close REAL,
    open REAL,
    high REAL,
    low REAL,
    volume REAL,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cache_price_symbol_date ON cache_price(symbol, date);
CREATE INDEX IF NOT EXISTS idx_cache_price_symbol ON cache_price(symbol);

CREATE TABLE IF NOT EXISTS cache_financials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    period TEXT NOT NULL, -- e.g., 'annual', 'quarterly'
    fiscal_date TEXT NOT NULL, -- ISO date
    data_json TEXT, -- raw JSON payload as text
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cache_financials_key ON cache_financials(symbol, period, fiscal_date);
CREATE INDEX IF NOT EXISTS idx_cache_financials_symbol ON cache_financials(symbol);

CREATE TABLE IF NOT EXISTS cache_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value REAL,
    as_of TEXT, -- ISO date
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cache_metrics_key ON cache_metrics(symbol, metric_name, as_of);
CREATE INDEX IF NOT EXISTS idx_cache_metrics_symbol ON cache_metrics(symbol);

-- Minimal metadata table to track schema/app version
CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY,
    value TEXT
);
