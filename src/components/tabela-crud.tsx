import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { CsvExportButton } from "@/components/csv-export-button";
import type { CsvColumn } from "@/lib/csv";

export type Coluna<T> = {
  header: string;
  cell: (row: T) => ReactNode;
  csv?: (row: T) => string | number | null | undefined;
  className?: string;
};

type Props<T> = {
  titulo?: string;
  data: T[];
  colunas: Coluna<T>[];
  acoes?: (row: T) => ReactNode;
  headerAcoes?: ReactNode;
  csvFilename?: string;
  emptyMessage?: string;
  rowKey: (row: T) => string;
};

/**
 * TabelaCrud - Tabela genérica estilo Excel com exportação CSV.
 * Reutilizável em qualquer listagem CRUD.
 */
export function TabelaCrud<T>({
  titulo, data, colunas, acoes, headerAcoes,
  csvFilename, emptyMessage = "Nenhum registro encontrado", rowKey,
}: Props<T>) {
  const csvColumns: CsvColumn<T>[] = colunas
    .filter((c) => c.csv)
    .map((c) => ({ header: c.header, accessor: c.csv! }));

  return (
    <div className="space-y-3">
      {(titulo || headerAcoes || csvFilename) && (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {titulo && <h2 className="text-lg font-semibold">{titulo}</h2>}
          <div className="flex items-center gap-2 ml-auto">
            {csvFilename && csvColumns.length > 0 && (
              <CsvExportButton rows={data} columns={csvColumns} filename={csvFilename} />
            )}
            {headerAcoes}
          </div>
        </div>
      )}
      <Card className="p-0 overflow-hidden">
        <table className="excel-table">
          <thead>
            <tr>
              {colunas.map((c, i) => <th key={i} className={c.className}>{c.header}</th>)}
              {acoes && <th>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr>
                <td colSpan={colunas.length + (acoes ? 1 : 0)} className="text-center py-8 font-medium text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            )}
            {data.map((row) => (
              <tr key={rowKey(row)}>
                {colunas.map((c, i) => <td key={i} className={c.className}>{c.cell(row)}</td>)}
                {acoes && <td className="whitespace-nowrap">{acoes(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
