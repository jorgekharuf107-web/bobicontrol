import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BackButton } from "@/components/back-button";
import { confirmarExclusao } from "@/components/confirm-dialog";

export const Route = createFileRoute("/_authenticated/admin/alertas")({
  head: () => ({
    meta: [
      { title: "Configuração de Alertas | Bobi Control" },
      { name: "description", content: "Configure alertas de estoque baixo por linha e destinatários de notificação no Bobi Control." },
      { property: "og:title", content: "Configuração de Alertas | Bobi Control" },
      { property: "og:description", content: "Configure alertas de estoque baixo por linha e destinatários de notificação no Bobi Control." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/admin/alertas" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "/admin/alertas" }],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
    const isAdmin = roles?.some((r: any) => r.role === "admin" || r.role === "super_admin");
    if (!isAdmin) throw redirect({ to: "/dashboard" });
  },
  component: AlertasPage,
});

const empty = {
  nome_configuracao: "", tipo_alerta: "nivel_baixo", nivel_alerta_percentual: 20,
  frequencia_envio_horas: 24, destinatarios_email: "", mensagem_personalizada: "",
  configuracao_ativa: true, enviar_por_email: true,
};

function AlertasPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(empty);

  const { data: alertas = [] } = useQuery({
    queryKey: ["alertas"],
    queryFn: async () => (await supabase.from("configuracao_alertas").select("*").order("nome_configuracao")).data ?? [],
  });

  function startCreate() { setEditing(null); setForm(empty); setOpen(true); }
  function startEdit(a: any) {
    setEditing(a);
    setForm({ ...a, destinatarios_email: (a.destinatarios_email ?? []).join(", ") });
    setOpen(true);
  }
  async function save() {
    if (!form.nome_configuracao.trim()) return toast.error("Informe o nome");
    const payload = {
      ...form,
      destinatarios_email: form.destinatarios_email.split(",").map(s => s.trim()).filter(Boolean),
    };
    const { error } = editing
      ? await supabase.from("configuracao_alertas").update(payload).eq("id", editing.id)
      : await supabase.from("configuracao_alertas").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Alerta atualizado" : "Alerta criado");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["alertas"] });
  }
  async function remove(id: string) {
    if (!(await confirmarExclusao("configuração"))) return;
    await supabase.from("configuracao_alertas").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["alertas"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><BackButton to="/dashboard" /><h1 className="text-2xl font-semibold">Configuração de Alertas</h1></div>
        <Button onClick={startCreate}><Plus className="h-4 w-4" /> Nova configuração</Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Nome</TableHead><TableHead>Tipo</TableHead><TableHead>Nível %</TableHead>
            <TableHead>Frequência (h)</TableHead><TableHead>Ativa</TableHead><TableHead className="text-right">Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {alertas.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma configuração.</TableCell></TableRow>
            )}
            {alertas.map((a: any) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.nome_configuracao}</TableCell>
                <TableCell>{a.tipo_alerta}</TableCell>
                <TableCell>{a.nivel_alerta_percentual}%</TableCell>
                <TableCell>{a.frequencia_envio_horas}h</TableCell>
                <TableCell>{a.configuracao_ativa ? "Sim" : "Não"}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => startEdit(a)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(a.id)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Editar configuração" : "Nova configuração"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2"><Label>Nome da configuração</Label>
              <Input value={form.nome_configuracao} onChange={(e) => setForm({ ...form, nome_configuracao: e.target.value })} /></div>
            <div className="space-y-2"><Label>Tipo de alerta</Label>
              <Input value={form.tipo_alerta} onChange={(e) => setForm({ ...form, tipo_alerta: e.target.value })} /></div>
            <div className="space-y-2"><Label>Nível (%)</Label>
              <Input type="number" className="h-9 w-28" value={form.nivel_alerta_percentual}
                onChange={(e) => setForm({ ...form, nivel_alerta_percentual: +e.target.value })} /></div>
            <div className="space-y-2"><Label>Frequência (horas)</Label>
              <Input type="number" min={0} className="h-9 w-28" value={form.frequencia_envio_horas}
                onChange={(e) => setForm({ ...form, frequencia_envio_horas: Math.max(0, +e.target.value || 0) })} /></div>
            <div className="space-y-2 col-span-2"><Label>Destinatários</Label>
              <Textarea
                rows={3}
                placeholder="Ex: tecnico1@email.com, tecnico2@email.com"
                value={form.destinatarios_email}
                onChange={(e) => setForm({ ...form, destinatarios_email: e.target.value })} />
              <p className="text-[11px] text-muted-foreground">Separe cada e-mail por vírgula</p></div>

            <div className="space-y-2 col-span-2"><Label>Mensagem personalizada</Label>
              <Textarea value={form.mensagem_personalizada}
                onChange={(e) => setForm({ ...form, mensagem_personalizada: e.target.value })} /></div>
            <div className="flex items-center gap-2">
              <Switch checked={form.configuracao_ativa} onCheckedChange={(v) => setForm({ ...form, configuracao_ativa: v })} />
              <Label>Configuração ativa</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.enviar_por_email} onCheckedChange={(v) => setForm({ ...form, enviar_por_email: v })} />
              <Label>Enviar por email</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>{editing ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
