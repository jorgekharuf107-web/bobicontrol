import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BackButton } from "@/components/back-button";

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
    const isAdmin = roles?.some((r: any) => r.role === "admin" || r.role === "super_admin");
    if (!isAdmin) throw redirect({ to: "/dashboard" });
  },
  component: UsuariosPage,
});

function UsuariosPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [invite, setInvite] = useState({ email_convidado: "", perfil_convidado: "Usuário" as const });

  const { data: usuarios = [] } = useQuery({
    queryKey: ["usuarios"],
    queryFn: async () => (await supabase.from("usuarios").select("*").order("nome_completo")).data ?? [],
  });
  const { data: convites = [] } = useQuery({
    queryKey: ["convites"],
    queryFn: async () => (await supabase.from("convites").select("*").order("criado_em", { ascending: false })).data ?? [],
  });

  async function sendInvite() {
    if (!invite.email_convidado.trim()) return toast.error("Informe o email");
    const { data, error } = await supabase.from("convites").insert(invite).select("token").single();
    if (error) return toast.error(error.message);
    const url = `${window.location.origin}/aceitar-convite/${data.token}`;
    toast.success("Convite criado", {
      description: `Envie este link ao usuário:`,
      action: { label: "Copiar link", onClick: () => navigator.clipboard.writeText(url) },
    });
    setOpen(false);
    setInvite({ email_convidado: "", perfil_convidado: "Usuário" });
    qc.invalidateQueries({ queryKey: ["convites"] });
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><BackButton to="/dashboard" /><h1 className="text-2xl font-semibold">Usuários</h1></div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Convidar usuário</Button>
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
            <TableHead>Nome</TableHead><TableHead>Email</TableHead><TableHead>Perfil</TableHead><TableHead>Cadastrado em</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {usuarios.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum usuário cadastrado.</TableCell></TableRow>
            )}
            {usuarios.map((u: any) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.nome_completo}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.perfil}</TableCell>
                <TableCell>{new Date(u.data_cadastro).toLocaleDateString("pt-BR")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card className="p-0 overflow-hidden">
        <h3 className="px-4 py-3 font-medium border-b">Convites</h3>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Email</TableHead><TableHead>Perfil</TableHead><TableHead>Status</TableHead>
            <TableHead>Expira em</TableHead><TableHead className="text-right">Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {convites.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum convite enviado.</TableCell></TableRow>
            )}
            {convites.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell>{c.email_convidado}</TableCell>
                <TableCell>{c.perfil_convidado}</TableCell>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Convidar novo usuário</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Email</Label>
              <Input type="email" value={invite.email_convidado}
                onChange={(e) => setInvite({ ...invite, email_convidado: e.target.value })} /></div>
            <div className="space-y-2"><Label>Perfil</Label>
              <Select value={invite.perfil_convidado} onValueChange={(v: any) => setInvite({ ...invite, perfil_convidado: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Usuário">Usuário</SelectItem>
                  <SelectItem value="Administrador">Administrador</SelectItem>
                  <SelectItem value="SUPER ADMIN">SUPER ADMIN</SelectItem>
                </SelectContent>
              </Select></div>
            <p className="text-xs text-muted-foreground">
              Um link de convite será gerado. O usuário deve aceitar e entrar com Google usando o mesmo email.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={sendInvite}>Criar convite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
