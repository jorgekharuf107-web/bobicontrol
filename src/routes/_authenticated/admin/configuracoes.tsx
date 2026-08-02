import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Mail, Save, TestTube2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BackButton } from "@/components/back-button";
import { useCurrentUser } from "@/lib/use-current-user";
import { useServerFn } from "@tanstack/react-start";
import { sendEmail } from "@/lib/email.functions";

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações do Sistema | Bobi Control" },
      { name: "description", content: "Ajuste parâmetros gerais e configurações de e-mail SMTP do Bobi Control." },
      { property: "og:title", content: "Configurações do Sistema | Bobi Control" },
      { property: "og:description", content: "Ajuste parâmetros gerais e configurações de e-mail SMTP do Bobi Control." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/admin/configuracoes" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "/admin/configuracoes" }],
  }),
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const { isAdmin, user } = useCurrentUser();
  const qc = useQueryClient();
  const send = useServerFn(sendEmail);

  const { data: cfg } = useQuery({
    queryKey: ["email-config"],
    enabled: isAdmin,
    queryFn: async () =>
      (await supabase
        .from("email_config")
        .select("id, sender_email, ativo, senha_definida")
        .limit(1)
        .maybeSingle()).data,
  });

  const [sender, setSender] = useState("jorgekharuf107@gmail.com");
  const [password, setPassword] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [testTo, setTestTo] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (cfg) {
      setSender(cfg.sender_email ?? "jorgekharuf107@gmail.com");
      setAtivo(cfg.ativo ?? true);
      setPassword(""); // não repopular por segurança
    }
  }, [cfg]);

  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <BackButton />
        <Card className="p-6"><p>Acesso restrito a administradores.</p></Card>
      </div>
    );
  }

  async function salvar() {
    setSaving(true);
    const payload: any = {
      sender_email: sender.trim(),
      ativo,
      atualizado_em: new Date().toISOString(),
      atualizado_por: user?.id ?? null,
    };
    if (password.trim()) payload.app_password = password.trim();

    let error;
    if (cfg?.id) {
      ({ error } = await supabase.from("email_config").update(payload).eq("id", cfg.id));
    } else {
      ({ error } = await supabase.from("email_config").insert(payload));
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    setPassword("");
    toast.success("Configurações salvas");
    qc.invalidateQueries({ queryKey: ["email-config"] });
  }

  async function testar() {
    if (!testTo.trim()) return toast.error("Informe o e-mail de destino");
    const res: any = await send({
      data: {
        to: testTo.trim(),
        subject: "Teste — Bobi Control",
        html: "<p>E-mail de teste enviado pelo Bobi Control.</p>",
      },
    });
    if (res?.ok) toast.success("E-mail de teste enviado");
    else toast.error("Falha: " + (res?.error || res?.skipped || "desconhecida"));
  }

  return (
    <div className="space-y-4">
      <BackButton />
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Ajustes do sistema Bobi Control</p>
      </div>

      <Tabs defaultValue="email">
        <TabsList>
          <TabsTrigger value="email"><Mail className="h-4 w-4 mr-1" /> E-mail</TabsTrigger>
        </TabsList>

        <TabsContent value="email">
          <Card className="p-5 space-y-4 max-w-2xl">
            <div>
              <Label>E-mail remetente</Label>
              <Input className="h-9" value={sender} onChange={(e) => setSender(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Padrão: jorgekharuf107@gmail.com</p>
            </div>
            <div>
              <Label>Senha de App do Google</Label>
              <Input type="password" className="h-9" placeholder={cfg?.senha_definida ? "•••••••• (mantida se em branco)" : "Cole a senha de app"}
                value={password} onChange={(e) => setPassword(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">
                Gere em: myaccount.google.com → Segurança → Verificação em 2 etapas → Senhas de app.
                Não use sua senha normal do Gmail.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={ativo} onCheckedChange={setAtivo} />
              <Label>Envio de e-mails ativo</Label>
            </div>
            <div className="flex gap-2">
              <Button onClick={salvar} disabled={saving}><Save className="h-4 w-4" /> Salvar</Button>
            </div>

            <div className="border-t pt-4 space-y-2">
              <Label>Enviar e-mail de teste</Label>
              <div className="flex gap-2">
                <Input className="h-9" placeholder="destino@exemplo.com" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
                <Button variant="outline" onClick={testar}><TestTube2 className="h-4 w-4" /> Testar</Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
