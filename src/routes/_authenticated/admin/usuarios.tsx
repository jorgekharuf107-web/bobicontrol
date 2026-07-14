import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Copy, Pencil, KeyRound, MapPin } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BackButton } from "@/components/back-button";
import { CsvExportButton } from "@/components/csv-export-button";
import { useCurrentUser } from "@/lib/use-current-user";

type Papel = "admin_geral" | "supervisor_linha" | "tecnico_estacao" | "dispatcher";
const PAPEIS: Papel[] = ["admin_geral", "supervisor_linha", "tecnico_estacao", "dispatcher"];
const LABEL: Record<string, string> = {
  admin_geral: "Administrador",
  supervisor_linha: "Supervisor de Linha",
  tecnico_estacao: "Técnico de Estação",
  dispatcher: "Dispatcher",
  SUPER_ADMIN: "Administrador",
};

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const { data: isAdmin } = await supabase.rpc("e_admin", { _user_id: data.user.id });
    if (!isAdmin) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: UsuariosPage,
});

function badgeColor(p: string) {
  if (p === "admin_geral" || p === "SUPER_ADMIN") return "bg-red-100 text-red-800 border-red-200";
  if (p === "supervisor_linha" || p === "dispatcher") return "bg-blue-100 text-blue-800 border-blue-200";
  return "bg-green-100 text-green-800 border-green-200";
}


