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
  } as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BackButton to="/dashboard" />
        <h1 className="text-2xl font-semibold">Sobre</h1>
      </div>

      <div className="w-full overflow-hidden rounded-md">
        <img
          src={bobinas}
          alt="Bobinas de papel térmico para ATM"
          loading="lazy"
          className="w-full h-auto max-h-80 object-cover rounded-md"
        />
      </div>

      <div className="space-y-2">
        <p className="text-xl font-bold">Controle de Bobinas</p>
        <p className="text-base font-bold">
          Sistema de gestão e controle de estoque de bobinas para ATM's e CD's, com Dashboards, alertas de nível baixo e histórico de movimentações.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-md p-4 shadow-sm" style={fichaStyle}>
          <p className="font-bold">Versão</p>
          <p className="mt-1">2.1.4</p>
        </div>

        <div className="rounded-md p-4 shadow-sm" style={fichaStyle}>
          <p className="font-bold">Lançamento</p>
          <p className="mt-1">20/03/2026</p>
        </div>

        <div className="rounded-md p-4 shadow-sm" style={fichaStyle}>
          <p className="font-bold">Autor</p>
          <p className="mt-1">Jorge Wilson Carneiro</p>
          <p className="mt-1 break-words">jorgekharuf107@gmail.com</p>
        </div>

        <div className="rounded-md p-4 shadow-sm" style={fichaStyle}>
          <p className="italic font-bold">Participação e Solicitação: Emerson Ziliotti</p>
          <p className="italic font-bold mt-2">Orientações e Correções gerais: META</p>
        </div>
      </div>
    </div>
  );
}
