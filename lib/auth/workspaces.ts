import { createClient } from '@/lib/supabase/server';

/**
 * Get all workspaces for a user
 */
export async function getWorkspaces(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('workspaces')
    .select(
      `
      id,
      name,
      slug,
      created_at,
      workspace_members!inner (
        role
      )
    `
    )
    .eq('workspace_members.user_id', userId);

  if (error) {
    console.error('Error fetching workspaces:', error);
    return [];
  }

  return data || [];
}

/**
 * Get user's default workspace
 */
export async function getDefaultWorkspace(userId: string) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('default_workspace_id')
    .eq('id', userId)
    .single();

  if (!profile?.default_workspace_id) {
    const workspaces = await getWorkspaces(userId);
    return workspaces[0] || null;
  }

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', profile.default_workspace_id)
    .single();

  return workspace;
}

/**
 * Check if user has access to workspace
 */
export async function hasWorkspaceAccess(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('user_id', userId)
    .eq('workspace_id', workspaceId)
    .single();

  return !!data;
}

/**
 * Get user's role in workspace
 */
export async function getWorkspaceRole(userId: string, workspaceId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('user_id', userId)
    .eq('workspace_id', workspaceId)
    .single();

  return data?.role || null;
}
