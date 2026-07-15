-- Mallorca Madness v2 migration
-- Run once in Supabase SQL Editor.

create table if not exists public.ai_summaries (
  id bigint generated always as identity primary key,
  summary_date date not null unique,
  headline text not null,
  summary text not null,
  predicted_winner text not null,
  confidence integer not null check (confidence between 0 and 100),
  created_at timestamptz not null default now()
);

alter table public.ai_summaries enable row level security;

drop policy if exists "Authenticated users read AI summaries" on public.ai_summaries;
create policy "Authenticated users read AI summaries"
on public.ai_summaries for select to authenticated using (true);

drop policy if exists "Admin manages AI summaries" on public.ai_summaries;
create policy "Admin manages AI summaries"
on public.ai_summaries for all to authenticated
using (public.is_admin()) with check (public.is_admin());

grant select on public.ai_summaries to authenticated;

create or replace function public.prevent_duplicate_challenge_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_repeat public.repeat_type;
begin
  select c.repeat_type into v_repeat
  from public.challenges c
  join public.submissions s on s.challenge_id = c.id
  where s.id = new.submission_id;

  if v_repeat = 'once_person' and exists (
    select 1
    from public.submission_participants sp
    join public.submissions existing on existing.id = sp.submission_id
    join public.submissions incoming on incoming.id = new.submission_id
    where sp.participant_id = new.participant_id
      and existing.challenge_id = incoming.challenge_id
      and existing.id <> incoming.id
      and existing.status <> 'rejected'
  ) then
    raise exception 'Deze opdracht is al door deze deelnemer gebruikt.';
  end if;

  if v_repeat = 'first_only' and exists (
    select 1
    from public.submissions existing
    join public.submissions incoming on incoming.id = new.submission_id
    where existing.challenge_id = incoming.challenge_id
      and existing.id <> incoming.id
      and existing.status <> 'rejected'
  ) then
    raise exception 'Dit moment van de dag is al geclaimd.';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_duplicate_challenge_completion_trigger on public.submission_participants;
create trigger prevent_duplicate_challenge_completion_trigger
before insert on public.submission_participants
for each row execute function public.prevent_duplicate_challenge_completion();
