import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type SendInput = {
  to: string;
  subject: string;
  html: string;
};

export const sendEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: SendInput) => {
    if (!data?.to || !data?.subject || !data?.html) throw new Error("Parâmetros inválidos");
    const to = String(data.to).trim();
    if (!/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(to)) throw new Error("Destinatário inválido");
    if (to.length > 254) throw new Error("Destinatário inválido");
    const subject = String(data.subject).trim().slice(0, 200);
    const html = String(data.html);
    if (html.length > 20000) throw new Error("Conteúdo muito longo");
    return { to, subject, html };
  })
  .handler(async ({ data, context }) => {
    // Somente perfis de gestão podem disparar e-mails pelo SMTP da empresa
    const [{ data: isAdmin }, { data: isGestor }, { data: isDispatcher }] = await Promise.all([
      context.supabase.rpc("e_admin", { _user_id: context.userId }),
      context.supabase.rpc("e_gestor", { _user_id: context.userId }),
      context.supabase.rpc("e_dispatcher", { _user_id: context.userId }),
    ]);
    if (!isAdmin && !isGestor && !isDispatcher) {
      throw new Error("Sem permissão para enviar e-mails");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: cfg, error } = await supabaseAdmin
      .from("email_config")
      .select("sender_email, app_password, ativo")
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!cfg?.ativo) return { ok: false, skipped: "config_inativa" };
    if (!cfg?.app_password) return { ok: false, skipped: "sem_senha_de_app" };
    const sender = cfg.sender_email || "jorgekharuf107@gmail.com";
    try {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user: sender, pass: cfg.app_password },
      });
      await transporter.sendMail({
        from: `Bobi Control <${sender}>`,
        to: data.to,
        subject: data.subject,
        html: data.html,
      });
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? "Falha SMTP" };
    }
  });
