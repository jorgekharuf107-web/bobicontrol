import { createFileRoute } from "@tanstack/react-router";
import { BackButton } from "@/components/back-button";
import bobinas from "@/assets/bobinas.jpg";

export const Route = createFileRoute("/_authenticated/admin/sobre")({
  component: SobrePage,
});

const AZUL_CLARO = "#ADD8E6";
const AZUL_ESCURO = "#00008B";
const SKY_BLUE = "#87CEEB";

function Linha({ label, valor, cor = AZUL_CLARO, bold = false }: { label: string; valor: string; cor?: string; bold?: boolean }) {
  return (
    <p style={{ fontSize: 14, color: cor, fontWeight: bold ? 700 : 400, margin: 0, lineHeight: 1.4 }}>
      <span style={{ fontWeight: 700 }}>{label}: </span>{valor}
    </p>
  );
}

function SobrePage() {
  return (
    <div className="min-h-full -m-4 p-4 sm:p-6" style={{ background: SKY_BLUE }}>
      <div className="max-w-xl mx-auto space-y-3">
        <div className="flex items-center gap-3">
          <BackButton to="/dashboard" />
          <h1 className="text-lg sm:text-2xl font-semibold">Sobre</h1>
        </div>

        <div
          className="mx-auto rounded-lg p-4 space-y-3 text-center"
          style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(4px)" }}
        >
          <div className="w-full overflow-hidden rounded-md">
            <img
              src={bobinas}
              alt="Bobinas de papel térmico para ATM"
              loading="lazy"
              className="w-full h-auto max-h-32 sm:max-h-64 object-cover rounded-md mx-auto"
            />
          </div>

          <div className="space-y-1.5 text-left">
            <Linha label="Versão" valor="2.1.4" />
            <Linha label="Lançamento" valor="20/03/2026" />
            <Linha label="Autor" valor="Jorge Wilson Carneiro" />
            <Linha label="Email" valor="jorgekharuf107@gmail.com" cor={AZUL_ESCURO} bold />
            <Linha label="Participação e Solicitação" valor="Emerson Ziliotti" />
          </div>
        </div>
      </div>
    </div>
  );
}
