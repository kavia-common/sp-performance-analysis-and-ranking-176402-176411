import React, { useMemo, useState } from 'react';
import './index.css';
import './App.css';
import TopBar from './components/TopBar';
import FilterPanel from './components/FilterPanel';
import RankingTable from './components/RankingTable';
import { theme } from './utils/theme';
import { SAMPLE_ROWS } from './utils/sampleData';

/**
 * App shell for S&P Ranking UI.
 * - Ocean Professional theme styling
 * - Top bar with title and formula selector
 * - Left filter/export panel
 * - Main ranking table scaffold with sample data
 * - Finnhub API key is read from environment for future use
 */

// PUBLIC_INTERFACE
function App() {
  /** Basic UI state */
  const [formula, setFormula] = useState('Buffett'); // Buffett | Cramer
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [sector, setSector] = useState('All');
  const [batchSize, setBatchSize] = useState(50);
  const [search, setSearch] = useState('');

  /** Read Finnhub API key (if provided). Do not fail if missing. */
  const FINNHUB_API_KEY =
    process.env.REACT_APP_FINNHUB_API_KEY ||
    process.env.REACT_APP_REACT_APP_FINNHUB_API_KEY ||
    '';

  /** Placeholder: computed rows based on filters/search */
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return SAMPLE_ROWS.filter((r) => {
      const matchSearch =
        !q ||
        r.symbol.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q);
      const matchSector =
        sector === 'All' || r.sector.toLowerCase() === sector.toLowerCase();
      return matchSearch && matchSector;
    });
  }, [search, sector]);

  /** Placeholder handlers */
  const handleExport = () => {
    // Future: trigger backend export to Excel and download
    // Currently disabled in UI, keep here for completeness
    // eslint-disable-next-line no-console
    console.log('Export requested (stub). Formula:', formula);
  };

  const handleRefresh = () => {
    // Future: integrate data fetching using FINNHUB_API_KEY in batches
    // eslint-disable-next-line no-console
    console.log('Refresh requested (stub). Key present?', !!FINNHUB_API_KEY);
  };

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
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          sector={sector}
          onSectorChange={setSector}
          batchSize={batchSize}
          onBatchSizeChange={setBatchSize}
          onExport={handleExport}
          exportDisabled
          search={search}
          onSearchChange={setSearch}
          theme={theme}
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
          <RankingTable rows={rows} theme={theme} />
          <div style={{ marginTop: 10, fontSize: 12, color: theme.colors.muted }}>
            Using sample data. Finnhub key detected: {FINNHUB_API_KEY ? 'Yes' : 'No'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
