import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/back-button";
import { Send, Bot } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reposicao-bobinas")({
  component: Reposicao,
});

function Reposicao() {
  const [msgs, setMsgs] = useState<{ role: "bot" | "user"; text: string }[]>([
    { role: "bot", text: "Olá! Diga o identificador do ATM e qual tipo de bobina precisa. Vou registrar sua solicitação." },
  ]);
  const [input, setInput] = useState("");

  function enviar() {
    if (!input.trim()) return;
    setMsgs((m) => [...m, { role: "user", text: input }, { role: "bot", text: "Solicitação recebida. Em breve um técnico será notificado." }]);
    setInput("");
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-3">
        <BackButton to="/dashboard" />
        <h1 className="text-2xl font-bold">Assistente de Reposição de Bobinas</h1>
      </div>
      <Card className="p-4 min-h-[400px] flex flex-col gap-3">
        <div className="flex-1 space-y-3">
          {msgs.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role === "bot" && <Bot className="h-6 w-6 text-primary shrink-0" />}
              <div className={`rounded-lg px-3 py-2 text-sm max-w-[80%] ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {m.text}
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 border-t pt-3">
          <Input
            placeholder="Digite sua solicitação..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && enviar()}
          />
          <Button onClick={enviar}><Send className="h-4 w-4" /></Button>
        </div>
      </Card>
    </div>
  );
}
