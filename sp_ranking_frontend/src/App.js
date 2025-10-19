import React from 'react';
import './App.css';
import './index.css';
import FormulaSelector from './components/FormulaSelector';
import FiltersPanel from './components/FiltersPanel';
import RankingTable from './components/RankingTable';
import Toolbar from './components/Toolbar';
import useRankingData from './hooks/useRankingData';

// PUBLIC_INTERFACE
function App() {
  /** Dashboard root: provides Ocean Professional theme layout and wires components via useRankingData hook. */
  const {
    formulaMode,
    setFormulaMode,
    filters,
    setFilters,
    sectors,
    isLoading,
    error,
    page,
    setPage,
    pageSize,
    setPageSize,
    sortBy,
    sortDir,
    setSort,
    data,
    total,
    runStatus,
    runId,
    runInProgress,
    triggerRun,
    refresh,
    canExport,
    exportCsv,
    exportExcel,
  } = useRankingData();

  return (
    <div className="ocean-app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">📈</div>
          <div className="brand-text">
            <h1>S&P Performance Ranking</h1>
            <div className="subtitle">Ocean Professional</div>
          </div>
        </div>
        <div className="topbar-actions">
          <FormulaSelector
            value={formulaMode}
            onChange={setFormulaMode}
          />
        </div>
      </header>

      <div className="content">
        <aside className="sidebar">
          <Toolbar
            onRun={triggerRun}
            onRefresh={refresh}
            onExportCsv={exportCsv}
            onExportExcel={exportExcel}
            canExport={canExport}
            runStatus={runStatus}
            runInProgress={runInProgress}
            runId={runId}
          />
          <FiltersPanel
            filters={filters}
            sectors={sectors}
            onChange={setFilters}
            isLoading={isLoading}
          />
        </aside>

        <main className="main">
          {error && <div className="alert error">⚠️ {error}</div>}
          <RankingTable
            rows={data}
            isLoading={isLoading}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            total={total}
            sortBy={sortBy}
            sortDir={sortDir}
            onSortChange={setSort}
          />
        </main>
      </div>

      <footer className="footer">
        <span>Backend: {process.env.REACT_APP_BACKEND_BASE_URL || 'not configured'}</span>
      </footer>
    </div>
  );
}

export default App;
