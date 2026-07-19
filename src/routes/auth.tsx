import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield, Mail, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 8 3l5.7-5.7C33.6 6.1 29 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 8 3l5.7-5.7C33.6 6.1 29 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5 0 9.5-1.9 12.9-5l-6-5.1c-2 1.4-4.4 2.2-6.9 2.2-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6 5.1C40 35.1 44 30 44 24c0-1.3-.1-2.5-.4-3.5z"/>
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 23 23" className="h-4 w-4">
      <path fill="#f25022" d="M1 1h10v10H1z"/>
      <path fill="#7fba00" d="M12 1h10v10H12z"/>
      <path fill="#00a4ef" d="M1 12h10v10H1z"/>
      <path fill="#ffb900" d="M12 12h10v10H12z"/>
    </svg>
  );
}

function AuthPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.navigate({ to: "/dashboard", replace: true });
    });
  }, [router]);

  async function signInGoogle() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Falha ao entrar com Google", { description: result.error.message });
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    router.navigate({ to: "/dashboard", replace: true });
  }

  async function signInEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !senha) {
      toast.error("Informe email e senha");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: senha,
    });
    if (error) {
      toast.error("Falha no login", { description: error.message });
      setLoading(false);
      return;
    }
    router.navigate({ to: "/dashboard", replace: true });
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/30 px-4 py-6">
        <Card className="w-full max-w-md p-8 shadow-lg">
          <div className="flex flex-col items-center text-center">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Shield className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold">Bobi Control</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Entre com sua conta para continuar
            </p>
          </div>

          <form className="mt-6 space-y-3" onSubmit={signInEmail}>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email" type="email" autoComplete="email"
                  className="h-10 pl-9"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="senha">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="senha" type="password" autoComplete="current-password"
                  className="h-10 pl-9"
                  value={senha} onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11">
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] uppercase text-muted-foreground">ou</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="space-y-3">
            <Button
              onClick={signInGoogle}
              disabled={loading}
              variant="outline"
              type="button"
              className="w-full h-11 font-normal"
            >
              <GoogleIcon /> Entrar com Google
            </Button>

            <Tooltip>
              <TooltipTrigger asChild>
                <span className="block">
                  <Button
                    type="button"
                    disabled
                    variant="outline"
                    className="w-full h-11 font-normal opacity-60"
                  >
                    <MicrosoftIcon /> Entrar com Microsoft
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-center">
                Login Microsoft em breve — entre em contato com o administrador para habilitar.
              </TooltipContent>
            </Tooltip>
          </div>

          <p className="mt-6 text-[11px] text-center text-muted-foreground">
            Apenas usuários autorizados conseguem acessar o sistema.
          </p>
        </Card>
      </div>
    </TooltipProvider>
  );
}
