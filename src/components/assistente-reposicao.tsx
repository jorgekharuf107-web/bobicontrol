import { useState } from "react";
import { toast } from "sonner";
import { Bot, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function AssistenteReposicao() {
  const [atmId, setAtmId] = useState("");
  const [tipo, setTipo] = useState("");
  const [saving, setSaving] = useState(false);

  async function registrar() {
    if (!atmId.trim() || !tipo.trim()) {
      toast.error("Informe o ATM e o tipo de bobina");
      return;
    }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("solicitacoes_reposicao" as any).insert({
      atm_id: atmId.trim(),
      tipo_bobina: tipo.trim(),
      solicitado_por: userData.user?.id ?? null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Solicitação registrada");
    setAtmId("");
    setTipo("");
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Bot className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-semibold">Assistente de Reposição</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Olá! Diga o identificador do ATM e qual tipo de bobina precisa. Vou registrar sua solicitação.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">ATM</Label>
          <Input placeholder="Ex: ATM-042" value={atmId} onChange={(e) => setAtmId(e.target.value)} className="h-9" />
        </div>
        <div>
          <Label className="text-xs">Tipo de bobina</Label>
          <Input placeholder="Ex: 80mm térmica" value={tipo} onChange={(e) => setTipo(e.target.value)} className="h-9" />
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={registrar} disabled={saving} size="sm">
          <Send className="h-4 w-4" /> Registrar Solicitação
        </Button>
      </div>
    </Card>
  );
}
