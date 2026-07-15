-- Mallorca Madness v4.1
-- Maakt video-bewijs mogelijk en bevestigt beheerrechten voor regels en opdrachten.

-- Maximaal 50 MB per bewijsbestand. Foto's en gangbare mobiele videoformaten.
update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array[
      'image/jpeg','image/png','image/webp',
      'video/mp4','video/quicktime','video/webm'
    ]
where id = 'proofs';

-- De admin mag opdrachten aanpassen en verwijderen.
drop policy if exists "Admins update challenges" on public.challenges;
create policy "Admins update challenges"
on public.challenges for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins delete challenges" on public.challenges;
create policy "Admins delete challenges"
on public.challenges for delete to authenticated
using (public.is_admin());

-- De admin mag spelregels toevoegen, aanpassen en verwijderen.
drop policy if exists "Admin manages rules" on public.rules;
create policy "Admin manages rules"
on public.rules for all to authenticated
using (public.is_admin())
with check (public.is_admin());
