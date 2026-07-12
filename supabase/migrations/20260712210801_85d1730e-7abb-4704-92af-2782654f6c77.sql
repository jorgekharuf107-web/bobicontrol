
ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_perfil_check;
ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_perfil_check
  CHECK (perfil = ANY (ARRAY['SUPER_ADMIN'::text,'Administrador'::text,'Gestor'::text,'Operador'::text]));

CREATE OR REPLACE FUNCTION public.e_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM public.usuarios WHERE id = _user_id AND perfil = 'SUPER_ADMIN' AND ativo = true) $$;

CREATE OR REPLACE FUNCTION public.e_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM public.usuarios WHERE id = _user_id AND perfil IN ('Administrador','SUPER_ADMIN') AND ativo = true) $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_count INTEGER; v_perfil text; v_invited public.convites%ROWTYPE;
BEGIN
  SELECT * INTO v_invited FROM public.convites
    WHERE email_convidado = NEW.email AND status = 'pendente' AND expira_em > now()
    ORDER BY criado_em DESC LIMIT 1;
  SELECT COUNT(*) INTO v_count FROM public.usuarios;
  IF v_count = 0 THEN v_perfil := 'SUPER_ADMIN';
  ELSIF v_invited.id IS NOT NULL THEN
    v_perfil := v_invited.perfil_convidado;
    UPDATE public.convites SET status = 'aceito' WHERE id = v_invited.id;
  ELSE v_perfil := 'Operador'; END IF;

  INSERT INTO public.usuarios (id, nome_completo, email, perfil, google_id, ativo)
  VALUES (NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email, v_perfil, NEW.raw_user_meta_data->>'sub', true);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id,
    CASE WHEN v_perfil IN ('Administrador','SUPER_ADMIN') THEN 'admin'::public.app_role ELSE 'usuario'::public.app_role END
  ) ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

UPDATE public.usuarios SET perfil = 'SUPER_ADMIN'
WHERE id = (SELECT id FROM public.usuarios ORDER BY data_cadastro ASC LIMIT 1)
  AND perfil = 'Administrador';
