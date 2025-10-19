import React, { useMemo } from 'react';

/**
 * PUBLIC_INTERFACE
 * FiltersPanel displays sector filters, market cap range, and completeness threshold.
 */
function FiltersPanel({ filters, sectors, onChange, isLoading }) {
  const selectedSectors = filters.sectors || [];
  const sectorsSorted = useMemo(() => (sectors || []).slice().sort(), [sectors]);

  const toggleSector = (sector) => {
    const set = new Set(selectedSectors);
    if (set.has(sector)) set.delete(sector);
    else set.add(sector);
    onChange({ ...filters, sectors: Array.from(set) });
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="section-title">Filters</div>
        <button className="btn" onClick={() => onChange({ sectors: [], marketCapMin: '', marketCapMax: '', completeness: 0 })} disabled={isLoading}>
          Reset
        </button>
      </div>
      <div className="card-body">
        <div style={{ marginBottom: 12 }}>
          <div className="section-title" style={{ marginBottom: 8 }}>Sectors</div>
          <div className="checkbox-list">
            {sectorsSorted.length === 0 ? (
              <div className="muted">{isLoading ? 'Loading sectors...' : 'No sectors available'}</div>
            ) : sectorsSorted.map((s) => (
              <label key={s} className="checkbox-item">
                <input
                  type="checkbox"
                  checked={selectedSectors.includes(s)}
                  onChange={() => toggleSector(s)}
                  disabled={isLoading}
                />
                <span>{s}</span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div className="section-title" style={{ marginBottom: 8 }}>Market Cap</div>
          <div className="form-row">
            <input
              className="input"
              type="number"
              placeholder="Min"
              value={filters.marketCapMin ?? ''}
              onChange={(e) => onChange({ ...filters, marketCapMin: e.target.value })}
              disabled={isLoading}
            />
            <input
              className="input"
              type="number"
              placeholder="Max"
              value={filters.marketCapMax ?? ''}
              onChange={(e) => onChange({ ...filters, marketCapMax: e.target.value })}
              disabled={isLoading}
            />
          </div>
        </div>

        <div>
          <div className="section-title" style={{ marginBottom: 8 }}>Data Completeness</div>
          <input
            className="input"
            type="number"
            min={0}
            max={100}
            placeholder="Threshold %"
            value={filters.completeness ?? ''}
            onChange={(e) => onChange({ ...filters, completeness: e.target.value })}
            disabled={isLoading}
          />
          <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
            Minimum percentage of data completeness required.
          </div>
        </div>
      </div>
    </div>
  );
}

export default FiltersPanel;
