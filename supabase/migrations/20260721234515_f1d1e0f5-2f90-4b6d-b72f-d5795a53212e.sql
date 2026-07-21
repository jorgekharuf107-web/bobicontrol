CREATE OR REPLACE FUNCTION public.calcular_total_bobinas(_caixas integer, _avulsas integer)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(_caixas,0)*6 + COALESCE(_avulsas,0)
$$;