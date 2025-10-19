/**
 * Finnhub client-side helpers.
 * Uses REACT_APP_FINNHUB_API_KEY env var. Handles missing key gracefully by throwing a friendly error.
 */

const BASE = "https://finnhub.io/api/v1";

// PUBLIC_INTERFACE
export async function fetchQuote(symbol, apiKey) {
  /** Fetch latest quote for a given symbol. */
  if (!apiKey) {
    throw new Error("Missing REACT_APP_FINNHUB_API_KEY");
  }
  const url = `${BASE}/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Quote fetch failed for ${symbol}: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// PUBLIC_INTERFACE
export async function fetchProfile(symbol, apiKey) {
  /** Optionally fetch company name using profile2; failures are non-fatal. */
  if (!apiKey) {
    throw new Error("Missing REACT_APP_FINNHUB_API_KEY");
  }
  const url = `${BASE}/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Profile fetch failed for ${symbol}: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// PUBLIC_INTERFACE
export function computePlaceholderScore(change1W, change1M, formula = "Buffett") {
  /** Placeholder scoring until real formulas arrive. */
  const c1w = Number.isFinite(change1W) ? change1W : 0;
  const c1m = Number.isFinite(change1M) ? change1M : 0;
  if (formula === "Buffett") {
    return 0.6 * c1w + 0.4 * c1m;
  }
  // Cramer or others
  return 0.4 * c1w + 0.6 * c1m;
}

// PUBLIC_INTERFACE
export function normalizeRow(symbol, quote, profile, formula = "Buffett") {
  /**
   * Map finnhub quote-> our row.
   * quote fields: c (current), d (change), dp (%), h, l, o, pc
   * We don't have native 1W/1M change; approximate placeholders using dp for 1D and synthetic values for 1W/1M.
   */
  const price = Number(quote?.c ?? 0);
  const change1D = Number(quote?.dp ?? 0);

  // Placeholder approximations for weekly/monthly change since we're using latest endpoints only.
  // In absence of historical API in scope, derive muted deltas for demo purposes.
  const change1W = Number.isFinite(change1D) ? change1D * 2 : 0; // naive placeholder
  const change1M = Number.isFinite(change1D) ? change1D * 4 : 0; // naive placeholder

  const name = profile?.name || profile?.ticker || symbol;

  const score = computePlaceholderScore(change1W, change1M, formula);

  return {
    symbol,
    name,
    sector: profile?.finnhubIndustry || "N/A",
    score,
    price,
    change1D,
    change1W,
    change1M,
  };
}
