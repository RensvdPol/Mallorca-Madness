-- Mallorca Madness v3 migration. Run after the original setup and v2 migration.

alter type public.user_role add value if not exists 'spectator';
alter type public.challenge_type add value if not exists 'claim';
alter type public.submission_status add value if not exists 'superseded';

alter table public.challenges
  add column if not exists available_from timestamptz,
  add column if not exists available_until timestamptz,
  add column if not exists metric_unit text,
  add column if not exists better_is text check (better_is in ('min','max'));

alter table public.submissions
  add column if not exists performance_value numeric;

-- Spectators are read-only. Participants still submit; staff still review.
drop policy if exists "Users read visible challenges" on public.challenges;
create policy "Users read visible challenges"
on public.challenges for select to authenticated
using (
  active = true
  and (available_from is null or now() >= available_from or public.is_staff())
  and (available_until is null or now() <= available_until or public.is_staff())
  and (
    challenge_type <> 'secret'
    or assigned_to = auth.uid()
    or public.is_staff()
    or exists (
      select 1 from public.submissions s
      where s.challenge_id = challenges.id and s.status = 'approved'
    )
  )
);

-- Jury may create and manage only moment-of-the-day challenges.
drop policy if exists "Staff creates moments" on public.challenges;
create policy "Staff creates moments"
on public.challenges for insert to authenticated
with check (
  public.is_staff()
  and challenge_type = 'moment'
  and repeat_type = 'first_only'
  and available_from is not null
  and available_until is not null
  and available_until::date = available_from::date
);

drop policy if exists "Staff updates moments" on public.challenges;
create policy "Staff updates moments"
on public.challenges for update to authenticated
using (public.is_staff() and challenge_type = 'moment')
with check (public.is_staff() and challenge_type = 'moment');

-- Replace duplicate logic: normal once per person, moment one active claim,
-- bonus one group submission, claim challenges accept challengers.
create or replace function public.prevent_duplicate_challenge_completion()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_repeat public.repeat_type; v_type public.challenge_type;
begin
  select c.repeat_type,c.challenge_type into v_repeat,v_type
  from public.challenges c join public.submissions s on s.challenge_id=c.id
  where s.id=new.submission_id;

  if v_repeat='once_person' and exists (
    select 1 from public.submission_participants sp
    join public.submissions old on old.id=sp.submission_id
    join public.submissions incoming on incoming.id=new.submission_id
    where sp.participant_id=new.participant_id and old.challenge_id=incoming.challenge_id
      and old.id<>incoming.id and old.status not in ('rejected','superseded')
  ) then raise exception 'Deze opdracht is al door deze deelnemer gebruikt.'; end if;

  if v_type='moment' and exists (
    select 1 from public.submissions old join public.submissions incoming on incoming.id=new.submission_id
    where old.challenge_id=incoming.challenge_id and old.id<>incoming.id
      and old.status not in ('rejected','superseded')
  ) then raise exception 'Dit moment van de dag is al geclaimd.'; end if;

  if v_type='bonus' and exists (
    select 1 from public.submissions old join public.submissions incoming on incoming.id=new.submission_id
    where old.challenge_id=incoming.challenge_id and old.id<>incoming.id
      and old.status not in ('rejected','superseded')
  ) then raise exception 'Deze groepsbonus is al ingediend.'; end if;
  return new;
end $$;

-- When jury approves a kaapbare opdracht, the previous holder loses the points.
create or replace function public.transfer_claim_on_approval()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status='approved' and old.status is distinct from 'approved'
     and exists(select 1 from public.challenges c where c.id=new.challenge_id and c.challenge_type='claim') then
    update public.submissions set status='superseded', reviewed_at=now()
    where challenge_id=new.challenge_id and id<>new.id and status='approved';
  end if;
  return new;
end $$;
drop trigger if exists transfer_claim_on_approval_trigger on public.submissions;
create trigger transfer_claim_on_approval_trigger after update of status on public.submissions
for each row execute function public.transfer_claim_on_approval();

-- Viewer-safe readable data. Existing select policies already include authenticated users.
-- Leaderboard ignores superseded records because it only sums approved submissions.

-- Realtime for participant rows if not already enabled may show duplicate-object errors;
-- ignore that single line if your project already contains it.
