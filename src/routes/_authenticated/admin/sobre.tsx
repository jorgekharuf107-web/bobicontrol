import { createFileRoute } from "@tanstack/react-router";
import { BackButton } from "@/components/back-button";
import bobinas from "@/assets/bobinas.jpg";

export const Route = createFileRoute("/_authenticated/admin/sobre")({
  component: SobrePage,
});

const AZUL_CLARO = "#ADD8E6";
const AZUL_ESCURO = "#00008B";

function Linha({ label, valor, cor = AZUL_CLARO, bold = false }: { label: string; valor: string; cor?: string; bold?: boolean }) {
  return (
    <p style={{ fontSize: 14, color: cor, fontWeight: bold ? 700 : 400, margin: 0, lineHeight: 1.4 }}>
      <span style={{ fontWeight: 700 }}>{label}: </span>{valor}
    </p>
  );
}

function SobrePage() {
  return (
    <div className="space-y-3 max-w-xl mx-auto">
      <div className="flex items-center gap-3">
        <BackButton to="/dashboard" />
        <h1 className="text-lg sm:text-2xl font-semibold">Sobre</h1>
      </div>

      <div className="w-full overflow-hidden rounded-md">
        <img
          src={bobinas}
          alt="Bobinas de papel térmico para ATM"
          loading="lazy"
          className="w-full h-auto max-h-32 sm:max-h-64 object-cover rounded-md"
        />
      </div>

      <div className="space-y-1.5 rounded-md p-3" style={{ background: "#f3f4f6" }}>
        <Linha label="Versão" valor="2.1.4" />
        <Linha label="Lançamento" valor="20/03/2026" />
        <Linha label="Autor" valor="Jorge Wilson Carneiro" />
        <Linha label="Email" valor="jorgekharuf107@gmail.com" cor={AZUL_ESCURO} bold />
        <Linha label="Participação e Solicitação" valor="Emerson Ziliotti" />
      </div>
    </div>
  );
}
