
-- STAP 1: Alleen enum types toevoegen
ALTER TYPE module_key ADD VALUE IF NOT EXISTS 'onboarding';

CREATE TYPE onboarding_status AS ENUM (
  'active', 'hired', 'rejected', 'withdrawn', 'no_response', 'expired'
);
