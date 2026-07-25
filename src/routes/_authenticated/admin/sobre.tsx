import { createFileRoute } from "@tanstack/react-router";
import { BackButton } from "@/components/back-button";
import bobinas from "@/assets/bobinas.jpg";

export const Route = createFileRoute("/_authenticated/admin/sobre")({
  component: SobrePage,
  head: () => ({
    meta: [
      { title: "Sobre o Sistema | Bobi Control" },
      { name: "description", content: "Informações sobre o BobiControl - sistema de gestão e controle de estoque de bobinas para ATMs e CDs." },
      { property: "og:title", content: "Sobre o Sistema | Bobi Control" },
      { property: "og:description", content: "Sistema de gestão e controle de estoque de bobinas para ATMs e CDs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 text-center">
      <p className="text-[12px] text-[#64748B] font-medium">{label}</p>
      <p className="text-[16px] font-bold text-[#1E293B] break-words mt-1">{value}</p>
    </div>
  );
}

function SobrePage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] -m-4 sm:-m-6">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <BackButton to="/dashboard" />
          <h1 className="text-[24px] font-bold text-[#1E293B] leading-tight">Sobre o Sistema</h1>
        </div>

        <div className="w-full overflow-hidden rounded-xl shadow-sm border border-slate-100 bg-white">
          <img
            src={bobinas}
            alt="Prateleira com caixas e bobinas em depósito"
            loading="lazy"
            className="w-full object-cover"
            style={{ height: 200 }}
          />
          <p className="text-[14px] text-[#64748B] text-center py-2">
            Caixas e bobinas em depósito
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col items-center text-center">
          <p className="text-[32px] font-extrabold text-[#0EA5E9] leading-tight">BobiControl</p>
          <p className="text-[14px] text-[#475569] mt-3 max-w-[500px]">
            Sistema de gestão e controle de estoque de bobinas para ATMs e CDs, com Dashboards, alertas de nível baixo e histórico de movimentações.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <InfoCard label="Versão" value="2.1.4" />
          <InfoCard label="Lançamento" value="20/03/2026" />
          <InfoCard label="Autor" value="Jorge Wilson Carneiro" />
          <InfoCard label="Email" value="jorgekharuf107@gmail.com" />
        </div>

        <p className="text-[12px] italic text-[#94A3B8] text-center pt-2">
          Participação e Solicitação: Emerson Ziliotti
        </p>
      </div>
    </div>
  );
}
