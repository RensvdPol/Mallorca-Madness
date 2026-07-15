-- Mallorca Madness v4
-- Verwijdert het startslot en geeft admins rechten voor opdrachtbeheer en profielfoto's.

drop trigger if exists enforce_game_window_on_submission_trigger on public.submissions;
drop function if exists public.enforce_game_window_on_submission();

-- Nieuwe inzendingen blijven na de officiële eindtijd door de website geblokkeerd.
-- Er is geen databaseblokkade meer vóór 23 juli 17:00.

drop policy if exists "Admins delete challenges" on public.challenges;
create policy "Admins delete challenges"
on public.challenges for delete to authenticated
using (public.is_admin());

drop policy if exists "Admins update all profiles" on public.profiles;
create policy "Admins update all profiles"
on public.profiles for update to authenticated
using (public.is_admin())
with check (public.is_admin());
