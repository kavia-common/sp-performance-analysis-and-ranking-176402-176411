import React from 'react';

/**
 * PUBLIC_INTERFACE
 * Toolbar provides actions: Run, Refresh, and Export with a status indicator.
 */
function Toolbar({
  onRun,
  onRefresh,
  onExportCsv,
  onExportExcel,
  canExport,
  runStatus,
  runInProgress,
  runId,
}) {
  const statusText = runInProgress
    ? `Running${runStatus?.progress != null ? ` ${runStatus.progress}%` : ''}...`
    : runStatus?.status
    ? `${runStatus.status}${runId ? ` • Run #${runId}` : ''}`
    : 'Idle';

  return (
    <div className="card">
      <div className="card-header">
        <div className="section-title">Actions</div>
      </div>
      <div className="card-body">
        <div className="controls-row" style={{ marginBottom: 8 }}>
          <button className="btn btn-primary" onClick={onRun} disabled={runInProgress}>
            ▶ Run
          </button>
          <button className="btn" onClick={onRefresh} disabled={runInProgress}>
            ↻ Refresh
          </button>
        </div>
        <div className="controls-row" style={{ marginBottom: 8 }}>
          <button className="btn" onClick={onExportCsv} disabled={!canExport}>
            ⬇ Export CSV
          </button>
          <button className="btn btn-amber" onClick={onExportExcel} disabled={!canExport}>
            ⬇ Export Excel
          </button>
        </div>
        <div className="muted" style={{ fontSize: 13 }}>
          Status: {statusText}
        </div>
      </div>
    </div>
  );
}

export default Toolbar;
