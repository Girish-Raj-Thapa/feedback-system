-- Add email_sent_at tracking to feedback table to prevent duplicate emails
ALTER TABLE public.feedback ADD COLUMN email_sent_at timestamp with time zone;
