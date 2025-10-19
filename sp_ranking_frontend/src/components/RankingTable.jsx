import React, { useMemo } from 'react';

/**
 * PUBLIC_INTERFACE
 * RankingTable renders ranking results with sortable headers and pagination controls.
 */
function RankingTable({
  rows,
  isLoading,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  total,
  sortBy,
  sortDir,
  onSortChange,
}) {
  const columns = [
    { key: 'symbol', label: 'Symbol' },
    { key: 'name', label: 'Name' },
    { key: 'sector', label: 'Sector' },
    { key: 'marketCap', label: 'Market Cap' },
    { key: 'score_buffett', label: 'Buffett Score' },
    { key: 'score_cramer', label: 'Cramer Score' },
    { key: 'combined_rank', label: 'Combined Rank' },
    { key: 'last_updated', label: 'Last Updated' },
  ];

  const localSorted = useMemo(() => {
    if (!rows || !rows.length) return [];
    if (!sortBy) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a?.[sortBy];
      const bv = b?.[sortBy];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'desc' ? bv - av : av - bv;
      }
      return sortDir === 'desc'
        ? String(bv).localeCompare(String(av))
        : String(av).localeCompare(String(bv));
    });
    return copy;
  }, [rows, sortBy, sortDir]);

  const toggleSort = (key) => {
    if (sortBy !== key) {
      onSortChange(key, 'asc');
    } else {
      onSortChange(key, sortDir === 'asc' ? 'desc' : 'asc');
    }
  };

  const from = Math.min(total, page * pageSize + 1);
  const to = Math.min(total, (page + 1) * pageSize);

  return (
    <div className="card table-wrapper">
      <table className="table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>
                <button className="sort-btn" onClick={() => toggleSort(col.key)}>
                  {col.label}
                  {sortBy === col.key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr><td className="muted" colSpan={columns.length}>Loading...</td></tr>
          ) : localSorted.length === 0 ? (
            <tr><td className="muted" colSpan={columns.length}>No data</td></tr>
          ) : (
            localSorted.map((r, idx) => (
              <tr key={`${r.symbol}-${idx}`}>
                <td><span className="badge">{r.symbol}</span></td>
                <td>{r.name}</td>
                <td className="muted">{r.sector}</td>
                <td>{r.marketCap?.toLocaleString?.() ?? r.marketCap}</td>
                <td>{r.score_buffett ?? '-'}</td>
                <td>{r.score_cramer ?? '-'}</td>
                <td>{r.combined_rank ?? '-'}</td>
                <td className="muted">{r.last_updated ? new Date(r.last_updated).toLocaleString() : '-'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div className="pagination">
        <div className="muted">
          {total ? `Showing ${from}-${to} of ${total}` : ''}
        </div>
        <div className="controls-row">
          <button className="btn" onClick={() => onPageChange(Math.max(0, page - 1))} disabled={page === 0 || isLoading}>
            ◀ Prev
          </button>
          <div className="muted">Page {page + 1}</div>
          <button
            className="btn"
            onClick={() => onPageChange(page + 1)}
            disabled={isLoading || (to >= total && total > 0)}
          >
            Next ▶
          </button>
          <select
            className="select"
            value={pageSize}
            onChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
            disabled={isLoading}
            aria-label="Rows per page"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>{n} / page</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

export default RankingTable;
