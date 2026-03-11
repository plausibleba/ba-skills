-- Fix: infinite recursion in RLS policies for projects table
-- The shared_select and shared_update policies referenced project_access
-- via a subquery, which triggered circular RLS evaluation.
-- Fix: use a security definer function to bypass RLS on the lookup.

-- Step 1: Drop the problematic policies
DROP POLICY IF EXISTS "shared_select_projects" ON projects;
DROP POLICY IF EXISTS "shared_update_projects" ON projects;

-- Step 2: Create a security-definer function that bypasses RLS
-- This function runs as the DB owner, not the calling user,
-- so it doesn't trigger RLS on project_access when called from a projects policy.
CREATE OR REPLACE FUNCTION get_shared_project_ids(uid UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT project_id FROM project_access WHERE user_id = uid;
$$;

-- Step 3: Recreate policies using the function
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

-- Also fix the owners_manage_access policy on project_access (same issue)
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
