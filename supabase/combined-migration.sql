-- VCC Combined Migration (001 + 002 + 003 + 004)
-- Paste this entire block into Supabase Dashboard > SQL Editor > New Query > Run

-- ============================================================
-- 001: Initial Schema
-- ============================================================

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  module TEXT NOT NULL DEFAULT 'sales-discovery'
    CHECK (module IN ('sales-discovery', 'board-diagnostic', 'transformation')),
  bundle JSONB NOT NULL DEFAULT '{}'::jsonb,
  schema_version INT NOT NULL DEFAULT 1,
  revision INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);

CREATE TABLE IF NOT EXISTS project_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('view', 'edit')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_access_user ON project_access(user_id);
CREATE INDEX IF NOT EXISTS idx_project_access_project ON project_access(project_id);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_select_projects" ON projects
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "owners_insert_projects" ON projects
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "owners_update_projects" ON projects
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "owners_delete_projects" ON projects
  FOR DELETE USING (owner_id = auth.uid());

CREATE POLICY "shared_select_projects" ON projects
  FOR SELECT USING (
    id IN (SELECT project_id FROM project_access WHERE user_id = auth.uid())
  );

CREATE POLICY "shared_update_projects" ON projects
  FOR UPDATE USING (
    id IN (
      SELECT project_id FROM project_access
      WHERE user_id = auth.uid() AND permission = 'edit'
    )
  );

CREATE POLICY "owners_manage_access" ON project_access
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

CREATE POLICY "users_see_own_access" ON project_access
  FOR SELECT USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION increment_revision()
RETURNS TRIGGER AS $$
BEGIN
  NEW.revision = OLD.revision + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_increment_revision
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION increment_revision();

-- ============================================================
-- 002: Fix RLS Recursion
-- ============================================================

DROP POLICY IF EXISTS "shared_select_projects" ON projects;
DROP POLICY IF EXISTS "shared_update_projects" ON projects;

CREATE OR REPLACE FUNCTION get_shared_project_ids(uid UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT project_id FROM project_access WHERE user_id = uid;
$$;

CREATE POLICY "shared_select_projects" ON projects
  FOR SELECT USING (
    id IN (SELECT get_shared_project_ids(auth.uid()))
  );

CREATE POLICY "shared_update_projects" ON projects
  FOR UPDATE USING (
    id IN (
      SELECT pa.project_id FROM project_access pa
      WHERE pa.user_id = auth.uid() AND pa.permission = 'edit'
    )
  );

DROP POLICY IF EXISTS "owners_manage_access" ON project_access;

CREATE OR REPLACE FUNCTION is_project_owner(pid UUID, uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM projects WHERE id = pid AND owner_id = uid);
$$;

CREATE POLICY "owners_manage_access" ON project_access
  FOR ALL USING (
    is_project_owner(project_id, auth.uid())
  );

-- ============================================================
-- 003: Profiles Table
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email ON profiles (email);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_public_read" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_self_update" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

INSERT INTO profiles (id, email, display_name)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1))
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 004: Commercial Tiers
-- ============================================================

-- ─── Extend profiles table ────────────────────────────────────────────────────

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_started_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_use_cases text[] NOT NULL DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS billing_interval text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

-- ─── Usage log table ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS usage_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id    uuid REFERENCES projects(id) ON DELETE SET NULL,
  operation     text NOT NULL,
  run_id        text,
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

ALTER TABLE usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage_log_self_read" ON usage_log
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "usage_log_self_insert" ON usage_log
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ─── Helper functions ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION has_friction_analysis_available(p_user_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT
    CASE
      WHEN (SELECT tier FROM profiles WHERE id = p_user_id)
           IN ('trial', 'starter', 'individual', 'team_5', 'team_10')
           AND (
             (SELECT tier FROM profiles WHERE id = p_user_id) != 'trial'
             OR (SELECT trial_ends_at FROM profiles WHERE id = p_user_id) > now()
           )
      THEN true
      ELSE NOT EXISTS (
        SELECT 1 FROM usage_log
        WHERE user_id = p_user_id AND operation = 'friction_analysis_run'
      )
    END;
$$;

CREATE OR REPLACE FUNCTION has_use_case_access(p_user_id uuid, p_use_case text)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT
    CASE
      WHEN tier IN ('individual', 'team_5', 'team_10') THEN true
      WHEN tier = 'trial' AND trial_ends_at > now() THEN true
      WHEN tier = 'starter' AND p_use_case = ANY(active_use_cases) THEN true
      ELSE false
    END
  FROM profiles WHERE id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION can_perform_action(p_user_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT
    CASE
      WHEN tier IN ('starter', 'individual', 'team_5', 'team_10') THEN true
      WHEN tier = 'trial' AND trial_ends_at > now() THEN true
      ELSE false
    END
  FROM profiles WHERE id = p_user_id;
$$;

-- ─── Update handle_new_user to set trial on signup ───────────────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
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

-- ─── Trial expiry (optional cron cleanup) ────────────────────────────────────

CREATE OR REPLACE FUNCTION expire_stale_trials()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE profiles SET tier = 'free'
  WHERE tier = 'trial' AND trial_ends_at < now();
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;
