import React from 'react';

/**
 * Renders ranking table scaffold with columns:
 * Symbol, Name, Score, Price, 1D, 1W, 1M
 */

// PUBLIC_INTERFACE
function RankingTable({ rows, theme }) {
  const thTdBase = {
    padding: '10px 12px',
    borderBottom: `1px solid ${theme.colors.border}`,
    fontSize: 14,
    textAlign: 'left',
    whiteSpace: 'nowrap',
  };

  const toNum = (v) => (Number.isFinite(v) ? v : 0);

  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'separate',
          borderSpacing: 0,
        }}
      >
        <thead>
          <tr
            style={{
              background: theme.colors.headerSurface,
              borderTopLeftRadius: theme.radius.md,
              borderTopRightRadius: theme.radius.md,
            }}
          >
            <th style={{ ...thTdBase, color: theme.colors.muted }}>Symbol</th>
            <th style={{ ...thTdBase, color: theme.colors.muted }}>Name</th>
            <th style={{ ...thTdBase, color: theme.colors.muted }}>Score</th>
            <th style={{ ...thTdBase, color: theme.colors.muted }}>Price</th>
            <th style={{ ...thTdBase, color: theme.colors.muted }}>1D</th>
            <th style={{ ...thTdBase, color: theme.colors.muted }}>1W</th>
            <th style={{ ...thTdBase, color: theme.colors.muted }}>1M</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const changeStyle = (v) => ({
              color: v > 0 ? theme.colors.positive : v < 0 ? theme.colors.negative : theme.colors.text,
              fontWeight: 600,
            });
            const s = toNum(r.score);
            const p = toNum(r.price);
            const d1 = toNum(r.change1D);
            const w1 = toNum(r.change1W);
            const m1 = toNum(r.change1M);
            return (
              <tr key={r.symbol} style={{ background: 'transparent' }}>
                <td style={{ ...thTdBase, fontWeight: 700 }}>{r.symbol}</td>
                <td style={{ ...thTdBase, color: theme.colors.subtleText }}>{r.name}</td>
                <td style={{ ...thTdBase }}>{s.toFixed(2)}</td>
                <td style={{ ...thTdBase }}>${p.toFixed(2)}</td>
                <td style={{ ...thTdBase, ...changeStyle(d1) }}>
                  {d1.toFixed(2)}%
                </td>
                <td style={{ ...thTdBase, ...changeStyle(w1) }}>
                  {w1.toFixed(2)}%
                </td>
                <td style={{ ...thTdBase, ...changeStyle(m1) }}>
                  {m1.toFixed(2)}%
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} style={{ ...thTdBase, textAlign: 'center', color: theme.colors.muted }}>
                No results. Adjust filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default RankingTable;
