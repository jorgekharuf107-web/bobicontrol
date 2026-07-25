import { createFileRoute } from "@tanstack/react-router";
import { BackButton } from "@/components/back-button";
import { Card } from "@/components/ui/card";
import bobinas from "@/assets/bobinas.jpg";

export const Route = createFileRoute("/_authenticated/admin/sobre")({
  component: SobrePage,
});

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-3 text-center bg-[#f3f4f6] border border-slate-200 shadow-sm">
      <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">{label}</p>
      <p className="text-sm font-bold text-slate-800 break-words mt-1">{value}</p>
    </Card>
  );
}

function SobrePage() {
  return (
    <div className="max-w-2xl mx-auto space-y-4 p-2">
      <div className="flex items-center gap-3">
        <BackButton to="/dashboard" />
        <h1 className="text-xl font-semibold">Sobre</h1>
      </div>

      <div className="w-full overflow-hidden rounded-md border border-slate-200 bg-white">
        <img
          src={bobinas}
          alt="Prateleira de bobinas de papel térmico"
          loading="lazy"
          className="w-full h-32 sm:h-48 object-cover"
        />
      </div>

      <div>
        <h2 className="text-base font-semibold text-slate-800">Bobi Control</h2>
        <p className="text-xs text-slate-600">Sistema de controle de bobinas para ATMs</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <InfoCard label="Versão" value="2.1.4" />
        <InfoCard label="Lançamento" value="20/03/2026" />
        <InfoCard label="Autor" value="Jorge Wilson Carneiro" />
        <InfoCard label="Email" value="jorgekharuf107@gmail.com" />
      </div>

      <p className="text-center text-xs text-slate-600 pt-2 border-t border-slate-200">
        Participação e Solicitação: <span className="font-semibold">Emerson Ziliotti</span>
      </p>
    </div>
  );
}
