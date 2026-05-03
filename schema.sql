create schema if not exists academy;
create extension if not exists pgcrypto;

create table if not exists academy.teams (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  member1_name text not null,
  member2_name text not null,
  member3_name text,
  access_code text unique,
  github_url text,
  vercel_url text,
  avatar_emoji text default '🚀',
  total_score integer default 0,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create table if not exists academy.missions (
  id uuid default gen_random_uuid() primary key,
  code text not null unique,
  title text not null,
  description text,
  persona text,
  persona_scenario text,
  prompt_windsurf text,
  display_mode text check (display_mode in (
    'all_visible',
    'progressive',
    'sections',
    'free'
  )) default 'all_visible',
  order_index integer not null,
  is_locked boolean default true,
  points_total integer default 100,
  created_at timestamp default now()
);

alter table academy.missions
  add column if not exists display_mode text check (display_mode in (
    'all_visible',
    'progressive',
    'sections',
    'free'
  )) default 'all_visible';

drop table if exists academy.steps cascade;
drop table if exists academy.progress cascade;

create table if not exists academy.blocks (
  id uuid default gen_random_uuid() primary key,
  mission_id uuid references academy.missions(id) on delete cascade,
  type text check (type in (
    'rich_content',
    'theory',
    'qcm',
    'text_answer',
    'url',
    'screenshot',
    'prompt',
    'video',
    'checklist',
    'code_execute',
    'separator',
    'subtask'
  )) not null,
  parent_block_id uuid references academy.blocks(id) on delete cascade,
  title text,
  content text,
  prompt_code text,
  options jsonb,
  correct_answer text,
  feedback_wrong text,
  checklist_items jsonb,
  video_url text,
  video_must_complete boolean default false,
  code_command text,
  code_expected_output text,
  points integer default 10,
  is_blocking boolean default true,
  order_index integer not null,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

alter table academy.blocks
  add column if not exists parent_block_id uuid references academy.blocks(id) on delete cascade;

create index if not exists blocks_mission_order_index on academy.blocks (mission_id, parent_block_id, order_index);

create table if not exists academy.block_progress (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references academy.teams(id) on delete cascade,
  block_id uuid references academy.blocks(id) on delete cascade,
  mission_id uuid references academy.missions(id),
  status text check (status in (
    'locked',
    'in_progress',
    'completed',
    'correct',
    'submitted',
    'validated',
    'rejected'
  )) default 'locked',
  answer text,
  screenshot_urls text[],
  checklist_state jsonb,
  attempts integer default 0,
  points_earned integer default 0,
  team_comment text,
  formateur_comment text,
  started_at timestamp,
  completed_at timestamp,
  submitted_at timestamp,
  validated_at timestamp,
  duration_seconds integer,
  created_at timestamp default now(),
  updated_at timestamp default now(),
  unique(team_id, block_id)
);

create table if not exists academy.exercises (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text not null,
  type text check (type in ('find_api', 'debug', 'quiz', 'screenshot', 'url')) not null,
  correct_answer text,
  points integer default 50,
  bonus_first integer default 20,
  time_limit_seconds integer default 900,
  hint text,
  is_active boolean default false,
  activated_at timestamp,
  closes_at timestamp,
  created_at timestamp default now()
);

create table if not exists academy.exercise_submissions (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references academy.teams(id) on delete cascade,
  exercise_id uuid references academy.exercises(id) on delete cascade,
  answer text,
  screenshot_url text,
  is_correct boolean,
  points_earned integer default 0,
  is_first boolean default false,
  submitted_at timestamp default now(),
  unique(team_id, exercise_id)
);

create table if not exists academy.score_history (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references academy.teams(id) on delete cascade,
  points integer not null,
  reason text not null,
  created_at timestamp default now()
);

create table if not exists academy.announcements (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text,
  type text check (type in ('info', 'warning', 'success', 'exercise')) default 'info',
  is_active boolean default true,
  created_at timestamp default now()
);

create table if not exists academy.badges (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  title text not null,
  description text,
  emoji text not null,
  points_bonus integer default 0,
  created_at timestamp default now()
);

create table if not exists academy.team_badges (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references academy.teams(id),
  badge_id uuid references academy.badges(id),
  earned_at timestamp default now(),
  unique(team_id, badge_id)
);

create table if not exists academy.display_state (
  id integer primary key default 1,
  mode text check (mode in ('leaderboard', 'scores', 'exercise', 'progress', 'screenshots')) default 'leaderboard',
  updated_at timestamp default now(),
  check (id = 1)
);

insert into academy.display_state (id, mode) values (1, 'leaderboard') on conflict (id) do nothing;

alter table academy.teams enable row level security;
alter table academy.missions enable row level security;
alter table academy.blocks enable row level security;
alter table academy.block_progress enable row level security;
alter table academy.exercises enable row level security;
alter table academy.exercise_submissions enable row level security;
alter table academy.score_history enable row level security;
alter table academy.announcements enable row level security;
alter table academy.badges enable row level security;
alter table academy.team_badges enable row level security;
alter table academy.display_state enable row level security;

drop policy if exists "Public read" on academy.teams;
create policy "Public read" on academy.teams for select using (true);

alter table academy.teams
  add column if not exists member3_name text;

alter table academy.teams
  add column if not exists access_code text unique;
drop policy if exists "Public read" on academy.missions;
create policy "Public read" on academy.missions for select using (true);
drop policy if exists "Public read blocks" on academy.blocks;
create policy "Public read blocks" on academy.blocks for select using (true);
drop policy if exists "Public read block_progress" on academy.block_progress;
create policy "Public read block_progress" on academy.block_progress for select using (true);
drop policy if exists "Public read" on academy.exercises;
create policy "Public read" on academy.exercises for select using (true);
drop policy if exists "Public read" on academy.exercise_submissions;
create policy "Public read" on academy.exercise_submissions for select using (true);
drop policy if exists "Public read" on academy.score_history;
create policy "Public read" on academy.score_history for select using (true);
drop policy if exists "Public read" on academy.announcements;
create policy "Public read" on academy.announcements for select using (true);
drop policy if exists "Public read badges" on academy.badges;
create policy "Public read badges" on academy.badges for select using (true);
drop policy if exists "Public read team_badges" on academy.team_badges;
create policy "Public read team_badges" on academy.team_badges for select using (true);
drop policy if exists "Public read display_state" on academy.display_state;
create policy "Public read display_state" on academy.display_state for select using (true);

create or replace function academy.update_team_score()
returns trigger as $$
begin
  update academy.teams
  set total_score = (
    select coalesce(sum(points), 0)
    from academy.score_history
    where team_id = new.team_id
  ),
  updated_at = now()
  where id = new.team_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_score_added on academy.score_history;
create trigger on_score_added
  after insert on academy.score_history
  for each row execute procedure academy.update_team_score();

create or replace function academy.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists teams_touch_updated_at on academy.teams;
create trigger teams_touch_updated_at
  before update on academy.teams
  for each row execute procedure academy.touch_updated_at();

drop trigger if exists blocks_touch_updated_at on academy.blocks;
create trigger blocks_touch_updated_at
  before update on academy.blocks
  for each row execute procedure academy.touch_updated_at();

alter table academy.blocks
  add column if not exists parent_block_id uuid references academy.blocks(id) on delete cascade;

drop index if exists academy.blocks_mission_order_unique;
create index if not exists blocks_mission_order_index on academy.blocks (mission_id, parent_block_id, order_index);

do $$
begin
  alter table academy.blocks drop constraint if exists blocks_type_check;
  alter table academy.blocks add constraint blocks_type_check check (type in (
    'rich_content',
    'theory',
    'qcm',
    'text_answer',
    'url',
    'screenshot',
    'prompt',
    'video',
    'checklist',
    'code_execute',
    'separator',
    'subtask'
  ));
end $$;

drop trigger if exists block_progress_touch_updated_at on academy.block_progress;
create trigger block_progress_touch_updated_at
  before update on academy.block_progress
  for each row execute procedure academy.touch_updated_at();

insert into academy.badges (code, title, description, emoji, points_bonus)
values
  ('first_blood', 'Premier Sang', 'Premiere etape validee', '🔥', 10),
  ('speed_run', 'Speed Run', 'Mission validee en moins d1 heure', '⚡', 20),
  ('bullseye', 'Bullseye', 'QCM reussi du premier coup', '🎯', 5),
  ('no_reject', 'Sans Faute', 'Mission validee sans aucun refus', '🏆', 15),
  ('early_bird', 'Early Bird', 'Premiere equipe a finir une mission', '🚀', 25),
  ('perfectionist', 'Perfectionniste', 'Toutes les etapes validees en une fois', '💎', 30)
on conflict (code) do nothing;

insert into storage.buckets (id, name, public)
values ('screenshots', 'screenshots', true)
on conflict (id) do update set public = true;

drop policy if exists "Public screenshot upload" on storage.objects;
drop policy if exists "Anyone can upload screenshots" on storage.objects;
create policy "Anyone can upload screenshots" on storage.objects for insert to public with check (bucket_id = 'screenshots');

drop policy if exists "Public screenshot read" on storage.objects;
drop policy if exists "Anyone can read screenshots" on storage.objects;
create policy "Anyone can read screenshots" on storage.objects for select to public using (bucket_id = 'screenshots');

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'academy' and tablename = 'block_progress') then
    alter publication supabase_realtime add table academy.block_progress;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'academy' and tablename = 'score_history') then
    alter publication supabase_realtime add table academy.score_history;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'academy' and tablename = 'exercises') then
    alter publication supabase_realtime add table academy.exercises;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'academy' and tablename = 'exercise_submissions') then
    alter publication supabase_realtime add table academy.exercise_submissions;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'academy' and tablename = 'display_state') then
    alter publication supabase_realtime add table academy.display_state;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'academy' and tablename = 'team_badges') then
    alter publication supabase_realtime add table academy.team_badges;
  end if;
exception
  when undefined_object then null;
end $$;

grant usage on schema academy to anon, authenticated, service_role;

grant select on all tables in schema academy to anon, authenticated;
grant all privileges on all tables in schema academy to service_role;
grant all privileges on all sequences in schema academy to service_role;
grant execute on all functions in schema academy to service_role;

alter default privileges in schema academy
  grant select on tables to anon, authenticated;
alter default privileges in schema academy
  grant all privileges on tables to service_role;
alter default privileges in schema academy
  grant all privileges on sequences to service_role;
alter default privileges in schema academy
  grant execute on functions to service_role;
