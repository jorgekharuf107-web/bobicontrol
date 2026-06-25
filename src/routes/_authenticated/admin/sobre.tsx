import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { BackButton } from "@/components/back-button";
import bobinas from "@/assets/bobinas.jpg";

export const Route = createFileRoute("/_authenticated/admin/sobre")({
  component: SobrePage,
});

function SobrePage() {
  const fichas = [
    { label: "Versão", valor: "2.1.4" },
    { label: "Lançamento", valor: "20/03/2026" },
    { label: "Autor", valor: "Jorge Wilson Carneiro" },
    { label: "Contato", valor: "jorgekharuf107@gmail.com" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BackButton to="/dashboard" />
        <h1 className="text-2xl font-semibold">Sobre</h1>
      </div>

      <Card className="p-8 space-y-2">
        <p className="text-base"><span className="font-semibold">Versão</span> 2.1.4</p>
        <p className="text-base"><span className="font-semibold">Lançamento</span> 20/03/2026</p>
        <p className="text-base">
          <span className="font-semibold">Autor</span> Jorge Wilson Carneiro{" "}
          <a href="mailto:jorgekharuf107@gmail.com" className="text-primary underline">
            jorgekharuf107@gmail.com
          </a>
        </p>
        <p className="text-base italic font-bold pt-2">
          Participação e Solicitação: Emerson Ziliotti
        </p>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <Card className="p-4 overflow-hidden">
          <img
            src={bobinas}
            alt="Bobinas de papel térmico para ATM"
            loading="lazy"
            width={1024}
            height={1024}
            className="w-full h-auto rounded-md object-cover"
          />
        </Card>

        <div className="grid grid-cols-2 gap-4">
          {fichas.map((f) => (
            <div
              key={f.label}
              className="rounded-md p-4 shadow-sm"
              style={{ background: "#f3f4f6", color: "#000000" }}
            >
              <p className="text-xs uppercase tracking-wider opacity-70">{f.label}</p>
              <p className="text-base font-semibold mt-1 break-words">{f.valor}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
