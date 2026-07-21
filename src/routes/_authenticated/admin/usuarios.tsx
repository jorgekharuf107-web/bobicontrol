import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Plus, Trash2, Copy, Pencil, KeyRound, MapPin, UserPlus, Settings2, Mail, Save } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BackButton } from "@/components/back-button";
import { CsvExportButton } from "@/components/csv-export-button";
import { useCurrentUser } from "@/lib/use-current-user";
import { useServerFn } from "@tanstack/react-start";
import { adminCreateUser, adminResetPassword } from "@/lib/admin.functions";

type Papel = "admin_geral" | "supervisor_linha" | "tecnico_estacao" | "dispatcher";
const PAPEIS: Papel[] = ["admin_geral", "supervisor_linha", "tecnico_estacao", "dispatcher"];
const LABEL: Record<string, string> = {
  admin_geral: "Administrador",
  supervisor_linha: "Supervisor de Linha",
  tecnico_estacao: "Técnico de Estação",
  dispatcher: "Dispatcher",
  // Mascaramento: SUPER_ADMIN nunca é exibido, aparece como "Administrador"
  SUPER_ADMIN: "Administrador",
};

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const [{ data: isAdmin }, { data: isGestor }, { data: isDispatcher }] = await Promise.all([
      supabase.rpc("e_admin", { _user_id: data.user.id }),
      supabase.rpc("e_gestor", { _user_id: data.user.id }),
      supabase.rpc("e_dispatcher", { _user_id: data.user.id }),
    ]);
    if (!isAdmin && !isGestor && !isDispatcher) throw redirect({ to: "/dashboard" });
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <BackButton to="/dashboard" />
        <h1 className="text-2xl font-semibold">Usuários</h1>
      </div>

      <Tabs defaultValue="usuarios">
        <TabsList>
          <TabsTrigger value="usuarios"><UserPlus className="h-4 w-4 mr-1" /> Usuários</TabsTrigger>
          <TabsTrigger value="config"><Settings2 className="h-4 w-4 mr-1" /> Configurações do Sistema</TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="space-y-4">
          <AbaUsuarios qc={qc} isSuperAdmin={isSuperAdmin} />
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <AbaConfiguracoes />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AbaUsuarios({ qc, isSuperAdmin }: { qc: ReturnType<typeof useQueryClient>; isSuperAdmin: boolean }) {
  const createUser = useServerFn(adminCreateUser);
  const resetPwd = useServerFn(adminResetPassword);

  const [openCreate, setOpenCreate] = useState(false);
  const [novo, setNovo] = useState<{ nome: string; email: string; senha: string; perfil: Papel; ativo: boolean }>({
    nome: "", email: "", senha: "", perfil: "tecnico_estacao", ativo: true,
  });
  const [openInvite, setOpenInvite] = useState(false);
  const [invite, setInvite] = useState<{ email_convidado: string; perfil_convidado: Papel }>({
    email_convidado: "", perfil_convidado: "tecnico_estacao",
  });
  const [editing, setEditing] = useState<any | null>(null);
  const [vinculando, setVinculando] = useState<any | null>(null);
  const [linhasSelecionadas, setLinhasSelecionadas] = useState<Set<string>>(new Set());
  const [resetTarget, setResetTarget] = useState<any | null>(null);
  const [novaSenha, setNovaSenha] = useState("");

  const { data: linhas = [] } = useQuery({
    queryKey: ["linhas-vinc"],
    queryFn: async () => (await supabase.from("linhas").select("id, nome, cor_hex").eq("linha_ativa_sim_nao", true).order("nome")).data ?? [],
  });

  const { data: usuariosRaw = [] } = useQuery({
    queryKey: ["usuarios"],
    queryFn: async () => (await supabase.from("usuarios").select("*").order("nome_completo")).data ?? [],
  });
  // Mascaramento: SUPER_ADMIN só é visível para outros SUPER_ADMINs.
  const usuarios = isSuperAdmin ? usuariosRaw : usuariosRaw.filter((u: any) => u.perfil !== "SUPER_ADMIN");

  const { data: convites = [] } = useQuery({
    queryKey: ["convites"],
    queryFn: async () => (await supabase.from("convites").select("*").order("criado_em", { ascending: false })).data ?? [],
  });

  async function criarUsuario() {
    if (!novo.nome.trim() || !novo.email.trim() || !novo.senha) {
      return toast.error("Preencha nome, email e senha");
    }
    try {
      await createUser({ data: novo });
      toast.success("Usuário criado com sucesso");
      setOpenCreate(false);
      setNovo({ nome: "", email: "", senha: "", perfil: "tecnico_estacao", ativo: true });
      qc.invalidateQueries({ queryKey: ["usuarios"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao criar usuário");
    }
  }

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

  async function enviarResetEmail(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) return toast.error(error.message);
    toast.success(`Email de redefinição enviado para ${email}`);
  }

  async function resetarSenhaDireto() {
    if (!resetTarget || !novaSenha) return;
    try {
      await resetPwd({ data: { user_id: resetTarget.id, nova_senha: novaSenha } });
      toast.success("Senha redefinida");
      setResetTarget(null);
      setNovaSenha("");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao redefinir senha");
    }
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
    <>
      <div className="flex items-center justify-between gap-2 flex-wrap">
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
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setOpenInvite(true)}><Plus className="h-4 w-4" /> Convidar (link)</Button>
          <Button onClick={() => setOpenCreate(true)}><UserPlus className="h-4 w-4" /> Novo usuário</Button>
        </div>
      </div>

      <div className="rounded-md border-l-4 border-l-yellow-400 bg-yellow-50 p-3" style={{ fontFamily: "Arial, sans-serif" }}>
        <p className="text-red-600" style={{ fontSize: "13px" }}>
          <span className="font-bold">NOTA:</span>{" "}
          <span style={{ fontSize: "10pt" }}>O email do usuário não pode ser alterado após o cadastro.</span>
        </p>
      </div>

      <Card className="p-0 overflow-hidden">
        <h3 className="px-4 py-3 font-medium border-b">Usuários cadastrados</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Nome</TableHead><TableHead>Email</TableHead>
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
                  <TableCell className="text-right whitespace-nowrap">
                    <Button variant="ghost" size="icon" title="Editar" onClick={() => setEditing({ ...u })}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Vincular linhas" onClick={() => abrirVinculo(u)}>
                      <MapPin className="h-4 w-4" />
                    </Button>
                    {isSuperAdmin ? (
                      <Button variant="ghost" size="icon" title="Redefinir senha" onClick={() => { setResetTarget(u); setNovaSenha(""); }}>
                        <KeyRound className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" title="Enviar email de redefinição" onClick={() => enviarResetEmail(u.email)}>
                        <KeyRound className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <h3 className="px-4 py-3 font-medium border-b">Convites</h3>
        <div className="overflow-x-auto">
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
        </div>
      </Card>

      {/* Novo usuário (com senha) */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo usuário</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Nome completo</Label>
              <Input className="h-9" value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Email</Label>
              <Input type="email" className="h-9" value={novo.email} onChange={(e) => setNovo({ ...novo, email: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Função</Label>
              <Select value={novo.perfil} onValueChange={(v: Papel) => setNovo({ ...novo, perfil: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{PAPEIS.map((p) => <SelectItem key={p} value={p}>{LABEL[p]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Criar senha</Label>
              <Input type="password" className="h-9" placeholder="Mínimo 6 caracteres"
                value={novo.senha} onChange={(e) => setNovo({ ...novo, senha: e.target.value })} /></div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div><Label>Ativo</Label>
                <p className="text-xs text-muted-foreground">Usuário inativo não acessa o sistema.</p>
              </div>
              <Switch checked={novo.ativo} onCheckedChange={(v) => setNovo({ ...novo, ativo: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>Cancelar</Button>
            <Button onClick={criarUsuario}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convidar */}
      <Dialog open={openInvite} onOpenChange={setOpenInvite}>
        <DialogContent>
          <DialogHeader><DialogTitle>Convidar novo usuário</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Email</Label>
              <Input type="email" className="h-9" value={invite.email_convidado}
                onChange={(e) => setInvite({ ...invite, email_convidado: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Função</Label>
              <Select value={invite.perfil_convidado} onValueChange={(v: Papel) => setInvite({ ...invite, perfil_convidado: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAPEIS.map((p) => <SelectItem key={p} value={p}>{LABEL[p]}</SelectItem>)}
                </SelectContent>
              </Select></div>
            <p className="text-xs text-muted-foreground">
              Gera um link de convite. O usuário aceita e entra com Google usando o mesmo email.
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
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>Email</Label>
                <Input className="h-9" value={editing.email} disabled /></div>
              <div className="space-y-1.5"><Label>Nome completo</Label>
                <Input className="h-9" value={editing.nome_completo}
                  onChange={(e) => setEditing({ ...editing, nome_completo: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Função</Label>
                <Select value={editing.perfil} onValueChange={(v: Papel) => setEditing({ ...editing, perfil: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
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

      {/* Redefinir senha (SUPER_ADMIN) */}
      <Dialog open={!!resetTarget} onOpenChange={(o) => !o && setResetTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Redefinir senha — {resetTarget?.nome_completo}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Nova senha</Label>
              <Input type="password" className="h-9" placeholder="Mínimo 6 caracteres"
                value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} /></div>
            <p className="text-xs text-muted-foreground">A nova senha entra em vigor imediatamente.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)}>Cancelar</Button>
            <Button onClick={resetarSenhaDireto}>Redefinir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vincular linhas */}
      <Dialog open={!!vinculando} onOpenChange={(o) => !o && setVinculando(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Vincular linhas — {vinculando?.nome_completo}</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {linhas.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma linha ativa cadastrada.</p>}
            {linhas.map((l: any) => {
              const checked = linhasSelecionadas.has(l.id);
              return (
                <label key={l.id} className="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-accent">
                  <Checkbox checked={checked} onCheckedChange={(v) => {
                    const s = new Set(linhasSelecionadas);
                    if (v) s.add(l.id); else s.delete(l.id);
                    setLinhasSelecionadas(s);
                  }} />
                  <span className="inline-block h-3 w-3 rounded-full border" style={{ background: l.cor_hex ?? "#ccc" }} />
                  <span>{l.nome}</span>
                </label>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVinculando(null)}>Cancelar</Button>
            <Button onClick={salvarVinculo}>Salvar vínculos</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// -------- Aba Configurações do Sistema --------
function AbaConfiguracoes() {
  const qc = useQueryClient();
  const { user } = useCurrentUser();

  const { data: cfg } = useQuery({
    queryKey: ["email-config"],
    queryFn: async () => (await supabase.from("email_config").select("*").limit(1).maybeSingle()).data,
  });

  const [sender, setSender] = useState("jorgekharuf107@gmail.com");
  const [password, setPassword] = useState("");
  const [emailAtivo, setEmailAtivo] = useState(true);
  const [saving, setSaving] = useState(false);

  // Configs UI (persistidas em localStorage, aplicadas globalmente)
  const [darkMode, setDarkMode] = useState(false);
  const [notificacoes, setNotificacoes] = useState(true);
  const [alertasEstoque, setAlertasEstoque] = useState(true);
  const [autoAprovarPermuta, setAutoAprovarPermuta] = useState(false);

  useEffect(() => {
    if (cfg) {
      setSender(cfg.sender_email ?? "jorgekharuf107@gmail.com");
      setEmailAtivo(cfg.ativo ?? true);
      setPassword("");
    }
  }, [cfg]);

  useEffect(() => {
    try {
      setDarkMode(localStorage.getItem("bobi.darkMode") === "true");
      setNotificacoes(localStorage.getItem("bobi.notificacoes") !== "false");
      setAlertasEstoque(localStorage.getItem("bobi.alertasEstoque") !== "false");
      setAutoAprovarPermuta(localStorage.getItem("bobi.autoAprovarPermuta") === "true");
    } catch {}
  }, []);

  function saveFlag(key: string, value: boolean, setter: (v: boolean) => void) {
    setter(value);
    try { localStorage.setItem(key, String(value)); } catch {}
    toast.success("Configuração salva");
  }

  async function salvarEmail() {
    setSaving(true);
    const payload: any = {
      sender_email: sender.trim(),
      ativo: emailAtivo,
      atualizado_em: new Date().toISOString(),
      atualizado_por: user?.id ?? null,
    };
    if (password.trim()) payload.app_password = password.trim();

    let error;
    if (cfg?.id) ({ error } = await supabase.from("email_config").update(payload).eq("id", cfg.id));
    else ({ error } = await supabase.from("email_config").insert(payload));
    setSaving(false);
    if (error) return toast.error(error.message);
    setPassword("");
    toast.success("Configurações de email salvas");
    qc.invalidateQueries({ queryKey: ["email-config"] });
  }

  const flags: Array<{ key: string; label: string; desc: string; value: boolean; setter: (v: boolean) => void }> = [
    { key: "bobi.notificacoes", label: "Notificações do sistema", desc: "Exibe toasts e alertas na interface.", value: notificacoes, setter: setNotificacoes },
    { key: "bobi.alertasEstoque", label: "Alertas de estoque baixo", desc: "Destaca ATMs com nível abaixo do mínimo.", value: alertasEstoque, setter: setAlertasEstoque },
    { key: "bobi.autoAprovarPermuta", label: "Aprovação automática de permutas", desc: "Permutas dentro da mesma linha ficam pré-aprovadas.", value: autoAprovarPermuta, setter: setAutoAprovarPermuta },
    { key: "bobi.darkMode", label: "Modo escuro por padrão", desc: "Aplica o tema escuro em novos acessos.", value: darkMode, setter: setDarkMode },
  ];

  return (
    <>
      <Card className="p-5 space-y-4 max-w-3xl">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          <h3 className="font-medium">Envio de E-mail (SMTP Google)</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Email remetente</Label>
            <Input className="h-9" value={sender} onChange={(e) => setSender(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Senha de App do Google</Label>
            <Input type="password" className="h-9"
              placeholder={cfg?.app_password ? "•••••••• (mantida se em branco)" : "Cole a senha de app"}
              value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <Label>Envio de e-mails ativo</Label>
            <p className="text-xs text-muted-foreground">Desativar interrompe todos os envios automáticos.</p>
          </div>
          <Switch checked={emailAtivo} onCheckedChange={setEmailAtivo} />
        </div>
        <div>
          <Button onClick={salvarEmail} disabled={saving}><Save className="h-4 w-4" /> Salvar E-mail</Button>
        </div>
      </Card>

      <Card className="p-5 space-y-3 max-w-3xl">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4" />
          <h3 className="font-medium">Preferências do Sistema</h3>
        </div>
        <div className="grid gap-2">
          {flags.map((f) => (
            <div key={f.key} className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label>{f.label}</Label>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
              <Switch checked={f.value} onCheckedChange={(v) => saveFlag(f.key, v, f.setter)} />
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
