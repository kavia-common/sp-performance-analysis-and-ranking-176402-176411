import React from 'react';

/**
 * PUBLIC_INTERFACE
 * FormulaSelector allows picking the ranking formula mode.
 */
function FormulaSelector({ value, onChange }) {
  return (
    <div className="controls-row">
      <label className="muted" htmlFor="formula-selector">Formula</label>
      <select
        id="formula-selector"
        className="select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="buffett">Buffett</option>
        <option value="cramer">Cramer</option>
        <option value="both">Both (Combined)</option>
      </select>
    </div>
  );
}

export default FormulaSelector;
