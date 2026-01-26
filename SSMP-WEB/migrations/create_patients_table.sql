-- Execute este SQL no Supabase SQL Editor
-- https://supabase.com/dashboard/project/tofbruviyllvdmcllgjx/sql

-- Create patients table
create table if not exists patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  phone text not null,
  email text,
  dob text,
  cpf text,
  procedures jsonb default '[]'::jsonb,
  procedure_date text,
  last_visit text default '-',
  status text default 'No Prazo',
  progress integer default 0,
  tasks_completed integer default 0,
  total_tasks integer default 0,
  photos jsonb default '[]'::jsonb,
  avatar text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table patients enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Users can view their own patients" on patients;
drop policy if exists "Users can insert their own patients" on patients;
drop policy if exists "Users can update their own patients" on patients;
drop policy if exists "Users can delete their own patients" on patients;

-- Create RLS Policies
create policy "Users can view their own patients"
  on patients for select
  using (auth.uid() = user_id);

create policy "Users can insert their own patients"
  on patients for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own patients"
  on patients for update
  using (auth.uid() = user_id);

create policy "Users can delete their own patients"
  on patients for delete
  using (auth.uid() = user_id);

-- Create indexes for better query performance
create index if not exists patients_user_id_idx on patients(user_id);
create index if not exists patients_created_at_idx on patients(created_at desc);
