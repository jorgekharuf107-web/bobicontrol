import { Search } from "lucide-react";
import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  search: string;
  onSearch: (v: string) => void;
  placeholder?: string;
  dataInicio?: string;
  onDataInicio?: (v: string) => void;
  dataFim?: string;
  onDataFim?: (v: string) => void;
  extra?: ReactNode;
};

export function TableSearch({
  search, onSearch, placeholder = "Pesquisar…",
  dataInicio, onDataInicio, dataFim, onDataFim, extra,
}: Props) {
  return (
    <div className="flex flex-wrap items-end gap-2 p-2 rounded border bg-muted/40">
      <div className="flex-1 min-w-[180px]">
        <Label className="text-[11px] mb-0.5 block">Pesquisar</Label>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={placeholder}
            className="h-8 pl-7 text-sm"
          />
        </div>
      </div>
      {onDataInicio && (
        <div className="w-[150px]">
          <Label className="text-[11px] mb-0.5 block">Data início</Label>
          <Input type="date" className="h-8 text-sm" value={dataInicio ?? ""}
            onChange={(e) => onDataInicio(e.target.value)} />
        </div>
      )}
      {onDataFim && (
        <div className="w-[150px]">
          <Label className="text-[11px] mb-0.5 block">Data fim</Label>
          <Input type="date" className="h-8 text-sm" value={dataFim ?? ""}
            onChange={(e) => onDataFim(e.target.value)} />
        </div>
      )}
      {extra}
    </div>
  );
}
