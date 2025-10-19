/**
 * Excel export using SheetJS (xlsx).
 */
import * as XLSX from "xlsx";

// PUBLIC_INTERFACE
export function exportRowsToExcel(rows, filename = "sp-ranking.xlsx") {
  /**
   * Creates a workbook with one sheet from provided rows.
   * Columns: Symbol, Name, Score, Price, Change1D, Change1W, Change1M
   */
  if (!rows || rows.length === 0) return;

  const data = rows.map((r) => ({
    Symbol: r.symbol,
    Name: r.name,
    Score: Number.isFinite(r.score) ? Number(r.score.toFixed(2)) : r.score,
    Price: Number.isFinite(r.price) ? Number(r.price.toFixed(2)) : r.price,
    Change1D: Number.isFinite(r.change1D) ? Number(r.change1D.toFixed(2)) : r.change1D,
    Change1W: Number.isFinite(r.change1W) ? Number(r.change1W.toFixed(2)) : r.change1W,
    Change1M: Number.isFinite(r.change1M) ? Number(r.change1M.toFixed(2)) : r.change1M,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ranking");
  XLSX.writeFile(wb, filename);
}
