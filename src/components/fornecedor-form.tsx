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
  fornecedor_ativo_sim_nao: boolean;
};

type Motorista = {
  id?: string; nome_completo: string; cpf: string; celular: string; email: string;
  tipo_contato: "motorista1" | "motorista2";
};

const emptyFornecedor: Fornecedor = {
  razao_social: "", cnpj: "", cidade: "", estado: "", contato_principal: "",
  status: "ativo", telefone: "", email: "", endereco: "", bairro: "",
  cidade_endereco: "", estado_uf: "", cep: "", fornecedor_ativo_sim_nao: true,
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
      if (isEdit) {
        const { error } = await supabase.from("fornecedores").update(payload).eq("id", id!);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("fornecedores").insert(payload).select("id").single();
        if (error) throw error;
        id = data.id;
      }

      // Upsert motoristas (apenas se preenchidos)
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
      <Card className="p-6">
        <h3 className="font-medium mb-4">{title}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2 col-span-2"><Label>Nome completo</Label>
            <Input value={m.nome_completo} onChange={(e) => onChange({ ...m, nome_completo: e.target.value })} /></div>
          <div className="space-y-2"><Label>CPF</Label>
            <Input value={m.cpf} onChange={(e) => onChange({ ...m, cpf: e.target.value })} /></div>
          <div className="space-y-2"><Label>Celular</Label>
            <Input value={m.celular} onChange={(e) => onChange({ ...m, celular: e.target.value })} /></div>
          <div className="space-y-2 col-span-2"><Label>Email</Label>
            <Input type="email" value={m.email} onChange={(e) => onChange({ ...m, email: e.target.value })} /></div>
        </div>
      </Card>
    </TabsContent>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackButton to="/fornecedores" />
          <h1 className="text-2xl font-semibold">{isEdit ? "Editar fornecedor" : "Novo fornecedor"}</h1>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="dados">Dados da Empresa</TabsTrigger>
          <TabsTrigger value="m1">Motorista 1</TabsTrigger>
          <TabsTrigger value="m2">Motorista 2</TabsTrigger>
        </TabsList>

        <TabsContent value="dados">
          <Card className="p-6 space-y-6">
            <div>
              <h3 className="font-medium mb-4">Identificação</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2"><Label>Razão Social</Label>
                  <Input value={forn.razao_social} onChange={(e) => setForn({ ...forn, razao_social: e.target.value })} /></div>
                <div className="space-y-2"><Label>CNPJ</Label>
                  <Input value={forn.cnpj} onChange={(e) => setForn({ ...forn, cnpj: e.target.value })} /></div>
                <div className="space-y-2"><Label>Contato principal</Label>
                  <Input value={forn.contato_principal} onChange={(e) => setForn({ ...forn, contato_principal: e.target.value })} /></div>
                <div className="space-y-2"><Label>Telefone</Label>
                  <Input value={forn.telefone} onChange={(e) => setForn({ ...forn, telefone: e.target.value })} /></div>
                <div className="space-y-2"><Label>Email</Label>
                  <Input type="email" value={forn.email} onChange={(e) => setForn({ ...forn, email: e.target.value })} /></div>
                <div className="space-y-2"><Label>Status</Label>
                  <div className="flex items-center gap-2 h-9">
                    <Switch
                      checked={forn.status === "ativo"}
                      onCheckedChange={(v) => setForn({ ...forn, status: v ? "ativo" : "inativo", fornecedor_ativo_sim_nao: v })}
                    />
                    <span className="text-sm">{forn.status === "ativo" ? "Ativo" : "Inativo"}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-4">Endereço</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2"><Label>Endereço</Label>
                  <Input value={forn.endereco} onChange={(e) => setForn({ ...forn, endereco: e.target.value })} /></div>
                <div className="space-y-2"><Label>Bairro</Label>
                  <Input value={forn.bairro} onChange={(e) => setForn({ ...forn, bairro: e.target.value })} /></div>
                <div className="space-y-2"><Label>CEP</Label>
                  <Input value={forn.cep} onChange={(e) => setForn({ ...forn, cep: e.target.value })} /></div>
                <div className="space-y-2"><Label>Cidade</Label>
                  <Input value={forn.cidade_endereco} onChange={(e) => setForn({ ...forn, cidade_endereco: e.target.value, cidade: e.target.value })} /></div>
                <div className="space-y-2"><Label>Estado</Label>
                  <Input value={forn.estado} onChange={(e) => setForn({ ...forn, estado: e.target.value })} /></div>
                <div className="space-y-2"><Label>UF</Label>
                  <Input maxLength={2} value={forn.estado_uf} onChange={(e) => setForn({ ...forn, estado_uf: e.target.value.toUpperCase() })} /></div>
                <div className="space-y-2"><Label>Cidade (cadastro)</Label>
                  <Input value={forn.cidade} onChange={(e) => setForn({ ...forn, cidade: e.target.value })} /></div>
                <div className="space-y-2"><Label>Estado (cadastro)</Label>
                  <Input value={forn.estado} onChange={(e) => setForn({ ...forn, estado: e.target.value })} /></div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <MotoristaTab value="m1" m={m1} onChange={setM1} title="Motorista 1" />
        <MotoristaTab value="m2" m={m2} onChange={setM2} title="Motorista 2" />
      </Tabs>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.navigate({ to: "/fornecedores" })}>Cancelar</Button>
        <Button onClick={save} disabled={saving}>{isEdit ? "Salvar" : "Criar"}</Button>
      </div>
    </div>
  );
}
