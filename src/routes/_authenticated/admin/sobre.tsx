import { createFileRoute } from "@tanstack/react-router";
import { BackButton } from "@/components/back-button";
import bobinas from "@/assets/bobinas.jpg";

export const Route = createFileRoute("/_authenticated/admin/sobre")({
  component: SobrePage,
});

function SobrePage() {
  const fichaStyle = {
    background: "#f3f4f6",
    color: "#000000",
    padding: "12px",
  } as const;

  return (
    <div className="sobre-container space-y-3 sm:space-y-6">
      <style>{`
        @media (max-width: 480px) {
          .sobre-container { max-height: 100vh; overflow: hidden; }
          .foto-bobina { max-height: 120px !important; }
        }
        .ficha-titulo { font-size: 14px; font-weight: 700; }
        .ficha-valor { font-size: 16px; margin-top: 2px; }
      `}</style>

      <div className="flex items-center gap-3">
        <BackButton to="/dashboard" />
        <h1 className="text-lg sm:text-2xl font-semibold">Sobre</h1>
      </div>

      <div className="w-full overflow-hidden rounded-md">
        <img
          src={bobinas}
          alt="Bobinas de papel térmico para ATM"
          loading="lazy"
          className="foto-bobina w-full h-auto max-h-32 sm:max-h-80 object-cover rounded-md"
        />
      </div>

      <div className="space-y-1 sm:space-y-2">
        <p className="text-base sm:text-xl font-bold">Controle de Bobinas</p>
        <p className="text-xs sm:text-base font-bold leading-snug">
          Sistema de gestão e controle de estoque de bobinas para ATM's e CD's, com Dashboards, alertas de nível baixo e histórico de movimentações.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <div className="rounded-md shadow-sm" style={fichaStyle}>
          <p className="ficha-titulo">Versão</p>
          <p className="ficha-valor">2.1.4</p>
        </div>

        <div className="rounded-md shadow-sm" style={fichaStyle}>
          <p className="ficha-titulo">Lançamento</p>
          <p className="ficha-valor">20/03/2026</p>
        </div>

        <div className="rounded-md shadow-sm" style={fichaStyle}>
          <p className="ficha-titulo">Autor</p>
          <p className="ficha-valor">Jorge Wilson Carneiro</p>
          <p className="text-xs break-words mt-1">jorgekharuf107@gmail.com</p>
        </div>

        <div className="rounded-md shadow-sm" style={fichaStyle}>
          <p className="italic font-bold text-xs sm:text-sm">Participação e Solicitação: Emerson Ziliotti</p>
          <p className="italic font-bold text-xs sm:text-sm mt-1">Orientações e Correções gerais: META</p>
        </div>
      </div>
    </div>
  );
}
