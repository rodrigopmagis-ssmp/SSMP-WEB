-- Migration to add phone column to profiles table
-- This is necessary for sending WhatsApp extracts to professionals

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Update RLS if needed (usually profiles already have policies)
-- Assuming existing policies allow users to view their own profile and admins to view all.
