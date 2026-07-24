import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BackButton } from "@/components/back-button";

type Fornecedor = {
  id?: string; razao_social: string; cnpj: string; cidade: string; estado: string;
  contato_principal: string; status: "ativo" | "inativo"; telefone: string; email: string;
  endereco: string; bairro: string; cidade_endereco: string; estado_uf: string; cep: string;
  fornecedor_ativo_sim_nao: boolean; fornecedor_padrao: boolean;
};

type Motorista = {
  id?: string; nome_completo: string; cpf: string; celular: string; email: string;
  tipo_contato: "motorista1" | "motorista2";
};

const emptyFornecedor: Fornecedor = {
  razao_social: "", cnpj: "", cidade: "", estado: "", contato_principal: "",
  status: "ativo", telefone: "", email: "", endereco: "", bairro: "",
  cidade_endereco: "", estado_uf: "", cep: "", fornecedor_ativo_sim_nao: true,
  fornecedor_padrao: false,
};

const emptyMotorista = (tipo: "motorista1" | "motorista2"): Motorista => ({
  nome_completo: "", cpf: "", celular: "", email: "", tipo_contato: tipo,
});

export function FornecedorForm({ fornecedorId }: { fornecedorId?: string }) {
  const router = useRouter();
  const isEdit = !!fornecedorId;
  const [tab, setTab] = useState("dados");
  const [forn, setForn] = useState<Fornecedor>(emptyFornecedor);
  const [m1, setM1] = useState<Motorista>(emptyMotorista("motorista1"));
  const [m2, setM2] = useState<Motorista>(emptyMotorista("motorista2"));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!fornecedorId) return;
    (async () => {
      const { data: f } = await supabase.from("fornecedores").select("*").eq("id", fornecedorId).maybeSingle();
      if (f) setForn(f as any);
      const { data: motoristas } = await supabase.from("motoristas").select("*").eq("fornecedor_id", fornecedorId);
      const mot1 = motoristas?.find((m: any) => m.tipo_contato === "motorista1");
      const mot2 = motoristas?.find((m: any) => m.tipo_contato === "motorista2");
      if (mot1) setM1(mot1 as any); else setM1(emptyMotorista("motorista1"));
      if (mot2) setM2(mot2 as any); else setM2(emptyMotorista("motorista2"));
    })();
  }, [fornecedorId]);

  async function save() {
    if (!forn.razao_social.trim() || !forn.cnpj.trim()) {
      setTab("dados");
      return toast.error("Razão social e CNPJ são obrigatórios");
    }
    setSaving(true);
    try {
      let id = fornecedorId;
      const payload = { ...forn };
      delete (payload as any).id;
      // Se marcado como padrão, desmarca os outros (índice único exige)
      if (payload.fornecedor_padrao) {
        await supabase.from("fornecedores").update({ fornecedor_padrao: false }).eq("fornecedor_padrao", true);
      }
      if (isEdit) {
        const { error } = await supabase.from("fornecedores").update(payload).eq("id", id!);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("fornecedores").insert(payload).select("id").single();
        if (error) throw error;
        id = data.id;
      }

      for (const m of [m1, m2]) {
        const hasData = m.nome_completo.trim() || m.cpf.trim() || m.celular.trim() || m.email.trim();
        if (!hasData) continue;
        const motPayload = {
          fornecedor_id: id!, nome_completo: m.nome_completo, cpf: m.cpf || null,
          celular: m.celular || null, email: m.email || null, tipo_contato: m.tipo_contato,
        };
        const { error } = await supabase.from("motoristas").upsert(motPayload as any, { onConflict: "fornecedor_id,tipo_contato" });
        if (error) throw error;
      }

      toast.success(isEdit ? "Fornecedor atualizado" : "Fornecedor criado");
      router.navigate({ to: "/fornecedores" });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  const MotoristaTab = ({ value, m, onChange, title }: {
    value: string; m: Motorista; onChange: (m: Motorista) => void; title: string;
  }) => (
    <TabsContent value={value}>
      <Card className="p-3">
        <h3 className="font-medium mb-2 text-[13px]">{title}</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1 col-span-2"><Label className="text-[11px]">Nome completo</Label>
            <Input className="h-7 text-xs" value={m.nome_completo} onChange={(e) => onChange({ ...m, nome_completo: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-[11px]">CPF</Label>
            <Input className="h-7 text-xs" value={m.cpf} onChange={(e) => onChange({ ...m, cpf: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-[11px]">Celular</Label>
            <Input className="h-7 text-xs" value={m.celular} onChange={(e) => onChange({ ...m, celular: e.target.value })} /></div>
          <div className="space-y-1 col-span-2"><Label className="text-[11px]">Email</Label>
            <Input className="h-7 text-xs" type="email" value={m.email} onChange={(e) => onChange({ ...m, email: e.target.value })} /></div>
        </div>
      </Card>
    </TabsContent>
  );

  const inp = "h-7 text-xs";
  const lbl = "text-[11px]";

  return (
    <div className="space-y-3 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BackButton to="/fornecedores" />
          <h1 className="text-lg font-semibold">{isEdit ? "Editar fornecedor" : "Novo fornecedor"}</h1>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-8">
          <TabsTrigger value="dados" className="text-xs h-6">Dados da Empresa</TabsTrigger>
          <TabsTrigger value="m1" className="text-xs h-6">Motorista 1</TabsTrigger>
          <TabsTrigger value="m2" className="text-xs h-6">Motorista 2</TabsTrigger>
        </TabsList>

        <TabsContent value="dados">
          <Card className="p-3 space-y-3">
            <div>
              <h3 className="font-medium mb-2 text-[13px]">Identificação</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1 col-span-2"><Label className={lbl}>Razão Social</Label>
                  <Input className={inp} value={forn.razao_social} onChange={(e) => setForn({ ...forn, razao_social: e.target.value })} /></div>
                <div className="space-y-1"><Label className={lbl}>CNPJ</Label>
                  <Input className={inp} value={forn.cnpj} onChange={(e) => setForn({ ...forn, cnpj: e.target.value })} /></div>
                <div className="space-y-1"><Label className={lbl}>Contato principal</Label>
                  <Input className={inp} value={forn.contato_principal} onChange={(e) => setForn({ ...forn, contato_principal: e.target.value })} /></div>
                <div className="space-y-1"><Label className={lbl}>Telefone</Label>
                  <Input className={inp} value={forn.telefone} onChange={(e) => setForn({ ...forn, telefone: e.target.value })} /></div>
                <div className="space-y-1"><Label className={lbl}>Email</Label>
                  <Input className={inp} type="email" value={forn.email} onChange={(e) => setForn({ ...forn, email: e.target.value })} /></div>
                <div className="space-y-1"><Label className={lbl}>Status</Label>
                  <div className="flex items-center gap-2 h-7">
                    <Switch
                      checked={forn.status === "ativo"}
                      onCheckedChange={(v) => setForn({ ...forn, status: v ? "ativo" : "inativo", fornecedor_ativo_sim_nao: v })}
                    />
                    <span className="text-xs">{forn.status === "ativo" ? "Ativo" : "Inativo"}</span>
                  </div>
                </div>
                <div className="col-span-2 flex items-center gap-2 rounded border border-blue-200 bg-blue-50 px-2 py-1.5">
                  <input
                    id="fornecedor_padrao"
                    type="checkbox"
                    className="h-4 w-4 accent-blue-700"
                    checked={forn.fornecedor_padrao}
                    onChange={(e) => setForn({ ...forn, fornecedor_padrao: e.target.checked })}
                  />
                  <label htmlFor="fornecedor_padrao" className="text-xs">
                    <span className="font-semibold">Fornecedor Padrão</span>
                    <span className="text-muted-foreground"> — será pré-selecionado em todos os módulos com campo Fornecedor (pode ser alterado).</span>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2 text-[13px]">Endereço</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1 col-span-2"><Label className={lbl}>Endereço</Label>
                  <Input className={inp} value={forn.endereco} onChange={(e) => setForn({ ...forn, endereco: e.target.value })} /></div>
                <div className="space-y-1"><Label className={lbl}>Bairro</Label>
                  <Input className={inp} value={forn.bairro} onChange={(e) => setForn({ ...forn, bairro: e.target.value })} /></div>
                <div className="space-y-1"><Label className={lbl}>CEP</Label>
                  <Input className={inp} value={forn.cep} onChange={(e) => setForn({ ...forn, cep: e.target.value })} /></div>
                <div className="space-y-1"><Label className={lbl}>Cidade</Label>
                  <Input className={inp} value={forn.cidade_endereco} onChange={(e) => setForn({ ...forn, cidade_endereco: e.target.value, cidade: e.target.value })} /></div>
                <div className="space-y-1"><Label className={lbl}>Estado</Label>
                  <Input className={inp} value={forn.estado} onChange={(e) => setForn({ ...forn, estado: e.target.value })} /></div>
                <div className="space-y-1"><Label className={lbl}>UF</Label>
                  <Input className={inp} maxLength={2} value={forn.estado_uf} onChange={(e) => setForn({ ...forn, estado_uf: e.target.value.toUpperCase() })} /></div>
                <div className="space-y-1"><Label className={lbl}>Cidade (cadastro)</Label>
                  <Input className={inp} value={forn.cidade} onChange={(e) => setForn({ ...forn, cidade: e.target.value })} /></div>
                <div className="space-y-1"><Label className={lbl}>Estado (cadastro)</Label>
                  <Input className={inp} value={forn.estado} onChange={(e) => setForn({ ...forn, estado: e.target.value })} /></div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <MotoristaTab value="m1" m={m1} onChange={setM1} title="Motorista 1" />
        <MotoristaTab value="m2" m={m2} onChange={setM2} title="Motorista 2" />
      </Tabs>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => router.navigate({ to: "/fornecedores" })}>Cancelar</Button>
        <Button size="sm" onClick={save} disabled={saving}>{isEdit ? "Salvar" : "Criar"}</Button>
      </div>
    </div>
  );
}

