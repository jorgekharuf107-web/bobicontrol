export type CsvColumn<T> = {
  header: string;
  accessor: (row: T) => string | number | null | undefined;
};

function escape(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v).replace(/"/g, '""');
  return /[",;\n\r]/.test(s) ? `"${s}"` : s;
}

export function exportarCSV<T>(rows: T[], columns: CsvColumn<T>[], filename: string) {
  const sep = ";"; // Excel PT-BR friendly
  const head = columns.map((c) => escape(c.header)).join(sep);
  const body = rows.map((r) => columns.map((c) => escape(c.accessor(r))).join(sep)).join("\n");
  const csv = "\uFEFF" + head + "\n" + body; // BOM for Excel UTF-8
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
