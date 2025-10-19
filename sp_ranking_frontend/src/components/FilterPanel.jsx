import React from 'react';

/**
 * Left panel containing:
 * - Search
 * - Date range (from/to)
 * - Sector select
 * - Batch size input
 * - Export to Excel (disabled for now)
 */

// PUBLIC_INTERFACE
function FilterPanel({
  dateRange,
  onDateRangeChange,
  sector,
  onSectorChange,
  batchSize,
  onBatchSizeChange,
  onExport,
  exportDisabled = true,
  search,
  onSearchChange,
  theme,
}) {
  const panelStyle = {
    background: theme.colors.surface,
    borderRadius: theme.radius.lg,
    boxShadow: theme.elevation.md,
    border: `1px solid ${theme.colors.border}`,
    padding: 16,
    height: 'fit-content',
    position: 'sticky',
    top: 76,
  };

  const labelStyle = { display: 'block', fontSize: 12, color: theme.colors.muted, marginBottom: 6 };
  const fieldStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: theme.radius.md,
    border: `1px solid ${theme.colors.border}`,
    background: theme.colors.background,
    color: theme.colors.text,
    outline: 'none',
  };

  return (
    <aside style={panelStyle} aria-label="Filters and export panel">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={labelStyle}>Search</label>
          <input
            type="text"
            placeholder="Symbol or Name"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            style={fieldStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Date Range</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => onDateRangeChange({ ...dateRange, from: e.target.value })}
              style={fieldStyle}
            />
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => onDateRangeChange({ ...dateRange, to: e.target.value })}
              style={fieldStyle}
            />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Sector</label>
          <select
            value={sector}
            onChange={(e) => onSectorChange(e.target.value)}
            style={fieldStyle}
          >
            <option>All</option>
            <option>Technology</option>
            <option>Healthcare</option>
            <option>Financials</option>
            <option>Energy</option>
            <option>Industrials</option>
            <option>Consumer Discretionary</option>
            <option>Consumer Staples</option>
            <option>Utilities</option>
            <option>Real Estate</option>
            <option>Materials</option>
            <option>Communication Services</option>
          </select>
        </div>

        <div>
          <label style={labelStyle}>Batch Size</label>
          <input
            type="number"
            min={10}
            max={500}
            step={10}
            value={batchSize}
            onChange={(e) => onBatchSizeChange(Number(e.target.value))}
            style={fieldStyle}
          />
          <div style={{ fontSize: 12, color: theme.colors.muted, marginTop: 6 }}>
            Used for future API batching to avoid timeouts.
          </div>
        </div>

        <button
          onClick={onExport}
          disabled={exportDisabled}
          style={{
            marginTop: 6,
            padding: '10px 12px',
            borderRadius: theme.radius.md,
            border: `1px solid ${theme.colors.secondary}`,
            background: exportDisabled
              ? theme.colors.disabledSurface
              : `linear-gradient(135deg, ${theme.colors.secondary} 0%, ${theme.colors.secondarySoft} 100%)`,
            color: exportDisabled ? theme.colors.disabledText : '#111827',
            fontWeight: 700,
            cursor: exportDisabled ? 'not-allowed' : 'pointer',
            boxShadow: theme.elevation.sm,
          }}
          aria-disabled={exportDisabled}
          aria-label="Export to Excel (disabled)"
          title={exportDisabled ? 'Export will be enabled after backend integration' : 'Export to Excel'}
        >
          Export to Excel
        </button>
      </div>
    </aside>
  );
}

export default FilterPanel;
