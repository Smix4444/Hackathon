-- =========================================================
-- Invaller — schema.sql
-- =========================================================
create extension if not exists pgcrypto with schema extensions;

-- ---------- Tabellen ----------
create table public.salons (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,40}$'),
  name text not null check (char_length(name) between 2 and 60),
  city text not null default 'Antwerpen',
  offer_seconds int not null default 60 check (offer_seconds between 15 and 900),
  typical_wait_days int not null default 14 check (typical_wait_days between 1 and 90),
  last_minute_discount boolean not null default true,
  vip_discount_pct int not null default 10 check (vip_discount_pct between 0 and 50),
  created_at timestamptz not null default now()
);

create table public.treatments (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 40),
  duration_min int not null check (duration_min between 10 and 240),
  price_cents int not null check (price_cents between 0 and 100000),
  sort int not null default 0
);

create table public.slots (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons(id) on delete cascade,
  treatment_id uuid not null references public.treatments(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'booked'
    check (status in ('booked','free','offered','filled')),
  customer_name text,
  released_at timestamptz,
  current_offer_id uuid,
  filled_by_entry_id uuid,
  filled_treatment_id uuid,
  filled_at timestamptz,
  final_price_cents int,
  final_duration_min int,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons(id) on delete cascade,
  treatment_id uuid not null references public.treatments(id),
  first_name text not null check (char_length(btrim(first_name)) between 2 and 30),
  days smallint[] not null
    check (cardinality(days) between 1 and 7 and days <@ array[1,2,3,4,5,6,7]::smallint[]),
  time_from time not null,
  time_to time not null,
  lead_minutes int not null default 30 check (lead_minutes in (0,15,30,60,120)),
  is_vip boolean not null default false,
  is_demo boolean not null default false,
  status text not null default 'waiting'
    check (status in ('waiting','offered','booked','left')),
  created_at timestamptz not null default now(),
  check (time_to - time_from >= interval '30 minutes')
);

-- Geheime apparaat-tokens: RLS aan, GEEN policy → onleesbaar via de API
create table public.entry_tokens (
  entry_id uuid primary key references public.waitlist_entries(id) on delete cascade,
  token_hash text not null
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons(id) on delete cascade,
  slot_id uuid not null references public.slots(id) on delete cascade,
  entry_id uuid not null references public.waitlist_entries(id) on delete cascade,
  treatment_id uuid not null references public.treatments(id),
  status text not null default 'pending'
    check (status in ('pending','accepted','declined','expired')),
  price_cents int not null,
  original_price_cents int not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  responded_at timestamptz
);

create table public.events (
  id bigint generated always as identity primary key,
  salon_id uuid not null references public.salons(id) on delete cascade,
  type text not null check (type in
    ('released','offered','accepted','declined','expired','no_match','joined','claimed','left')),
  slot_id uuid,
  entry_id uuid,
  message text not null,
  created_at timestamptz not null default now()
);

create index on public.slots (salon_id, starts_at);
create index on public.waitlist_entries (salon_id, status, created_at);
create index on public.offers (slot_id);
create index on public.offers (entry_id);
create index on public.events (salon_id, created_at desc);

-- ---------- Row Level Security ----------
alter table public.salons            enable row level security;
alter table public.treatments        enable row level security;
alter table public.slots             enable row level security;
alter table public.waitlist_entries  enable row level security;
alter table public.entry_tokens      enable row level security;
alter table public.offers            enable row level security;
alter table public.events            enable row level security;

-- Demo: alles leesbaar, NIETS rechtstreeks schrijfbaar. Schrijven kan enkel via de functies hieronder.
create policy "read salons"     on public.salons           for select to anon, authenticated using (true);
create policy "read treatments" on public.treatments       for select to anon, authenticated using (true);
create policy "read slots"      on public.slots            for select to anon, authenticated using (true);
create policy "read waitlist"   on public.waitlist_entries for select to anon, authenticated using (true);
create policy "read offers"     on public.offers           for select to anon, authenticated using (true);
create policy "read events"     on public.events           for select to anon, authenticated using (true);
revoke all on public.entry_tokens from anon, authenticated;

-- Expliciete rechten (niet afhankelijk van Supabase-standaarden): lezen ja, schrijven nee
grant usage on schema public to anon, authenticated;
grant select on public.salons, public.treatments, public.slots,
                public.waitlist_entries, public.offers, public.events to anon, authenticated;
revoke insert, update, delete, truncate on public.salons, public.treatments, public.slots,
                public.waitlist_entries, public.offers, public.events from anon, authenticated;

-- ---------- Realtime ----------
alter publication supabase_realtime
  add table public.slots, public.waitlist_entries, public.offers, public.events;

-- ---------- Hulpfuncties ----------
create or replace function public.price_for(p_base int, p_starts timestamptz, p_discount boolean)
returns int language sql stable set search_path = public as $$
  select case
    when not p_discount                              then p_base
    when p_starts - now() < interval '30 minutes'    then round(p_base * 0.60)::int
    when p_starts - now() < interval '60 minutes'    then round(p_base * 0.70)::int
    when p_starts - now() < interval '120 minutes'   then round(p_base * 0.80)::int
    else p_base
  end
$$;

-- Prijs voor een bepaalde wachtende: vaste klanten krijgen er korting bovenop.
create or replace function public.price_for_entry(
  p_base int, p_starts timestamptz, p_discount boolean, p_vip boolean, p_vip_pct int)
returns int language sql stable set search_path = public as $$
  select case
    when p_vip then round(public.price_for(p_base, p_starts, p_discount) * (100 - p_vip_pct) / 100.0)::int
    else public.price_for(p_base, p_starts, p_discount)
  end
$$;

create or replace function public._fmt_time(p timestamptz)
returns text language sql stable as $$
  select to_char(p at time zone 'Europe/Brussels', 'HH24:MI')
$$;

create or replace function public._token_ok(p_entry uuid, p_token uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.entry_tokens
    where entry_id = p_entry
      and token_hash = encode(extensions.digest(p_token::text, 'sha256'), 'hex')
  )
$$;

-- Zet een vrijgekomen plek open voor IEDEREEN op de wachtlijst die past.
-- Wie eerst accepteert, krijgt ze. Geeft het aantal uitnodigingen terug.
create or replace function public._offer_all(p_slot uuid)
returns int language plpgsql security definer set search_path = public as $$
declare
  s          public.slots%rowtype;
  v_salon    public.salons%rowtype;
  v_local    timestamp;
  v_slot_min int;
  r          record;
  n          int := 0;
begin
  select * into s from public.slots where id = p_slot for update;
  if not found or s.status <> 'free' or s.starts_at <= now() then
    return 0;
  end if;

  select * into v_salon from public.salons where id = s.salon_id;
  v_local    := s.starts_at at time zone 'Europe/Brussels';
  v_slot_min := extract(epoch from (s.ends_at - s.starts_at))::int / 60;

  for r in
    select e.id, e.is_vip, t.id as treatment_id, t.price_cents
    from public.waitlist_entries e
    join public.treatments t on t.id = e.treatment_id
    where e.salon_id = s.salon_id
      and e.status in ('waiting', 'offered')
      and t.duration_min <= v_slot_min                                   -- past in het gat
      and extract(isodow from v_local)::smallint = any (e.days)          -- juiste dag
      and v_local::time >= e.time_from                                   -- binnen venster
      and (v_local + make_interval(mins => t.duration_min))::time <= e.time_to
      and s.starts_at >= now() + make_interval(mins => e.lead_minutes)   -- kan er op tijd zijn
      and not exists (select 1 from public.offers o
                      where o.slot_id = s.id and o.entry_id = e.id)      -- nog niet uitgenodigd
    order by e.is_vip desc, e.created_at asc
  loop
    insert into public.offers
      (salon_id, slot_id, entry_id, treatment_id, price_cents, original_price_cents, expires_at)
    values
      (s.salon_id, s.id, r.id, r.treatment_id,
       public.price_for_entry(r.price_cents, s.starts_at, v_salon.last_minute_discount,
                              r.is_vip, v_salon.vip_discount_pct),
       r.price_cents, s.starts_at);

    update public.waitlist_entries set status = 'offered' where id = r.id;
    n := n + 1;
  end loop;

  if n > 0 then
    update public.slots set status = 'offered' where id = s.id;
    insert into public.events (salon_id, type, slot_id, message)
    values (s.salon_id, 'offered', s.id,
            format('%s staat open voor %s wachtenden', public._fmt_time(s.starts_at), n));
  end if;

  return n;
end $$;

create or replace function public._log_no_match(p_slot uuid)
returns void language plpgsql security definer set search_path = public as $$
declare s public.slots%rowtype;
begin
  select * into s from public.slots where id = p_slot;
  insert into public.events (salon_id, type, slot_id, message)
  values (s.salon_id, 'no_match', s.id,
          format('Niemand op de wachtlijst past bij %s. De plek staat open.', public._fmt_time(s.starts_at)));
end $$;

-- Accepteren of weigeren. Lock-volgorde altijd: slot -> offer (geen deadlocks).
-- Accepteren is een race: de eerste die binnen is, wint. De anderen krijgen
-- SLOT_TAKEN en blijven gewoon op de wachtlijst staan.
create or replace function public._respond(p_offer uuid, p_accept boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_slot_id uuid;
  s       public.slots%rowtype;
  o       public.offers%rowtype;
  v_t     public.treatments%rowtype;
  v_salon public.salons%rowtype;
  v_name  text;
  v_vip   boolean;
  v_price int;
  v_left  int;
begin
  select slot_id into v_slot_id from public.offers where id = p_offer;
  if v_slot_id is null then raise exception 'OFFER_NOT_FOUND'; end if;

  select * into s from public.slots  where id = v_slot_id for update;
  select * into o from public.offers where id = p_offer   for update;

  if o.status <> 'pending' then raise exception 'OFFER_CLOSED'; end if;
  if s.starts_at <= now()  then raise exception 'OFFER_EXPIRED'; end if;

  select first_name, is_vip into v_name, v_vip
  from public.waitlist_entries where id = o.entry_id;

  if p_accept then
    if s.status <> 'offered' then raise exception 'SLOT_TAKEN'; end if;

    select * into v_t     from public.treatments where id = o.treatment_id;
    select * into v_salon from public.salons     where id = s.salon_id;
    v_price := public.price_for_entry(v_t.price_cents, s.starts_at,
                                      v_salon.last_minute_discount, v_vip, v_salon.vip_discount_pct);

    update public.offers set status = 'accepted', responded_at = now(), price_cents = v_price
    where id = o.id;

    update public.slots set
      status = 'filled', filled_by_entry_id = o.entry_id, filled_treatment_id = o.treatment_id,
      filled_at = now(), final_price_cents = v_price, final_duration_min = v_t.duration_min
    where id = s.id;

    update public.waitlist_entries set status = 'booked' where id = o.entry_id;

    -- Iedereen die ook uitgenodigd was, verliest deze plek maar blijft wachten.
    update public.offers set status = 'expired', responded_at = now()
    where slot_id = s.id and status = 'pending';

    update public.waitlist_entries w set status = 'waiting'
    where w.status = 'offered'
      and exists (select 1 from public.offers o2 where o2.slot_id = s.id and o2.entry_id = w.id)
      and not exists (select 1 from public.offers o3 where o3.entry_id = w.id and o3.status = 'pending');

    insert into public.events (salon_id, type, slot_id, entry_id, message)
    values (s.salon_id, 'accepted', s.id, o.entry_id,
            format('%s neemt %s over', v_name, public._fmt_time(s.starts_at)));

    return jsonb_build_object(
      'status', 'accepted', 'slot_id', s.id, 'starts_at', s.starts_at,
      'price_cents', v_price, 'original_price_cents', o.original_price_cents,
      'treatment', v_t.name, 'duration_min', v_t.duration_min);
  else
    update public.offers set status = 'declined', responded_at = now() where id = o.id;

    update public.waitlist_entries w set status = 'waiting'
    where w.id = o.entry_id
      and not exists (select 1 from public.offers o2 where o2.entry_id = w.id and o2.status = 'pending');

    insert into public.events (salon_id, type, slot_id, entry_id, message)
    values (s.salon_id, 'declined', s.id, o.entry_id,
            format('%s slaat %s af', v_name, public._fmt_time(s.starts_at)));

    -- Niemand van de wachtlijst meer over? Dan staat de plek open voor iedereen.
    select count(*) into v_left from public.offers
    where slot_id = s.id and status = 'pending';

    if v_left = 0 and s.status = 'offered' then
      update public.slots set status = 'free' where id = s.id;
      perform public._log_no_match(s.id);
    end if;

    return jsonb_build_object('status', 'declined');
  end if;
end $$;

-- ---------- Publieke functies (RPC) ----------

-- Salon: afspraak vrijgeven → meteen aanbieden
create or replace function public.release_slot(p_slot uuid)
returns text language plpgsql security definer set search_path = public as $$
declare s public.slots%rowtype;
begin
  select * into s from public.slots where id = p_slot for update;
  if not found               then raise exception 'SLOT_NOT_FOUND'; end if;
  if s.status <> 'booked'    then raise exception 'SLOT_NOT_BOOKED'; end if;
  if s.starts_at <= now()    then raise exception 'SLOT_IN_PAST'; end if;

  update public.slots set status = 'free', released_at = now() where id = s.id;

  insert into public.events (salon_id, type, slot_id, message)
  values (s.salon_id, 'released', s.id,
          format('%s zegde af voor %s', coalesce(s.customer_name, 'Een klant'), public._fmt_time(s.starts_at)));

  if public._offer_all(s.id) = 0 then
    perform public._log_no_match(s.id);
    return 'free';
  end if;
  return 'offered';
end $$;

-- Klant: op de wachtlijst. Token wordt client-side gegenereerd (crypto.randomUUID) en alleen gehasht opgeslagen.
create or replace function public.join_waitlist(
  p_salon_slug text, p_treatment uuid, p_first_name text, p_days smallint[],
  p_from time, p_to time, p_lead int, p_token uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_salon uuid; v_entry uuid; v_slot uuid;
begin
  select id into v_salon from public.salons where slug = p_salon_slug;
  if v_salon is null then raise exception 'SALON_NOT_FOUND'; end if;
  if not exists (select 1 from public.treatments where id = p_treatment and salon_id = v_salon) then
    raise exception 'TREATMENT_NOT_FOUND';
  end if;

  insert into public.waitlist_entries
    (salon_id, treatment_id, first_name, days, time_from, time_to, lead_minutes)
  values
    (v_salon, p_treatment, btrim(p_first_name), p_days, p_from, p_to, p_lead)
  returning id into v_entry;

  insert into public.entry_tokens (entry_id, token_hash)
  values (v_entry, encode(extensions.digest(p_token::text, 'sha256'), 'hex'));

  insert into public.events (salon_id, type, entry_id, message)
  values (v_salon, 'joined', v_entry, format('%s staat op de wachtlijst', btrim(p_first_name)));

  -- Staat er al een vrije plek open die past? Meteen aanbieden.
  for v_slot in
    select id from public.slots
    where salon_id = v_salon and status = 'free' and starts_at > now()
    order by starts_at
  loop
    perform public._offer_all(v_slot);
    exit when (select status from public.waitlist_entries where id = v_entry) = 'offered';
  end loop;

  return v_entry;
end $$;

create or replace function public.leave_waitlist(p_entry uuid, p_token uuid)
returns void language plpgsql security definer set search_path = public as $$
declare e public.waitlist_entries%rowtype;
begin
  if not public._token_ok(p_entry, p_token) then raise exception 'NOT_YOUR_ENTRY'; end if;
  select * into e from public.waitlist_entries where id = p_entry for update;
  if e.status <> 'waiting' then raise exception 'ENTRY_BUSY'; end if;
  update public.waitlist_entries set status = 'left' where id = p_entry;
  insert into public.events (salon_id, type, entry_id, message)
  values (e.salon_id, 'left', e.id, format('%s verliet de wachtlijst', e.first_name));
end $$;

create or replace function public.accept_offer(p_offer uuid, p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_entry uuid;
begin
  select entry_id into v_entry from public.offers where id = p_offer;
  if v_entry is null then raise exception 'OFFER_NOT_FOUND'; end if;
  if not public._token_ok(v_entry, p_token) then raise exception 'NOT_YOUR_OFFER'; end if;
  return public._respond(p_offer, true);
end $$;

create or replace function public.decline_offer(p_offer uuid, p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_entry uuid;
begin
  select entry_id into v_entry from public.offers where id = p_offer;
  if v_entry is null then raise exception 'OFFER_NOT_FOUND'; end if;
  if not public._token_ok(v_entry, p_token) then raise exception 'NOT_YOUR_OFFER'; end if;
  return public._respond(p_offer, false);
end $$;

-- Enkel voor demo-klanten (is_demo = true)
create or replace function public.simulate_response(p_offer uuid, p_accept boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_demo boolean;
begin
  select e.is_demo into v_demo
  from public.offers o join public.waitlist_entries e on e.id = o.entry_id
  where o.id = p_offer;
  if v_demo is distinct from true then raise exception 'NOT_DEMO_ENTRY'; end if;
  return public._respond(p_offer, p_accept);
end $$;

-- Idempotent: door elke open pagina aan te roepen. Ruimt uitnodigingen op
-- voor plekken die intussen begonnen zijn.
create or replace function public.expire_offers()
returns int language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  for r in
    select s.id as slot_id, s.salon_id, s.starts_at, s.status
    from public.slots s
    where s.status = 'offered' and s.starts_at <= now()
    for update of s skip locked
  loop
    update public.offers set status = 'expired', responded_at = now()
    where slot_id = r.slot_id and status = 'pending';

    update public.waitlist_entries w set status = 'waiting'
    where w.status = 'offered'
      and exists (select 1 from public.offers o2 where o2.slot_id = r.slot_id and o2.entry_id = w.id)
      and not exists (select 1 from public.offers o3 where o3.entry_id = w.id and o3.status = 'pending');

    update public.slots set status = 'free' where id = r.slot_id;

    insert into public.events (salon_id, type, slot_id, message)
    values (r.salon_id, 'expired', r.slot_id,
            format('Niemand nam %s over', public._fmt_time(r.starts_at)));

    n := n + 1;
  end loop;
  return n;
end $$;

-- Klant: vrije plek direct boeken (als niemand matchte)
create or replace function public.claim_free_slot(p_slot uuid, p_first_name text, p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  s public.slots%rowtype; v_t public.treatments%rowtype; v_salon public.salons%rowtype;
  v_entry uuid; v_local timestamp; v_price int;
begin
  select * into s from public.slots where id = p_slot for update;
  if not found then raise exception 'SLOT_NOT_FOUND'; end if;
  if s.status <> 'free' or s.starts_at <= now() then raise exception 'SLOT_TAKEN'; end if;

  select * into v_t     from public.treatments where id = s.treatment_id;
  select * into v_salon from public.salons     where id = s.salon_id;
  v_local := s.starts_at at time zone 'Europe/Brussels';
  v_price := public.price_for(v_t.price_cents, s.starts_at, v_salon.last_minute_discount);

  insert into public.waitlist_entries
    (salon_id, treatment_id, first_name, days, time_from, time_to, lead_minutes, status)
  values
    (s.salon_id, s.treatment_id, btrim(p_first_name),
     array[extract(isodow from v_local)::smallint], '00:00', '23:59', 0, 'booked')
  returning id into v_entry;

  insert into public.entry_tokens (entry_id, token_hash)
  values (v_entry, encode(extensions.digest(p_token::text, 'sha256'), 'hex'));

  update public.slots set
    status = 'filled', filled_by_entry_id = v_entry, filled_treatment_id = v_t.id,
    filled_at = now(), final_price_cents = v_price, final_duration_min = v_t.duration_min
  where id = s.id;

  insert into public.events (salon_id, type, slot_id, entry_id, message)
  values (s.salon_id, 'claimed', s.id, v_entry,
          format('%s boekte de vrije plek van %s', btrim(p_first_name), public._fmt_time(s.starts_at)));

  return jsonb_build_object(
    'status', 'accepted', 'entry_id', v_entry, 'slot_id', s.id, 'starts_at', s.starts_at,
    'price_cents', v_price, 'original_price_cents', v_t.price_cents,
    'treatment', v_t.name, 'duration_min', v_t.duration_min);
end $$;

create or replace function public.set_vip(p_entry uuid, p_vip boolean)
returns void language sql security definer set search_path = public as $$
  update public.waitlist_entries set is_vip = p_vip where id = p_entry;
$$;

create or replace function public.update_salon_settings(
  p_slug text, p_discount boolean, p_typical_wait_days int, p_vip_discount_pct int)
returns void language sql security definer set search_path = public as $$
  update public.salons
  set last_minute_discount = p_discount,
      typical_wait_days = p_typical_wait_days,
      vip_discount_pct = p_vip_discount_pct
  where slug = p_slug;
$$;

-- Demo opnieuw opbouwen, relatief aan NU
create or replace function public.reset_demo(p_slug text default 'studio-noor')
returns void language plpgsql security definer set search_path = public as $$
declare
  v_salon uuid;
  t_cut uuid; t_beard uuid; t_color uuid; t_brush uuid;
  v_today    date := (now() at time zone 'Europe/Brussels')::date;
  v_tomorrow date := v_today + 1;
  v_tmr_dow  smallint := extract(isodow from v_tomorrow)::smallint;
  v_plan_today text[] := array['cut','beard','color','cut','brush','cut','beard','cut'];
  v_plan_tmr   text[] := array['cut','cut','beard','color','cut','brush'];
  v_names text[] := array['Tom','Milan','Yasmine','Arne','Fatima','Jules','Noah','Lotte',
                          'Ines','Emma','Lucas','Nora','Elias','Amira'];
  v_cursor timestamptz; v_t uuid; v_dur int; i int; n int := 0;
begin
  select id into v_salon from public.salons where slug = p_slug;
  if v_salon is null then raise exception 'SALON_NOT_FOUND'; end if;

  delete from public.events           where salon_id = v_salon;
  delete from public.offers           where salon_id = v_salon;
  delete from public.slots            where salon_id = v_salon;
  delete from public.waitlist_entries where salon_id = v_salon;

  select id into t_cut   from public.treatments where salon_id = v_salon and name = 'Knippen';
  select id into t_beard from public.treatments where salon_id = v_salon and name = 'Knippen en baard';
  select id into t_color from public.treatments where salon_id = v_salon and name = 'Kleuren';
  select id into t_brush from public.treatments where salon_id = v_salon and name = 'Brushing';

  -- Vandaag: aaneengesloten agenda vanaf het volgende volle uur
  v_cursor := date_trunc('hour', now()) + interval '1 hour';
  for i in 1..array_length(v_plan_today, 1) loop
    v_t := case v_plan_today[i] when 'cut' then t_cut when 'beard' then t_beard
                                when 'color' then t_color else t_brush end;
    select duration_min into v_dur from public.treatments where id = v_t;
    n := n + 1;
    insert into public.slots (salon_id, treatment_id, starts_at, ends_at, status, customer_name)
    values (v_salon, v_t, v_cursor, v_cursor + make_interval(mins => v_dur), 'booked', v_names[n]);
    v_cursor := v_cursor + make_interval(mins => v_dur);
  end loop;

  -- Morgen vanaf 10:00
  v_cursor := (v_tomorrow + time '10:00') at time zone 'Europe/Brussels';
  for i in 1..array_length(v_plan_tmr, 1) loop
    v_t := case v_plan_tmr[i] when 'cut' then t_cut when 'beard' then t_beard
                              when 'color' then t_color else t_brush end;
    select duration_min into v_dur from public.treatments where id = v_t;
    n := n + 1;
    insert into public.slots (salon_id, treatment_id, starts_at, ends_at, status, customer_name)
    values (v_salon, v_t, v_cursor, v_cursor + make_interval(mins => v_dur), 'booked', v_names[n]);
    v_cursor := v_cursor + make_interval(mins => v_dur);
  end loop;

  -- Demo-wachtlijst: enkel MORGEN beschikbaar, zodat echte (jury-)inschrijvingen
  -- voor vandaag nooit door demo-klanten worden ingepikt.
  insert into public.waitlist_entries
    (salon_id, treatment_id, first_name, days, time_from, time_to, lead_minutes, is_vip, is_demo, created_at)
  values
    (v_salon, t_cut,   'Sarah', array[v_tmr_dow], '09:00', '13:00', 30, false, true, now() - interval '3 days'),
    (v_salon, t_color, 'Hanne', array[v_tmr_dow], '09:00', '17:00', 60, false, true, now() - interval '2 days'),
    (v_salon, t_cut,   'Bilal', array[v_tmr_dow], '10:00', '12:30', 30, true,  true, now() - interval '1 day'),
    (v_salon, t_brush, 'Lien',  array[v_tmr_dow], '13:00', '18:00', 30, false, true, now() - interval '5 hours');
end $$;

-- ---------- Rechten ----------
revoke execute on function public._offer_all(uuid)           from public, anon, authenticated;
revoke execute on function public._respond(uuid, boolean)    from public, anon, authenticated;
revoke execute on function public._token_ok(uuid, uuid)      from public, anon, authenticated;
revoke execute on function public._log_no_match(uuid)        from public, anon, authenticated;

grant execute on function
  public.release_slot(uuid),
  public.join_waitlist(text, uuid, text, smallint[], time, time, int, uuid),
  public.leave_waitlist(uuid, uuid),
  public.accept_offer(uuid, uuid),
  public.decline_offer(uuid, uuid),
  public.simulate_response(uuid, boolean),
  public.expire_offers(),
  public.claim_free_slot(uuid, text, uuid),
  public.set_vip(uuid, boolean),
  public.update_salon_settings(text, boolean, int, int),
  public.reset_demo(text),
  public.price_for(int, timestamptz, boolean),
  public.price_for_entry(int, timestamptz, boolean, boolean, int)
to anon, authenticated;
