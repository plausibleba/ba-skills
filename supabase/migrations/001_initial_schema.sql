-- VCC Backend Schema (D-109: Minimum Backend Schema for Sales Team Trial)
-- Run via Supabase Dashboard > SQL Editor, or `supabase db push`

-- ============================================================
-- Projects table — stores VCC bundles as JSONB (D-110)
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

-- Index for owner lookups
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);

-- ============================================================
-- Project access grants — sharing with view/edit permissions
-- ============================================================
CREATE TABLE IF NOT EXISTS project_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('view', 'edit')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Index for user access lookups
CREATE INDEX IF NOT EXISTS idx_project_access_user ON project_access(user_id);
CREATE INDEX IF NOT EXISTS idx_project_access_project ON project_access(project_id);

-- ============================================================
-- Row Level Security (D-109: RLS enforces project isolation)
-- ============================================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_access ENABLE ROW LEVEL SECURITY;

-- Projects: owners can do everything
CREATE POLICY "owners_select_projects" ON projects
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "owners_insert_projects" ON projects
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "owners_update_projects" ON projects
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "owners_delete_projects" ON projects
  FOR DELETE USING (owner_id = auth.uid());

-- Projects: shared users can view
CREATE POLICY "shared_select_projects" ON projects
  FOR SELECT USING (
    id IN (SELECT project_id FROM project_access WHERE user_id = auth.uid())
  );

-- Projects: shared users with 'edit' permission can update
CREATE POLICY "shared_update_projects" ON projects
  FOR UPDATE USING (
    id IN (
      SELECT project_id FROM project_access
      WHERE user_id = auth.uid() AND permission = 'edit'
    )
  );

-- Project access: owners of the project can manage access grants
CREATE POLICY "owners_manage_access" ON project_access
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

-- Project access: users can see their own access grants
CREATE POLICY "users_see_own_access" ON project_access
  FOR SELECT USING (user_id = auth.uid());

-- ============================================================
-- Auto-update updated_at on project changes
-- ============================================================
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

-- ============================================================
-- Optimistic locking helper — increment revision on update
-- ============================================================
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
