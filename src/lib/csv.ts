export type CsvColumn<T> = {
  header: string;
  accessor: (row: T) => string | number | null | undefined;
};

function escape(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  let s = String(v);
  // Neutraliza injeção de fórmulas em planilhas (Excel/Sheets)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  s = s.replace(/"/g, '""');
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

/** Parse CSV text (separator ; or ,) into array of records keyed by header. */
export function parseCSV(text: string, sep?: string): Record<string, string>[] {
  const clean = text.replace(/^\uFEFF/, "");
  if (!clean.trim()) return [];
  const separator = sep ?? (clean.split("\n")[0].includes(";") ? ";" : ",");
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (inQuotes) {
      if (c === '"' && clean[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { field += c; }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === separator) { cur.push(field); field = ""; }
      else if (c === "\n") { cur.push(field); rows.push(cur); cur = []; field = ""; }
      else if (c === "\r") { /* skip */ }
      else field += c;
    }
  }
  if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push(cur); }
  const headers = (rows.shift() ?? []).map((h) => h.trim());
  return rows
    .filter((r) => r.some((v) => v && v.trim() !== ""))
    .map((r) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = (r[i] ?? "").trim(); });
      return obj;
    });
}

