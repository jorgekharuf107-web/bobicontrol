import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Shield, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { buscarConvitePorToken } from "@/lib/convites.functions";

import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/aceitar-convite/$token")({
  ssr: false,
  component: AceitarConvitePage,
});

function AceitarConvitePage() {
  const { token } = Route.useParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "valid" | "invalid" | "expired">("loading");
  const [convite, setConvite] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const res = await buscarConvitePorToken({ data: { token } });
      if (res.status !== "valid" || !res.convite) return setStatus(res.status);
      setConvite(res.convite);
      setStatus("valid");

      // Se já está logado com o mesmo email, redireciona
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user?.email === res.convite.email_convidado) {
        toast.success("Bem-vindo!");
        router.navigate({ to: "/dashboard" });
      }
    })();
  }, [token, router]);


  async function signInGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/aceitar-convite/${token}`,
      extraParams: { login_hint: convite?.email_convidado ?? "", prompt: "select_account" },
    });
    if (result.error) toast.error(result.error.message);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/30 px-4">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="h-14 w-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          {status === "valid" ? <Shield className="h-7 w-7 text-primary" /> :
           status === "expired" ? <XCircle className="h-7 w-7 text-destructive" /> :
           status === "invalid" ? <XCircle className="h-7 w-7 text-destructive" /> :
           <CheckCircle2 className="h-7 w-7 text-primary animate-pulse" />}
        </div>

        {status === "loading" && <p>Verificando convite…</p>}

        {status === "invalid" && (
          <>
            <h1 className="text-xl font-semibold">Convite inválido</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Este convite não existe ou já foi utilizado.
            </p>
          </>
        )}

        {status === "expired" && (
          <>
            <h1 className="text-xl font-semibold">Convite expirado</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Solicite um novo convite ao administrador.
            </p>
          </>
        )}

        {status === "valid" && convite && (
          <>
            <h1 className="text-xl font-semibold">Você foi convidado!</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Convite para <span className="font-medium">{convite.email_convidado}</span> como{" "}
              <span className="font-medium">{convite.perfil_convidado}</span>.
            </p>
            <p className="text-xs text-muted-foreground mt-4">
              Entre com sua conta Google usando exatamente este email.
            </p>
            <Button onClick={signInGoogle} className="mt-6 w-full">
              Entrar com Google
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
