import React from 'react';
import { theme } from '../utils/theme';

// PUBLIC_INTERFACE
function TopBar({ title, formula, onFormulaChange, onRefresh }) {
  /** Top navigation bar with title, formula selector, and refresh button. */
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: theme.colors.surface,
        borderBottom: `1px solid ${theme.colors.border}`,
        boxShadow: theme.elevation.sm,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '14px 20px',
          maxWidth: 1400,
          margin: '0 auto',
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: theme.colors.text,
          }}
          aria-label="Application Title"
        >
          {title}
        </div>

        <div style={{ flex: 1 }} />

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: theme.colors.text,
            fontSize: 14,
          }}
        >
          <span style={{ fontWeight: 500 }}>Formula:</span>
          <select
            value={formula}
            onChange={(e) => onFormulaChange(e.target.value)}
            style={{
              appearance: 'none',
              padding: '8px 12px',
              borderRadius: theme.radius.md,
              border: `1px solid ${theme.colors.border}`,
              background: theme.colors.background,
              color: theme.colors.text,
              outline: 'none',
              cursor: 'pointer',
              transition: 'border-color .2s ease, box-shadow .2s ease',
            }}
            aria-label="Formula selector"
          >
            <option value="Buffett">Buffett</option>
            <option value="Cramer">Cramer</option>
          </select>
        </label>

        <button
          onClick={onRefresh}
          style={{
            marginLeft: 12,
            padding: '8px 12px',
            borderRadius: theme.radius.md,
            border: `1px solid ${theme.colors.primary}`,
            background:
              `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.primarySoft} 100%)`,
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: theme.elevation.sm,
            transition: 'transform .12s ease, box-shadow .12s ease, opacity .2s ease',
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'translateY(1px)';
            e.currentTarget.style.boxShadow = theme.elevation.none;
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'translateY(0px)';
            e.currentTarget.style.boxShadow = theme.elevation.sm;
          }}
          aria-label="Refresh data"
        >
          Refresh
        </button>
      </div>
    </header>
  );
}

export default TopBar;
