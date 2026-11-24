-- Invaller - demo-namen bijwerken
--
-- Draai dit in de Supabase SQL-editor als je schema.sql al eerder hebt
-- uitgevoerd. Het vervangt alleen de functie reset_demo, zodat de klanten
-- met "Knippen en baard" mannelijke namen krijgen. Daarna nog een keer:
--   select public.reset_demo('studio-noor');

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

select public.reset_demo('studio-noor');
