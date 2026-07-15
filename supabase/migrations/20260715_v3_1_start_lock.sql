-- Mallorca Madness v3.1: hard wedstrijdslot.
-- Start: 23 juli 2026 17:00 Mallorca-tijd (CEST, UTC+2)
-- Einde: 30 juli 2026 14:00 Mallorca-tijd (CEST, UTC+2)

update public.game_settings
set starts_at = '2026-07-23 17:00:00+02',
    ends_at   = '2026-07-30 14:00:00+02';

create or replace function public.enforce_game_window_on_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start timestamptz;
  v_end timestamptz;
begin
  select starts_at, ends_at
    into v_start, v_end
  from public.game_settings
  limit 1;

  if v_start is null or v_end is null then
    raise exception 'De wedstrijdperiode is niet ingesteld.';
  end if;

  if now() < v_start then
    raise exception 'De wedstrijd start pas op 23 juli 2026 om 17:00.';
  end if;

  if now() > v_end then
    raise exception 'De wedstrijd is gesloten sinds 30 juli 2026 om 14:00.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_game_window_on_submission_trigger
on public.submissions;

create trigger enforce_game_window_on_submission_trigger
before insert on public.submissions
for each row
execute function public.enforce_game_window_on_submission();
