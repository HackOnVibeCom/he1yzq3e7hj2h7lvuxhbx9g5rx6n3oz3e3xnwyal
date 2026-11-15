-- Little Things · room storage
--
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to run again; every statement is idempotent.
--
-- Shape of the deal: the browser holds the anon key, so the anon key must not be
-- able to do anything we would not let a stranger do. All room tables have row level
-- security on and NO policies, which means the anon key cannot touch them at all.
-- The functions below are `security definer`, so they run as the owner and
-- are the only way in. They are where the rules live.

create table if not exists public.rooms (
  id         text primary key,
  created_at timestamptz not null default now()
);

alter table public.rooms add column if not exists pack_version integer not null default 1;
-- Seats in the round. Starts at five; each finished example ad adds one, up to 20.
alter table public.rooms add column if not exists capacity integer not null default 5;

create table if not exists public.submissions (
  id         bigint generated always as identity primary key,
  room_id    text not null references public.rooms(id) on delete cascade,
  nickname   text not null,
  answers    jsonb not null,
  token      text not null,
  avatar     integer not null default 0,
  created_at timestamptz not null default now(),
  unique (room_id, token)
);

create table if not exists public.room_players (
  room_id text not null references public.rooms(id) on delete cascade,
  token text not null,
  primary key (room_id, token)
);

alter table public.room_players enable row level security;

-- One row per finished example ad, so a retried request cannot add a seat twice.
create table if not exists public.room_ad_rewards (
  room_id    text not null references public.rooms(id) on delete cascade,
  attempt    text not null,
  created_at timestamptz not null default now(),
  primary key (room_id, attempt)
);

alter table public.room_ad_rewards enable row level security;

insert into public.room_players (room_id, token)
select room_id, token from public.submissions
on conflict do nothing;

create index if not exists submissions_room_idx on public.submissions (room_id, created_at);

alter table public.rooms       enable row level security;
alter table public.submissions enable row level security;
-- Deliberately no policies. Direct table access through the anon key returns nothing.


-- Open a room. Returns its 24-character id.
create or replace function public.create_room()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id text;
begin
  for attempt in 1..5 loop
    new_id := substr(md5(random()::text || clock_timestamp()::text || pg_backend_pid()::text), 1, 24);
    begin
      insert into rooms (id, pack_version) values (new_id, 2);
      return new_id;
    exception when unique_violation then
      -- astronomically unlikely; try again rather than hand back a taken id
    end;
  end loop;
  raise exception 'could not allocate a room id';
end;
$$;


-- Opening an invite does not reserve a seat. Start Quiz does.
create or replace function public.join_room(p_room text, p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_token is null or p_token !~ '^[a-f0-9]{36}$' then
    raise exception 'invalid player token' using errcode = '22023';
  end if;
  perform 1 from rooms where id = p_room for update;
  if not found then
    raise exception 'room not found' using errcode = 'P0002';
  end if;
  if exists (select 1 from room_players where room_id = p_room and token = p_token) then
    return jsonb_build_object('joined', true);
  end if;
  if (select count(*) from room_players where room_id = p_room) >= (select capacity from rooms where id = p_room) then
    return jsonb_build_object('joined', false);
  end if;
  insert into room_players (room_id, token) values (p_room, p_token);
  return jsonb_build_object('joined', true);
end;
$$;

-- A room's progress is public. Answers require membership, submission and a
-- at least two submitted answers.
create or replace function public.read_room(p_room text, p_token text)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  with progress as (
    select
      (select count(*) from room_players where room_id = p_room) as joined,
      (select count(*) from submissions where room_id = p_room) as submitted_count,
      exists (select 1 from room_players where room_id = p_room and token = p_token) as member,
      exists (select 1 from submissions where room_id = p_room and token = p_token) as submitted
  )
  select jsonb_build_object(
    'joined', joined,
    'capacity', (select capacity from rooms where id = p_room),
    'packVersion', (select pack_version from rooms where id = p_room),
    'count', submitted_count,
    'member', member,
    'submitted', submitted,
    'submissions', case when submitted and submitted_count >= 2 then
      (select jsonb_agg(jsonb_build_object('nickname', nickname, 'answers', answers, 'avatar', avatar)
                        order by created_at, id)
       from submissions where room_id = p_room)
      else '[]'::jsonb end
  )
  from progress
  where exists (select 1 from rooms where id = p_room);
$$;

-- Record one player's answers. Submitting twice with the same token does nothing,
-- so a double tap or a page reload cannot put a player in the room twice.
create or replace function public.submit_answers(
  p_room     text,
  p_nickname text,
  p_answers  jsonb,
  p_token    text,
  p_avatar   integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from rooms where id = p_room) then
    raise exception 'room not found' using errcode = 'P0002';
  end if;

  if p_nickname is null or btrim(p_nickname) = '' or length(p_nickname) > 24
     or p_token is null or p_token !~ '^[a-f0-9]{36}$'
     or p_avatar is null or p_avatar < 0 or p_avatar > 19
     or jsonb_typeof(p_answers) <> 'array' or jsonb_array_length(p_answers) <> 8 then
    raise exception 'invalid submission' using errcode = '22023';
  end if;

  if not exists (select 1 from room_players where room_id = p_room and token = p_token) then
    raise exception 'join the room first' using errcode = '42501';
  end if;

  insert into submissions (room_id, nickname, answers, token, avatar)
  values (p_room, btrim(p_nickname), p_answers, p_token, p_avatar)
  on conflict (room_id, token) do nothing;

  return jsonb_build_object('submitted', true);
end;
$$;


-- Only these functions are reachable from the browser.
revoke all on function public.create_room()                                     from public;
revoke all on function public.read_room(text, text)                             from public;
revoke all on function public.submit_answers(text, text, jsonb, text, integer)  from public;

grant execute on function public.create_room()                                    to anon, authenticated;
grant execute on function public.read_room(text, text)                            to anon, authenticated;
grant execute on function public.submit_answers(text, text, jsonb, text, integer) to anon, authenticated;

revoke all on function public.join_room(text, text) from public;
grant execute on function public.join_room(text, text) to anon, authenticated;

-- Example ad reward. A member who finishes the five-second example ad while the
-- round is full unlocks one more seat. The same attempt id never counts twice.
create or replace function public.unlock_example_spot(p_room text, p_token text, p_attempt text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  seats integer;
begin
  if p_attempt is null or p_attempt !~ '^[a-f0-9-]{36}$' then
    raise exception 'invalid attempt' using errcode = '22023';
  end if;
  select capacity into seats from rooms where id = p_room for update;
  if not found then
    raise exception 'room not found' using errcode = 'P0002';
  end if;
  if not exists (select 1 from room_players where room_id = p_room and token = p_token) then
    raise exception 'join the room first' using errcode = '42501';
  end if;
  if exists (select 1 from room_ad_rewards where room_id = p_room and attempt = p_attempt) then
    return jsonb_build_object('unlocked', true);
  end if;
  if seats >= 20 or (select count(*) from room_players where room_id = p_room) < seats then
    return jsonb_build_object('unlocked', false);
  end if;
  insert into room_ad_rewards (room_id, attempt) values (p_room, p_attempt);
  update rooms set capacity = seats + 1 where id = p_room;
  return jsonb_build_object('unlocked', true);
end;
$$;

revoke all on function public.unlock_example_spot(text, text, text) from public;
grant execute on function public.unlock_example_spot(text, text, text) to anon, authenticated;
