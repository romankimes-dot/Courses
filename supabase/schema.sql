-- Courses : stockage partagé. À exécuter une fois dans Supabase > SQL Editor.
-- Pas de comptes : une liste partagée = un code secret long (dans le lien d'invitation).
-- La table n'est pas accessible directement, seulement via push/pull.

create sequence if not exists records_seq;

create table if not exists records (
  household text   not null,
  key       text   not null,          -- item:<id>, aisle:<id>, map
  data      jsonb,                    -- null = supprimé
  u         bigint not null,          -- horodatage de la modification (appareil)
  seq       bigint not null default nextval('records_seq'),
  primary key (household, key)
);
create index if not exists records_household_seq on records (household, seq);

alter table records enable row level security;
revoke all on records from anon, authenticated;

-- Envoi : la modification la plus récente gagne
create or replace function push(h text, recs jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if length(h) < 32 then raise exception 'code invalide'; end if;
  insert into records (household, key, data, u)
  select h, r->>'key', r->'data', (r->>'u')::bigint from jsonb_array_elements(recs) r
  on conflict (household, key) do update
    set data = excluded.data, u = excluded.u, seq = nextval('records_seq')
    where records.u < excluded.u;
end $$;

-- Réception : tout ce qui a changé depuis le dernier numéro vu
create or replace function pull(h text, since bigint) returns table (key text, data jsonb, u bigint, seq bigint)
language sql stable security definer set search_path = public as $$
  select key, data, u, seq from records
  where household = h and seq > since and length(h) >= 32
  order by seq;
$$;

grant execute on function push(text, jsonb), pull(text, bigint) to anon;
