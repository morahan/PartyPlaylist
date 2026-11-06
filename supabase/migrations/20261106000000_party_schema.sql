-- PartyPlaylist core schema.
-- Rules mirror src/core/partyQueue.ts: the database is the source of truth and
-- enforces seats, veto quorum, go-live and finalize so concurrent writes can't
-- break them; the app runs the same rules locally for offline/optimistic updates.

create type public.party_status as enum ('gathering', 'live', 'finalized');
create type public.song_status as enum ('queued', 'played', 'vetoed');
create type public.music_service as enum ('spotify', 'apple_music', 'youtube_music', 'tidal', 'suno', 'other');

-- Profiles ------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  -- Entitlements are written only by the server (RevenueCat webhook).
  purchased boolean not null default false,
  premium boolean not null default false,
  created_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), 'Guest'));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Parties -------------------------------------------------------------------

create table public.parties (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,
  name text not null default 'Party' check (char_length(name) between 1 and 60),
  join_code text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 6)),
  status public.party_status not null default 'gathering',
  last_played_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.party_members (
  party_id uuid not null references public.parties (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default clock_timestamp(),
  primary key (party_id, user_id)
);

create table public.songs (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties (id) on delete cascade,
  added_by uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  artist text not null,
  isrc text,
  duration_ms integer check (duration_ms > 0),
  source_service public.music_service not null,
  source_url text,
  status public.song_status not null default 'queued',
  added_at timestamptz not null default clock_timestamp(),
  played_at timestamptz
);
create index songs_party_queue_idx on public.songs (party_id, status, added_at);

create table public.song_vetoes (
  song_id uuid not null references public.songs (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (song_id, user_id)
);

create table public.finalize_votes (
  party_id uuid not null references public.parties (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (party_id, user_id)
);

-- Rule helpers (keep constants in sync with src/core/partyQueue.ts) ----------

create function public.is_member(p_party uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.party_members where party_id = p_party and user_id = auth.uid()
  )
$$;

create function public.member_count(p_party uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.party_members where party_id = p_party
$$;

-- Half or more of current members.
create function public.has_quorum(p_votes integer, p_party uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_votes * 2 >= public.member_count(p_party)
$$;

-- 5 seats; 20 if any member is premium or 2+ members purchased.
-- p_joining counts a member who is about to join.
create function public.seat_limit(p_party uuid, p_joining uuid default null) returns integer
language sql stable security definer set search_path = '' as $$
  with people as (
    select p.purchased, p.premium from public.profiles p
    where p.id in (select user_id from public.party_members where party_id = p_party)
       or p.id = p_joining
  )
  select case
    when bool_or(premium) or count(*) filter (where purchased or premium) >= 2 then 20
    else 5
  end from people
$$;

-- Triggers --------------------------------------------------------------------

create function public.check_party_host() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.profiles where id = new.host_id and (purchased or premium)
  ) then
    raise exception 'Only a member who purchased the app can start a party';
  end if;
  return new;
end $$;

create trigger parties_check_host before insert on public.parties
  for each row execute function public.check_party_host();

create function public.add_host_as_member() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.party_members (party_id, user_id) values (new.id, new.host_id);
  return new;
end $$;

create trigger parties_add_host after insert on public.parties
  for each row execute function public.add_host_as_member();

create function public.check_seat() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Lock the party so two people can't take the last seat at once.
  perform 1 from public.parties where id = new.party_id for update;
  if public.member_count(new.party_id) + 1 > public.seat_limit(new.party_id, new.user_id) then
    raise exception 'Party is full';
  end if;
  return new;
end $$;

create trigger party_members_check_seat before insert on public.party_members
  for each row execute function public.check_seat();

create function public.assert_open(p_party uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if (select status from public.parties where id = p_party) = 'finalized' then
    raise exception 'Playlist is finalized';
  end if;
end $$;

create function public.check_song() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_open(new.party_id);
  if not exists (
    select 1 from public.party_members where party_id = new.party_id and user_id = new.added_by
  ) then
    raise exception 'Only party members can add songs';
  end if;
  return new;
end $$;

create trigger songs_check before insert on public.songs
  for each row execute function public.check_song();

-- Live once 3 songs have been queued; stays live.
create function public.go_live() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.parties set status = 'live'
  where id = new.party_id and status = 'gathering'
    and (select count(*) from public.songs where party_id = new.party_id and status = 'queued') >= 3;
  return new;
end $$;

create trigger songs_go_live after insert on public.songs
  for each row execute function public.go_live();

create function public.apply_veto() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_party uuid;
begin
  select party_id into v_party from public.songs where id = new.song_id and status = 'queued' for update;
  if v_party is null then
    raise exception 'Song is not in the queue';
  end if;
  perform public.assert_open(v_party);
  if not exists (select 1 from public.party_members where party_id = v_party and user_id = new.user_id) then
    raise exception 'Only party members can veto';
  end if;
  if public.has_quorum((select count(*)::integer from public.song_vetoes where song_id = new.song_id) + 1, v_party) then
    update public.songs set status = 'vetoed' where id = new.song_id;
  end if;
  return new;
end $$;

create trigger song_vetoes_apply before insert on public.song_vetoes
  for each row execute function public.apply_veto();

create function public.apply_finalize_vote() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.parties where id = new.party_id for update;
  if (select status from public.parties where id = new.party_id) <> 'live' then
    raise exception 'Add at least 3 songs before finalizing';
  end if;
  if not exists (select 1 from public.party_members where party_id = new.party_id and user_id = new.user_id) then
    raise exception 'Only party members can vote to finalize';
  end if;
  if public.has_quorum((select count(*)::integer from public.finalize_votes where party_id = new.party_id) + 1, new.party_id) then
    update public.parties set status = 'finalized' where id = new.party_id;
  end if;
  return new;
end $$;

create trigger finalize_votes_apply before insert on public.finalize_votes
  for each row execute function public.apply_finalize_vote();

-- RPCs --------------------------------------------------------------------

-- Guests join by code; they can't see a party before they're a member.
create function public.join_party(p_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_party uuid;
begin
  select id into v_party from public.parties where join_code = upper(p_code);
  if v_party is null then
    raise exception 'No party with that code';
  end if;
  insert into public.party_members (party_id, user_id) values (v_party, auth.uid())
  on conflict do nothing;
  return v_party;
end $$;

create function public.mark_played(p_song uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_song public.songs;
begin
  select * into v_song from public.songs where id = p_song and status = 'queued';
  if v_song.id is null then
    raise exception 'Song is not in the queue';
  end if;
  if (select host_id from public.parties where id = v_song.party_id) <> auth.uid() then
    raise exception 'Only the host can mark songs played';
  end if;
  update public.songs set status = 'played', played_at = now() where id = p_song;
  update public.parties set last_played_by = v_song.added_by where id = v_song.party_id;
end $$;

-- Row level security --------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.parties enable row level security;
alter table public.party_members enable row level security;
alter table public.songs enable row level security;
alter table public.song_vetoes enable row level security;
alter table public.finalize_votes enable row level security;

create policy "Read own and fellow members' profiles" on public.profiles for select to authenticated
  using (
    id = auth.uid() or exists (
      select 1 from public.party_members mine
      join public.party_members theirs on theirs.party_id = mine.party_id
      where mine.user_id = auth.uid() and theirs.user_id = profiles.id
    )
  );
create policy "Update own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
-- Only the display name is client-editable; entitlements are server-only.
revoke update on public.profiles from anon, authenticated;
grant update (display_name) on public.profiles to authenticated;

-- host_id check covers the moment before the host's membership row exists.
create policy "Members read their parties" on public.parties for select to authenticated
  using (host_id = auth.uid() or public.is_member(id));
create policy "Hosts create parties" on public.parties for insert to authenticated
  with check (host_id = auth.uid());
revoke update, delete on public.parties from anon, authenticated;

create policy "Members read membership" on public.party_members for select to authenticated
  using (public.is_member(party_id));
create policy "Members leave" on public.party_members for delete to authenticated
  using (user_id = auth.uid());
revoke insert, update on public.party_members from anon, authenticated;

create policy "Members read songs" on public.songs for select to authenticated
  using (public.is_member(party_id));
create policy "Members add their own songs" on public.songs for insert to authenticated
  with check (added_by = auth.uid() and status = 'queued');
revoke update, delete on public.songs from anon, authenticated;

create policy "Members read vetoes" on public.song_vetoes for select to authenticated
  using (exists (select 1 from public.songs s where s.id = song_id and public.is_member(s.party_id)));
create policy "Members cast their own veto" on public.song_vetoes for insert to authenticated
  with check (user_id = auth.uid());
revoke update, delete on public.song_vetoes from anon, authenticated;

create policy "Members read finalize votes" on public.finalize_votes for select to authenticated
  using (public.is_member(party_id));
create policy "Members cast their own finalize vote" on public.finalize_votes for insert to authenticated
  with check (user_id = auth.uid());
revoke update, delete on public.finalize_votes from anon, authenticated;

revoke execute on function public.join_party(text), public.mark_played(uuid) from public, anon;
grant execute on function public.join_party(text), public.mark_played(uuid) to authenticated;

-- Live updates for the party screen.
alter publication supabase_realtime add table public.parties, public.party_members, public.songs, public.song_vetoes, public.finalize_votes;
