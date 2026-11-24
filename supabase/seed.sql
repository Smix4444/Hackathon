insert into public.salons (slug, name, city, offer_seconds, typical_wait_days)
values ('studio-noor', 'Studio Noor', 'Antwerpen', 60, 14)
on conflict (slug) do nothing;

insert into public.treatments (salon_id, name, duration_min, price_cents, sort)
select s.id, v.name, v.dur, v.price, v.sort
from public.salons s,
     (values ('Knippen', 30, 3200, 1),
             ('Knippen en baard', 45, 4200, 2),
             ('Kleuren', 90, 8500, 3),
             ('Brushing', 30, 2800, 4)) as v(name, dur, price, sort)
where s.slug = 'studio-noor'
  and not exists (select 1 from public.treatments t where t.salon_id = s.id);

select public.reset_demo('studio-noor');
