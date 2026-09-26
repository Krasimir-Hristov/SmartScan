-- Migration: 20260925000001_add_stripe_customer_id_to_spaces.sql
-- Description: Adds stripe_customer_id to the spaces table for Stripe Customer Portal integration.

ALTER TABLE public.spaces
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

CREATE INDEX IF NOT EXISTS idx_spaces_stripe_customer_id ON public.spaces (stripe_customer_id);
