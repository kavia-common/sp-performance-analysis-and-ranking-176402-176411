import React, { useEffect, useMemo, useState } from 'react';
import './index.css';
import './App.css';
import TopBar from './components/TopBar';
import FilterPanel from './components/FilterPanel';
import RankingTable from './components/RankingTable';
import { theme } from './utils/theme';
import { SP500_SYMBOLS } from './data/sp500Symbols';
import { getBatches, sleep } from './utils/batching';
import { fetchQuote, fetchProfile, normalizeRow } from './utils/api';
import { exportRowsToExcel } from './utils/exportExcel';

/**
 * App shell for S&P Ranking UI.
 * - Ocean Professional theme styling
 * - Top bar with title and formula selector
 * - Left filter/export panel
 * - Main ranking table with latest values (no date range)
 * - Finnhub API key is read from environment
 */

// PUBLIC_INTERFACE
function App() {
  /** Basic UI state */
  const [formula, setFormula] = useState('Buffett'); // Buffett | Cramer
  const [sector, setSector] = useState('All');
  const [batchSize, setBatchSize] = useState(50);
  const [search, setSearch] = useState('');
  const [allRows, setAllRows] = useState([]); // merged results across batches
  const [busy, setBusy] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [warning, setWarning] = useState('');

  /** Read Finnhub API key (if provided). Do not fail if missing. */
  const FINNHUB_API_KEY =
    process.env.REACT_APP_FINNHUB_API_KEY ||
    process.env.REACT_APP_REACT_APP_FINNHUB_API_KEY ||
    '';

  useEffect(() => {
    if (!FINNHUB_API_KEY) {
      setWarning('Missing REACT_APP_FINNHUB_API_KEY. Fetch is disabled.');
    } else {
      setWarning('');
    }
  }, [FINNHUB_API_KEY]);

  /** Compute filtered rows based on search/sector */
  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRows
      .filter((r) => {
        const matchSearch =
          !q ||
          r.symbol.toLowerCase().includes(q) ||
          (r.name || '').toLowerCase().includes(q);
        const matchSector =
          sector === 'All' ||
          (r.sector || '').toLowerCase() === sector.toLowerCase();
        return matchSearch && matchSector;
      })
      .sort((a, b) => b.score - a.score);
  }, [search, sector, allRows]);

  async function fetchBatch(symbols, apiKey, formulaSel) {
    // Fetch quotes in parallel; profile optionally with lightweight handling
    const quotePromises = symbols.map((s) =>
      fetchQuote(s, apiKey).then(
        (q) => ({ s, ok: true, q }),
        (err) => ({ s, ok: false, err })
      )
    );

    const profilePromises = symbols.map((s) =>
      fetchProfile(s, apiKey).then(
        (p) => ({ s, ok: true, p }),
        () => ({ s, ok: false, p: {} }) // non-fatal if fails
      )
    );

    const [quotes, profiles] = await Promise.all([
      Promise.allSettled(quotePromises),
      Promise.allSettled(profilePromises),
    ]);

    const quoteMap = new Map();
    quotes.forEach((res) => {
      if (res.status === 'fulfilled') {
        const { s, ok, q } = res.value;
        if (ok) quoteMap.set(s, q);
      }
    });

    const profileMap = new Map();
    profiles.forEach((res) => {
      if (res.status === 'fulfilled') {
        const { s, p } = res.value;
        profileMap.set(s, p || {});
      }
    });

    const rows = symbols.map((s) => {
      const q = quoteMap.get(s) || {};
      const p = profileMap.get(s) || {};
      return normalizeRow(s, q, p, formulaSel);
    });

    return rows;
  }

  async function handleRefresh() {
    if (!FINNHUB_API_KEY) {
      setWarning('Missing REACT_APP_FINNHUB_API_KEY. Fetch is disabled.');
      return;
    }
    setBusy(true);
    setAllRows([]);
    setProgressText('Starting batch fetch…');

    try {
      const batches = getBatches(SP500_SYMBOLS, Math.max(1, Number(batchSize) || 50));
      const totalBatches = batches.length;
      const merged = [];

      for (let i = 0; i < totalBatches; i += 1) {
        const chunk = batches[i];
        setProgressText(`Fetching batch ${i + 1}/${totalBatches} (${chunk.length} symbols)…`);
        // fetch one batch
        const rows = await fetchBatch(chunk, FINNHUB_API_KEY, formula);
        merged.push(...rows);
        setAllRows([...merged]); // update state to show progressive results
        // small delay to reduce pressure on API/rate limits
        await sleep(300);
      }

      setProgressText(`Completed ${totalBatches} batches.`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      setWarning(`Fetch error: ${err.message || 'Unknown error'}`);
    } finally {
      setBusy(false);
      setTimeout(() => setProgressText(''), 1500);
    }
  }

  function handleExport() {
    if (!allRows.length) return;
    exportRowsToExcel(allRows, 'sp-ranking-latest.xlsx');
  }

  return (
    <div
      style={{
        background: theme.colors.background,
        minHeight: '100vh',
        color: theme.colors.text,
      }}
    >
      <TopBar
        title="S&P Performance Ranking"
        formula={formula}
        onFormulaChange={setFormula}
        onRefresh={handleRefresh}
        busy={busy}
        progressText={progressText}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '300px 1fr',
          gap: '20px',
          padding: '20px',
          maxWidth: '1400px',
          margin: '0 auto',
        }}
      >
        <FilterPanel
          sector={sector}
          onSectorChange={setSector}
          batchSize={batchSize}
          onBatchSizeChange={setBatchSize}
          onExport={handleExport}
          exportDisabled={!allRows.length}
          search={search}
          onSearchChange={setSearch}
          theme={theme}
          progressText={progressText}
          busy={busy}
        />

        <div
          style={{
            background: theme.colors.surface,
            borderRadius: theme.radius.lg,
            boxShadow: theme.elevation.md,
            padding: '16px',
            border: `1px solid ${theme.colors.border}`,
          }}
        >
          <RankingTable rows={visibleRows} theme={theme} />
          <div style={{ marginTop: 10, fontSize: 12, color: theme.colors.muted }}>
            {FINNHUB_API_KEY ? 'Finnhub key detected.' : 'Finnhub key missing.'}
            {warning ? ` — ${warning}` : ''}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
