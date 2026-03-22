-- ============================================================================
-- 004_commercial_tiers.sql
-- VCC Commercial Model: tier structure, trial management, usage tracking
-- ============================================================================

-- ─── Extend profiles table ────────────────────────────────────────────────────

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'free';
-- Valid values: 'free', 'trial', 'starter', 'individual', 'team_5', 'team_10'

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_started_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_use_cases text[] NOT NULL DEFAULT '{}';
-- Valid values in array: 'solution_engineering', 'board_diagnostic',
--   'transformation_planning', 'agentic_governance'
-- Empty = free tier (no paid use cases)
-- On Individual/Team tiers, all four are included automatically — checked in helper functions

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS billing_interval text;
-- Values: 'monthly', 'annual'

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id text;


-- ─── Usage log table ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS usage_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id    uuid REFERENCES projects(id) ON DELETE SET NULL,
  operation     text NOT NULL,
  -- operation values:
  --   'friction_analysis_run'  — a full friction assessment (may span multiple VS)
  --   'solution_enrichment'    — enrichment pass
  --   'card_generation'        — concept/policy card creation
  --   'workshop_session'       — workshop mode session
  --   'scenario_planning'      — scenario planning session
  run_id        text,
  -- Groups operations belonging to the same logical run (e.g. multi-VS friction)
  input_tokens  integer,
  output_tokens integer,
  cost_usd      numeric(10,6),
  metadata      jsonb DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_log_user_op
  ON usage_log(user_id, operation);

CREATE INDEX IF NOT EXISTS idx_usage_log_created
  ON usage_log(created_at DESC);

-- RLS: users can only see their own usage
ALTER TABLE usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage_log_self_read" ON usage_log
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "usage_log_self_insert" ON usage_log
  FOR INSERT WITH CHECK (user_id = auth.uid());


-- ─── Helper: check if user has friction analysis available ────────────────────
-- Free tier gets 1 full run. Paid tiers get unlimited.

CREATE OR REPLACE FUNCTION has_friction_analysis_available(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    CASE
      -- Paid tiers (including active trial): always allowed
      WHEN (SELECT tier FROM profiles WHERE id = p_user_id)
           IN ('trial', 'starter', 'individual', 'team_5', 'team_10')
           AND (
             (SELECT tier FROM profiles WHERE id = p_user_id) != 'trial'
             OR (SELECT trial_ends_at FROM profiles WHERE id = p_user_id) > now()
           )
      THEN true
      -- Free tier: allowed if no previous friction_analysis_run exists
      ELSE NOT EXISTS (
        SELECT 1 FROM usage_log
        WHERE user_id = p_user_id
          AND operation = 'friction_analysis_run'
      )
    END;
$$;


-- ─── Helper: check use case access ───────────────────────────────────────────
-- Individual/Team tiers have all use cases.
-- Starter tier has only the use cases in active_use_cases array.
-- Trial has all use cases while active.
-- Free has none.

CREATE OR REPLACE FUNCTION has_use_case_access(
  p_user_id  uuid,
  p_use_case text
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    CASE
      -- Individual or Team: all use cases
      WHEN tier IN ('individual', 'team_5', 'team_10') THEN true
      -- Trial: all use cases while active
      WHEN tier = 'trial' AND trial_ends_at > now() THEN true
      -- Starter: only active use cases
      WHEN tier = 'starter' AND p_use_case = ANY(active_use_cases) THEN true
      -- Free or expired trial: no access
      ELSE false
    END
  FROM profiles
  WHERE id = p_user_id;
$$;


-- ─── Helper: check if user can perform any write/execute action ──────────────
-- Quick boolean for the frontend gate check

CREATE OR REPLACE FUNCTION can_perform_action(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    CASE
      WHEN tier IN ('starter', 'individual', 'team_5', 'team_10') THEN true
      WHEN tier = 'trial' AND trial_ends_at > now() THEN true
      ELSE false
    END
  FROM profiles
  WHERE id = p_user_id;
$$;


-- ─── Update handle_new_user to set trial columns ─────────────────────────────
-- Trial starts at account creation, lasts 15 days

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name, tier, trial_started_at, trial_ends_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    'trial',
    now(),
    now() + interval '15 days'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    tier = CASE WHEN profiles.tier = 'free' THEN 'trial' ELSE profiles.tier END,
    trial_started_at = CASE WHEN profiles.trial_started_at IS NULL THEN now() ELSE profiles.trial_started_at END,
    trial_ends_at = CASE WHEN profiles.trial_ends_at IS NULL THEN now() + interval '15 days' ELSE profiles.trial_ends_at END;
  RETURN NEW;
END;
$$;


-- ─── Cron-like: expire trials (run periodically or check on access) ──────────
-- This function can be called from a Supabase edge function or cron job
-- to batch-expire trials. The helper functions already check trial_ends_at
-- in real-time, so this is optional cleanup.

CREATE OR REPLACE FUNCTION expire_stale_trials()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE profiles
  SET tier = 'free'
  WHERE tier = 'trial'
    AND trial_ends_at < now();
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;
