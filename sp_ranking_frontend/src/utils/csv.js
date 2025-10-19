function escapeCsvValue(val) {
  if (val == null) return '';
  const s = String(val);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// PUBLIC_INTERFACE
export function arrayToCsv(arr) {
  /** Convert array of objects to CSV string. */
  if (!Array.isArray(arr) || arr.length === 0) return '';
  const headers = Array.from(
    arr.reduce((set, row) => {
      Object.keys(row || {}).forEach((k) => set.add(k));
      return set;
    }, new Set())
  );
  const headerLine = headers.map(escapeCsvValue).join(',');
  const lines = arr.map((row) => headers.map((h) => escapeCsvValue(row?.[h])).join(','));
  return [headerLine, ...lines].join('\n');
}

// PUBLIC_INTERFACE
export function downloadArrayAsCsv(arr, filename = 'export.csv') {
  /** Trigger browser download for CSV created from an array of objects. */
  const csv = arrayToCsv(arr);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default {
  arrayToCsv,
  downloadArrayAsCsv,
};