function UsuariosPage() {
  const qc = useQueryClient();
  const { isSuperAdmin } = useCurrentUser();
  const [openInvite, setOpenInvite] = useState(false);
  const [invite, setInvite] = useState<{ email_convidado: string; perfil_convidado: Papel }>({
    email_convidado: "", perfil_convidado: "tecnico_estacao",
  });
  const [editing, setEditing] = useState<any | null>(null);
  const [vinculando, setVinculando] = useState<any | null>(null);
  const [linhasSelecionadas, setLinhasSelecionadas] = useState<Set<string>>(new Set());

  const { data: linhas = [] } = useQuery({
    queryKey: ["linhas-vinc"],
    queryFn: async () => (await supabase.from("linhas").select("id, nome, cor_hex").eq("linha_ativa_sim_nao", true).order("nome")).data ?? [],
  });

  async function abrirVinculo(u: any) {
    setVinculando(u);
    const { data } = await supabase.from("usuario_linhas").select("linha_id").eq("usuario_id", u.id);
    setLinhasSelecionadas(new Set((data ?? []).map((r: any) => r.linha_id)));
  }

  async function salvarVinculo() {
    if (!vinculando) return;
    const { error: delErr } = await supabase.from("usuario_linhas").delete().eq("usuario_id", vinculando.id);
    if (delErr) return toast.error(delErr.message);
    const rows = Array.from(linhasSelecionadas).map((linha_id) => ({ usuario_id: vinculando.id, linha_id }));
    if (rows.length > 0) {
      const { error } = await supabase.from("usuario_linhas").insert(rows);
      if (error) return toast.error(error.message);
    }
    toast.success("Linhas vinculadas");
    setVinculando(null);
  }

  const { data: usuariosRaw = [] } = useQuery({
    queryKey: ["usuarios"],
    queryFn: async () => (await supabase.from("usuarios").select("*").order("nome_completo")).data ?? [],
  });
  const usuarios = isSuperAdmin ? usuariosRaw : usuariosRaw.filter((u: any) => u.perfil !== "SUPER_ADMIN");
  const { data: convites = [] } = useQuery({
    queryKey: ["convites"],
    queryFn: async () => (await supabase.from("convites").select("*").order("criado_em", { ascending: false })).data ?? [],
  });

  async function sendInvite() {
    if (!invite.email_convidado.trim()) return toast.error("Informe o email");
    const { data, error } = await supabase.from("convites").insert(invite).select("token").single();
    if (error) return toast.error(error.message);
    const url = `${window.location.origin}/aceitar-convite/${data.token}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    toast.success("Convite criado", { description: "Link copiado para a área de transferência." });
    setOpenInvite(false);
    setInvite({ email_convidado: "", perfil_convidado: "tecnico_estacao" });
    qc.invalidateQueries({ queryKey: ["convites"] });
  }

  async function saveEdit() {
    if (!editing) return;
    const { error } = await supabase.from("usuarios").update({
      nome_completo: editing.nome_completo,
      perfil: editing.perfil,
      ativo: editing.ativo,
    }).eq("id", editing.id);
    if (error) return toast.error(error.message);
    toast.success("Usuário atualizado");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["usuarios"] });
  }

  async function resetSenha(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) return toast.error(error.message);
    toast.success(`Email de redefinição enviado para ${email}`);
  }

  async function copyLink(token: string) {
    const url = `${window.location.origin}/aceitar-convite/${token}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado");
  }

  async function deleteConvite(id: string) {
    if (!confirm("Excluir este convite?")) return;
    await supabase.from("convites").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["convites"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3"><BackButton to="/dashboard" /><h1 className="text-2xl font-semibold">Usuários</h1></div>
        <div className="flex items-center gap-2">
          <CsvExportButton
            rows={usuarios}
            columns={[
              { header: "Nome Completo", accessor: (u: any) => u.nome_completo ?? "" },
              { header: "Email", accessor: (u: any) => u.email },
              { header: "Papel", accessor: (u: any) => LABEL[u.perfil] ?? u.perfil },
              { header: "Ativo", accessor: (u: any) => (u.ativo ? "Sim" : "Não") },
              { header: "Cadastrado em", accessor: (u: any) => new Date(u.data_cadastro).toLocaleDateString("pt-BR") },
            ]}
            filename="usuarios"
          />
          <Button onClick={() => setOpenInvite(true)}><Plus className="h-4 w-4" /> Convidar usuário</Button>
        </div>
      </div>

      <div className="rounded-md border-l-4 border-l-yellow-400 bg-yellow-50 p-3"
        style={{ fontFamily: "Arial, sans-serif" }}>
        <p className="text-red-600" style={{ fontSize: "13px" }}>
          <span className="font-bold">NOTA:</span>{" "}
          <span style={{ fontSize: "10pt" }}>O email do usuário não pode ser alterado após o cadastro.</span>
        </p>
      </div>

      <Card className="p-0 overflow-hidden">
        <h3 className="px-4 py-3 font-medium border-b">Usuários cadastrados</h3>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Nome Completo</TableHead><TableHead>Email</TableHead>
            <TableHead>Papel</TableHead><TableHead>Ativo</TableHead>
            <TableHead>Cadastrado em</TableHead><TableHead className="text-right">Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {usuarios.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum usuário cadastrado.</TableCell></TableRow>
            )}
            {usuarios.map((u: any) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.nome_completo}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={badgeColor(u.perfil)}>{LABEL[u.perfil] ?? u.perfil}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={u.ativo ? "bg-green-100 text-green-800 border-green-200" : "bg-gray-100 text-gray-700 border-gray-200"}>
                    {u.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(u.data_cadastro).toLocaleDateString("pt-BR")}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" title="Editar" onClick={() => setEditing({ ...u })}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Vincular linhas" onClick={() => abrirVinculo(u)}>
                    <MapPin className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Resetar senha" onClick={() => resetSenha(u.email)}>
                    <KeyRound className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card className="p-0 overflow-hidden">
        <h3 className="px-4 py-3 font-medium border-b">Convites</h3>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Email</TableHead><TableHead>Papel</TableHead><TableHead>Status</TableHead>
            <TableHead>Expira em</TableHead><TableHead className="text-right">Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {convites.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum convite enviado.</TableCell></TableRow>
            )}
            {convites.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell>{c.email_convidado}</TableCell>
                <TableCell>{LABEL[c.perfil_convidado] ?? c.perfil_convidado}</TableCell>
                <TableCell>{c.status}</TableCell>
                <TableCell>{new Date(c.expira_em).toLocaleDateString("pt-BR")}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => copyLink(c.token)}><Copy className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteConvite(c.id)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Convidar */}
      <Dialog open={openInvite} onOpenChange={setOpenInvite}>
        <DialogContent>
          <DialogHeader><DialogTitle>Convidar novo usuário</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Email</Label>
              <Input type="email" value={invite.email_convidado}
                onChange={(e) => setInvite({ ...invite, email_convidado: e.target.value })} /></div>
            <div className="space-y-2"><Label>Papel</Label>
              <Select value={invite.perfil_convidado} onValueChange={(v: Papel) => setInvite({ ...invite, perfil_convidado: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAPEIS.map((p) => <SelectItem key={p} value={p}>{LABEL[p]}</SelectItem>)}

                </SelectContent>
              </Select></div>
            <p className="text-xs text-muted-foreground">
              Um link de convite será gerado. O usuário deve aceitar e entrar com Google usando o mesmo email.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenInvite(false)}>Cancelar</Button>
            <Button onClick={sendInvite}>Criar convite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editar */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar usuário</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-2"><Label>Email</Label>
                <Input value={editing.email} disabled /></div>
              <div className="space-y-2"><Label>Nome completo</Label>
                <Input value={editing.nome_completo}
                  onChange={(e) => setEditing({ ...editing, nome_completo: e.target.value })} /></div>
              <div className="space-y-2"><Label>Papel</Label>
                <Select value={editing.perfil} onValueChange={(v: Papel) => setEditing({ ...editing, perfil: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAPEIS.map((p) => <SelectItem key={p} value={p}>{LABEL[p]}</SelectItem>)}
                  </SelectContent>
                </Select></div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div><Label>Ativo</Label>
                  <p className="text-xs text-muted-foreground">Usuário inativo não pode acessar o sistema.</p>
                </div>
                <Switch checked={editing.ativo} onCheckedChange={(v) => setEditing({ ...editing, ativo: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={saveEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
