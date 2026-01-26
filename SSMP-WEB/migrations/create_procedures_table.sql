-- Execute este SQL no Supabase SQL Editor
-- https://supabase.com/dashboard/project/tofbruviyllvdmcllgjx/sql

-- Create procedures table
create table if not exists procedures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  icon text default 'healing',
  description text,
  scripts jsonb default '[]'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table procedures enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Users can view their own procedures" on procedures;
drop policy if exists "Users can insert their own procedures" on procedures;
drop policy if exists "Users can update their own procedures" on procedures;
drop policy if exists "Users can delete their own procedures" on procedures;

-- Create RLS Policies
create policy "Users can view their own procedures"
  on procedures for select
  using (auth.uid() = user_id);

create policy "Users can insert their own procedures"
  on procedures for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own procedures"
  on procedures for update
  using (auth.uid() = user_id);

create policy "Users can delete their own procedures"
  on procedures for delete
  using (auth.uid() = user_id);

-- Create indexes for better query performance
create index if not exists procedures_user_id_idx on procedures(user_id);
create index if not exists procedures_created_at_idx on procedures(created_at desc);
