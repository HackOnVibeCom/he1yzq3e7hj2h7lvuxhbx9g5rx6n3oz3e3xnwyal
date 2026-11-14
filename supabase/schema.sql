-- Little Things · room storage
--
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to run again; every statement is idempotent.
--
-- Shape of the deal: the browser holds the anon key, so the anon key must not be
-- able to do anything we would not let a stranger do. Both tables have row level
-- security on and NO policies, which means the anon key cannot touch them at all.
-- The three functions below are `security definer`, so they run as the owner and
-- are the only way in. They are where the rules live.

create table if not exists public.rooms (
  id         text primary key,
  created_at timestamptz not null default now()
);

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
      insert into rooms (id) values (new_id);
      return new_id;
    exception when unique_violation then
      -- astronomically unlikely; try again rather than hand back a taken id
    end;
  end loop;
  raise exception 'could not allocate a room id';
end;
$$;


-- Read a room through one player's eyes.
--
-- The count is public: a player waiting on friends needs to see the number grow.
-- The answers are not. They come back only when p_token already belongs to a
-- submission in this room, which is the "you answer first, then you get to look"
-- rule. Tokens themselves never leave the database.
--
-- Returns null when the room does not exist, which the client reads as 404.
create or replace function public.read_room(p_room text, p_token text)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select jsonb_build_object(
    'count', (select count(*) from submissions where room_id = p_room),
    'submissions', coalesce((
      select jsonb_agg(
               jsonb_build_object('nickname', s.nickname, 'answers', s.answers, 'avatar', s.avatar)
               order by s.created_at
             )
      from submissions s
      where s.room_id = p_room
        and exists (select 1 from submissions mine
                    where mine.room_id = p_room and mine.token = p_token)
    ), '[]'::jsonb)
  )
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

  insert into submissions (room_id, nickname, answers, token, avatar)
  values (p_room, btrim(p_nickname), p_answers, p_token, p_avatar)
  on conflict (room_id, token) do nothing;

  return jsonb_build_object('submitted', true);
end;
$$;


-- Only these three are reachable from the browser.
revoke all on function public.create_room()                                     from public;
revoke all on function public.read_room(text, text)                             from public;
revoke all on function public.submit_answers(text, text, jsonb, text, integer)  from public;

grant execute on function public.create_room()                                    to anon, authenticated;
grant execute on function public.read_room(text, text)                            to anon, authenticated;
grant execute on function public.submit_answers(text, text, jsonb, text, integer) to anon, authenticated;
