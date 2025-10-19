const BASE_URL = (process.env.REACT_APP_BACKEND_BASE_URL || '').replace(/\/*$/, '');

// Internal helper for fetch
async function http(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const opts = {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  };
  const res = await fetch(url, opts);
  // Allow 204/empty
  const ctype = res.headers.get('content-type') || '';
  const isJson = ctype.includes('application/json');
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      if (isJson) {
        const errData = await res.json();
        message = errData?.detail || errData?.message || message;
      } else {
        const txt = await res.text();
        message = txt || message;
      }
    } catch (_e) {}
    throw new Error(message);
  }
  if (isJson) return res.json();
  return res;
}

// PUBLIC_INTERFACE
export async function getHealth() {
  /** Check backend health. Returns {status:'ok'} or similar. */
  try {
    return await http('/health', { method: 'GET' });
  } catch (e) {
    return { status: 'unavailable', error: e.message };
  }
}

// PUBLIC_INTERFACE
export async function getSymbols() {
  /** Fetch list of available symbols and sectors. Expected response: { symbols: [{symbol,name,sector,marketCap}], sectors: [string] } */
  return http('/symbols', { method: 'GET' });
}

// PUBLIC_INTERFACE
export async function postRun(formula_mode = 'both', options = {}) {
  /** Trigger a ranking run. Returns { run_id, status }. */
  return http('/rankings/run', {
    method: 'POST',
    body: JSON.stringify({ formula_mode, options }),
  });
}

// PUBLIC_INTERFACE
export async function getStatus(run_id) {
  /** Get status of a run. Returns { run_id, status, progress, message, formula_mode }. */
  const qp = run_id ? `?run_id=${encodeURIComponent(run_id)}` : '';
  return http(`/rankings/status${qp}`, { method: 'GET' });
}

// PUBLIC_INTERFACE
export async function getLatest(params = {}) {
  /**
   * Get latest ranking results with optional pagination/sorting/filtering.
   * params: { page, pageSize, sortBy, sortDir, formula_mode, sectors, marketCapMin, marketCapMax, completeness }
   * Note: backend expects exact param names as listed above.
   */
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    if (Array.isArray(v)) {
      v.forEach((vv) => qs.append(k, vv));
    } else {
      qs.set(k, v);
    }
  });
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return http(`/rankings/latest${query}`, { method: 'GET' });
}

// PUBLIC_INTERFACE
export function exportRun(run_id, format = 'excel') {
  /**
   * Returns a URL to download the export for the given run.
   * Caller can open this URL in a new window/tab.
   */
  if (!BASE_URL) return null;
  if (!run_id) return null;
  const fmt = format === 'csv' ? 'csv' : 'excel';
  return `${BASE_URL}/rankings/export?run_id=${encodeURIComponent(run_id)}&format=${encodeURIComponent(fmt)}`;
}

export default {
  getHealth,
  getSymbols,
  postRun,
  getStatus,
  getLatest,
  exportRun,
};
