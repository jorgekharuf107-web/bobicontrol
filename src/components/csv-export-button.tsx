import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportarCSV, type CsvColumn } from "@/lib/csv";

type Props<T> = {
  rows: T[];
  columns: CsvColumn<T>[];
  filename: string;
  disabled?: boolean;
  label?: string;
};

export function CsvExportButton<T>({ rows, columns, filename, disabled, label = "Exportar CSV" }: Props<T>) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled || rows.length === 0}
      onClick={() => exportarCSV(rows, columns, filename)}
    >
      <Download className="h-4 w-4" /> {label}
    </Button>
  );
}
