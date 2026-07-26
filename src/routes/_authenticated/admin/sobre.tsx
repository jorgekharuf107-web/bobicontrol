import { createFileRoute } from "@tanstack/react-router";
import { Tag, Calendar, User, Mail } from "lucide-react";
import bobinas from "@/assets/bobinas.jpg";

export const Route = createFileRoute("/_authenticated/admin/sobre")({
  component: SobrePage,
  head: () => ({
    meta: [
      { title: "Sobre o Sistema | BobiControl" },
      { name: "description", content: "BobiControl - sistema de gestão e controle de estoque de bobinas para ATMs e CDs." },
      { property: "og:title", content: "Sobre o Sistema | BobiControl" },
      { property: "og:description", content: "Sistema de gestão e controle de estoque de bobinas para ATMs e CDs." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/admin/sobre" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "/admin/sobre" }],
  }),
});

function SobrePage() {
  return (
    <div className="min-h-screen bg-[#EFF6FF] -m-4 sm:-m-6">
      <div className="max-w-2xl mx-auto p-3 sm:p-4 space-y-4">
        {/* Imagem topo */}
        <div className="w-full overflow-hidden rounded-2xl shadow-sm">
          <img
            src={bobinas}
            alt="Prateleira com caixas e bobinas em depósito"
            loading="lazy"
            className="w-full object-cover"
            style={{ height: 160 }}
          />
        </div>

        {/* Card principal */}
        <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center text-center">
          <h1 className="text-[32px] font-extrabold text-[#0EA5E9] leading-tight tracking-tight">
            BobiControl
          </h1>
          <p className="text-[14px] text-[#475569] mt-3 max-w-[500px] leading-relaxed">
            Sistema de gestão e controle de estoque de bobinas para ATMs e CDs, com Dashboards, alertas de nível baixo e histórico de movimentações.
          </p>

          <div className="w-full border-t border-slate-100 my-5" />

          {/* Grid de cards de info */}
          <div className="w-full grid grid-cols-2 gap-3">
            <InfoCard icon={<Tag className="h-4 w-4" />} label="VERSÃO" value="2.1.4" />
            <InfoCard icon={<Calendar className="h-4 w-4" />} label="LANÇAMENTO" value="20/03/2026" />
          </div>

          <div className="w-full mt-3">
            <div className="bg-[#F1F5F9] rounded-xl p-4 flex flex-col items-center text-center">
              <User className="h-4 w-4 text-[#64748B]" />
              <p className="text-[12px] text-[#64748B] font-medium tracking-wider mt-1">AUTOR</p>
              <p className="text-[16px] font-bold text-[#1E293B] mt-1">Jorge Wilson Carneiro</p>
              <p className="text-[13px] text-[#0EA5E9] mt-1 flex items-center gap-1.5 break-all">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                jorgekharuf107@gmail.com
              </p>
            </div>
          </div>

          <p className="text-[13px] italic text-[#94A3B8] text-center mt-5">
            Participação e Solicitação: Emerson Ziliotti
          </p>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-[#ECFEFF] rounded-xl p-4 flex flex-col items-center text-center">
      <div className="text-[#0EA5E9]">{icon}</div>
      <p className="text-[12px] text-[#64748B] font-medium tracking-wider mt-1">{label}</p>
      <p className="text-[16px] font-bold text-[#1E293B] mt-1">{value}</p>
    </div>
  );
}
