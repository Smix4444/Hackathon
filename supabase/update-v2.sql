-- =========================================================
-- Invaller - update naar het open-aanbod-model (v2)
--
-- Draai dit EEN KEER in de Supabase SQL-editor als je schema.sql al
-- eerder hebt uitgevoerd. Het is veilig om opnieuw te draaien.
--
-- Wat verandert er:
--   1. Een vrijgekomen plek gaat niet meer een voor een naar de best
--      passende wachtende, maar staat meteen open voor iedereen die past.
--      Wie eerst accepteert, krijgt ze. De rest blijft op de wachtlijst.
--   2. Vaste klanten krijgen korting in plaats van voorrang.
--   3. Nieuwe kortingstreden: binnen 2 uur -20%, binnen 1 uur -30%,
--      binnen 30 minuten -40%.
--   4. Klanten geven een e-mailadres en eventueel een telefoonnummer op.
--   5. Klanten kunnen hun eigen afspraak afzeggen; de plek komt dan
--      meteen weer vrij voor de wachtlijst.
--   6. De demo vult nu de vorige maand tot twee maanden vooruit, met
--      geboekte afspraken en vrije uren die klanten zelf kunnen boeken.
-- =========================================================

-- Nieuwe saloninstelling: hoeveel korting een vaste klant krijgt.
alter table public.salons
  add column if not exists vip_discount_pct int not null default 10;

-- Contactgegevens van de klant. Geen account nodig.
alter table public.waitlist_entries add column if not exists email text;
alter table public.waitlist_entries add column if not exists phone text;

do $do$
begin
  if not exists (select 1 from pg_constraint where conname = 'salons_vip_discount_pct_check') then
    alter table public.salons
      add constraint salons_vip_discount_pct_check check (vip_discount_pct between 0 and 50);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'waitlist_entries_email_check') then
    alter table public.waitlist_entries
      add constraint waitlist_entries_email_check
      check (email is null or (char_length(email) between 5 and 120 and position('@' in email) > 1));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'waitlist_entries_phone_check') then
    alter table public.waitlist_entries
      add constraint waitlist_entries_phone_check
      check (phone is null or char_length(btrim(phone)) between 6 and 20);
  end if;
end $do$;

-- Functies die niet meer bestaan of van vorm veranderd zijn.
drop function if exists public._offer_next(uuid);
drop function if exists public.update_salon_settings(text, int, boolean, int);
drop function if exists public.join_waitlist(text, uuid, text, smallint[], time, time, int, uuid);

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

create or replace function public.price_for_entry(
  p_base int, p_starts timestamptz, p_discount boolean, p_vip boolean, p_vip_pct int)
returns int language sql stable set search_path = public as $$
  select case
    when p_vip then round(public.price_for(p_base, p_starts, p_discount) * (100 - p_vip_pct) / 100.0)::int
    else public.price_for(p_base, p_starts, p_discount)
  end
$$;

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

