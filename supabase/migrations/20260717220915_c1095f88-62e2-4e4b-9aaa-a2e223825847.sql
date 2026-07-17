
ALTER TABLE public.agendamentos_entrega
  ADD COLUMN IF NOT EXISTS modo_offline boolean NOT NULL DEFAULT false;

ALTER TABLE public.agendamento_itens
  ADD COLUMN IF NOT EXISTS item_id uuid REFERENCES public.itens(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS qtd_caixas integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qtd_bobina_100 integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qtd_bobina_50 integer NOT NULL DEFAULT 0;

ALTER TABLE public.agendamento_itens
  ALTER COLUMN tipo_bobina DROP NOT NULL,
  ALTER COLUMN quantidade DROP NOT NULL;

CREATE TABLE IF NOT EXISTS public.email_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_email text NOT NULL DEFAULT 'jorgekharuf107@gmail.com',
  app_password text,
  ativo boolean NOT NULL DEFAULT true,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_por uuid REFERENCES auth.users(id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_config TO authenticated;
GRANT ALL ON public.email_config TO service_role;

ALTER TABLE public.email_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins veem config de email" ON public.email_config;
CREATE POLICY "Admins veem config de email" ON public.email_config
  FOR SELECT TO authenticated
  USING (public.e_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins gerenciam config de email" ON public.email_config;
CREATE POLICY "Admins gerenciam config de email" ON public.email_config
  FOR ALL TO authenticated
  USING (public.e_admin(auth.uid()))
  WITH CHECK (public.e_admin(auth.uid()));

INSERT INTO public.email_config (sender_email)
SELECT 'jorgekharuf107@gmail.com'
WHERE NOT EXISTS (SELECT 1 FROM public.email_config);