create or replace function public.join_waitlist(
  p_salon_slug text, p_treatment uuid, p_first_name text, p_days smallint[],
  p_from time, p_to time, p_lead int, p_token uuid,
  p_email text default null, p_phone text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_salon uuid; v_entry uuid; v_slot uuid;
begin
  select id into v_salon from public.salons where slug = p_salon_slug;
  if v_salon is null then raise exception 'SALON_NOT_FOUND'; end if;
  if not exists (select 1 from public.treatments where id = p_treatment and salon_id = v_salon) then
    raise exception 'TREATMENT_NOT_FOUND';
  end if;

  insert into public.waitlist_entries
    (salon_id, treatment_id, first_name, days, time_from, time_to, lead_minutes, email, phone)
  values
    (v_salon, p_treatment, btrim(p_first_name), p_days, p_from, p_to, p_lead,
     nullif(btrim(coalesce(p_email, '')), ''), nullif(btrim(coalesce(p_phone, '')), ''))
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

create or replace function public.cancel_booking(p_entry uuid, p_token uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  e public.waitlist_entries%rowtype;
  s public.slots%rowtype;
begin
  if not public._token_ok(p_entry, p_token) then raise exception 'NOT_YOUR_ENTRY'; end if;

  select * into e from public.waitlist_entries where id = p_entry for update;
  if not found or e.status <> 'booked' then raise exception 'NO_BOOKING'; end if;

  select * into s from public.slots
  where filled_by_entry_id = p_entry and status = 'filled'
  order by starts_at limit 1
  for update;

  if not found            then raise exception 'NO_BOOKING'; end if;
  if s.starts_at <= now() then raise exception 'SLOT_IN_PAST'; end if;

  update public.slots set
    status = 'free', released_at = now(), filled_by_entry_id = null,
    filled_treatment_id = null, filled_at = null,
    final_price_cents = null, final_duration_min = null, current_offer_id = null
  where id = s.id;

  update public.waitlist_entries set status = 'left' where id = p_entry;

  insert into public.events (salon_id, type, slot_id, entry_id, message)
  values (s.salon_id, 'released', s.id, p_entry,
          format('%s zegde zelf af voor %s', e.first_name, public._fmt_time(s.starts_at)));

  if public._offer_all(s.id) = 0 then
    perform public._log_no_match(s.id);
    return 'free';
  end if;
  return 'offered';
end $$;

create or replace function public.update_salon_settings(
  p_slug text, p_discount boolean, p_typical_wait_days int, p_vip_discount_pct int)
returns void language sql security definer set search_path = public as $$
  update public.salons
  set last_minute_discount = p_discount,
      typical_wait_days = p_typical_wait_days,
      vip_discount_pct = p_vip_discount_pct
  where slug = p_slug;
$$;

create or replace function public.reset_demo(p_slug text default 'studio-noor')
returns void language plpgsql security definer set search_path = public as $$
declare
  v_salon uuid;
  t_cut uuid; t_beard uuid; t_color uuid; t_brush uuid;
  v_today    date := (now() at time zone 'Europe/Brussels')::date;
  v_from     date := (date_trunc('month', v_today::timestamp) - interval '1 month')::date;
  v_to       date := (date_trunc('month', v_today::timestamp) + interval '3 months' - interval '1 day')::date;
  v_tomorrow date := v_today + 1;
  v_tmr_dow  smallint := extract(isodow from v_tomorrow)::smallint;
  v_names text[] := array['Tom','Milan','Yasmine','Arne','Fatima','Jules','Noah','Lotte',
                          'Ines','Emma','Lucas','Nora','Elias','Amira','Sofie','Mehdi',
                          'Lars','Hind','Senne','Rania'];
  v_day     date;
  v_cursor  timestamptz;
  v_close   timestamptz;
  v_t       uuid;
  v_dur     int;
  v_status  text;
  v_seed    int;
  i         int;
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

  v_day := v_from;
  while v_day <= v_to loop
    -- Zondag gesloten.
    if extract(isodow from v_day) <> 7 then
      v_seed := extract(doy from v_day)::int;

      if v_day = v_today then
        v_cursor := date_trunc('hour', now()) + interval '1 hour';
      else
        v_cursor := (v_day + time '09:00') at time zone 'Europe/Brussels';
      end if;
      v_close := (v_day + time '18:00') at time zone 'Europe/Brussels';

      i := 0;
      while v_cursor < v_close loop
        i := i + 1;
        v_t := case ((v_seed + i) % 5)
                 when 0 then t_color
                 when 1 then t_beard
                 when 2 then t_brush
                 else t_cut
               end;
        select duration_min into v_dur from public.treatments where id = v_t;
        exit when v_cursor + make_interval(mins => v_dur) > v_close;

        -- Alles in het verleden is geboekt geweest; vooruit laten we
        -- ongeveer een kwart van de uren vrij om te boeken.
        if v_cursor < now() then
          v_status := 'booked';
        elsif ((v_seed * 3 + i) % 4) = 0 then
          v_status := 'free';
        else
          v_status := 'booked';
        end if;

        insert into public.slots
          (salon_id, treatment_id, starts_at, ends_at, status, customer_name)
        values
          (v_salon, v_t, v_cursor, v_cursor + make_interval(mins => v_dur), v_status,
           case when v_status = 'booked'
                then v_names[1 + ((v_seed + i) % array_length(v_names, 1))]
                else null end);

        v_cursor := v_cursor + make_interval(mins => v_dur);
      end loop;
    end if;
    v_day := v_day + 1;
  end loop;

  -- Demo-wachtlijst: enkel MORGEN beschikbaar, zodat echte (jury-)inschrijvingen
  -- voor vandaag nooit door demo-klanten worden ingepikt.
  insert into public.waitlist_entries
    (salon_id, treatment_id, first_name, email, days, time_from, time_to, lead_minutes, is_vip, is_demo, created_at)
  values
    (v_salon, t_cut,   'Sarah', 'sarah@voorbeeld.be', array[v_tmr_dow], '09:00', '13:00', 30, false, true, now() - interval '3 days'),
    (v_salon, t_color, 'Hanne', 'hanne@voorbeeld.be', array[v_tmr_dow], '09:00', '17:00', 60, false, true, now() - interval '2 days'),
    (v_salon, t_cut,   'Bilal', 'bilal@voorbeeld.be', array[v_tmr_dow], '10:00', '12:30', 30, true,  true, now() - interval '1 day'),
    (v_salon, t_brush, 'Lien',  'lien@voorbeeld.be',  array[v_tmr_dow], '13:00', '18:00', 30, false, true, now() - interval '5 hours');
end $$;

-- ---------- Rechten ----------
revoke execute on function public._offer_all(uuid)        from public, anon, authenticated;
revoke execute on function public._respond(uuid, boolean) from public, anon, authenticated;

grant execute on function
  public.price_for_entry(int, timestamptz, boolean, boolean, int),
  public.update_salon_settings(text, boolean, int, int),
  public.join_waitlist(text, uuid, text, smallint[], time, time, int, uuid, text, text),
  public.cancel_booking(uuid, uuid)
to anon, authenticated;

-- Demo opnieuw opzetten met de nieuwe namen en prijzen.
select public.reset_demo('studio-noor');
