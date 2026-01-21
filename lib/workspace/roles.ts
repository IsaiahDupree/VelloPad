import { createClient } from '@/lib/supabase/server';

export type WorkspaceRole = 'owner' | 'admin' | 'member';

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: string;
  updated_at: string;
  profiles: {
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

/**
 * Get all members of a workspace
 */
export async function getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('workspace_members')
    .select(
      `
      id,
      workspace_id,
      user_id,
      role,
      created_at,
      updated_at,
      profiles (
        email,
        full_name,
        avatar_url
      )
    `
    )
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching workspace members:', error);
    throw new Error('Failed to fetch workspace members');
  }

  return (data as unknown as WorkspaceMember[]) || [];
}

/**
 * Check if user has permission to manage workspace members
 * Only owners and admins can manage members
 */
export async function canManageMembers(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('user_id', userId)
    .eq('workspace_id', workspaceId)
    .single();

  return data?.role === 'owner' || data?.role === 'admin';
}

/**
 * Invite a user to workspace by email
 * Creates a pending invitation or directly adds if user exists
 */
export async function inviteMemberToWorkspace(
  workspaceId: string,
  inviterUserId: string,
  email: string,
  role: WorkspaceRole = 'member'
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Check if inviter has permission
  const hasPermission = await canManageMembers(inviterUserId, workspaceId);
  if (!hasPermission) {
    return { success: false, error: 'You do not have permission to invite members' };
  }

  // Owners can only be created during workspace creation
  if (role === 'owner') {
    return { success: false, error: 'Cannot invite as owner. Transfer ownership instead.' };
  }

  // Check if user with this email exists
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();

  if (existingProfile) {
    // User exists, add them directly
    const { data: existingMember } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', existingProfile.id)
      .single();

    if (existingMember) {
      return { success: false, error: 'User is already a member of this workspace' };
    }

    const { error } = await supabase.from('workspace_members').insert({
      workspace_id: workspaceId,
      user_id: existingProfile.id,
      role,
    });

    if (error) {
      console.error('Error adding member:', error);
      return { success: false, error: 'Failed to add member to workspace' };
    }

    return { success: true };
  }

  // User doesn't exist yet - in a full implementation, we'd create an invitation
  // For now, return an error indicating user must sign up first
  return {
    success: false,
    error: 'User must sign up for VelloPad before being invited',
  };
}

/**
 * Remove a member from workspace
 * Only owners and admins can remove members
 * Cannot remove the last owner
 */
export async function removeMemberFromWorkspace(
  workspaceId: string,
  removerUserId: string,
  memberUserId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Check if remover has permission
  const hasPermission = await canManageMembers(removerUserId, workspaceId);
  if (!hasPermission) {
    return { success: false, error: 'You do not have permission to remove members' };
  }

  // Cannot remove yourself
  if (removerUserId === memberUserId) {
    return { success: false, error: 'Cannot remove yourself. Leave workspace instead.' };
  }

  // Check if member being removed is an owner
  const { data: memberToRemove } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', memberUserId)
    .single();

  if (memberToRemove?.role === 'owner') {
    // Check if there are other owners
    const { data: owners } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('role', 'owner');

    if (owners && owners.length <= 1) {
      return { success: false, error: 'Cannot remove the last owner. Transfer ownership first.' };
    }
  }

  // Remove the member
  const { error } = await supabase
    .from('workspace_members')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('user_id', memberUserId);

  if (error) {
    console.error('Error removing member:', error);
    return { success: false, error: 'Failed to remove member from workspace' };
  }

  return { success: true };
}

/**
 * Update a member's role in workspace
 * Only owners can change roles
 */
export async function updateMemberRole(
  workspaceId: string,
  updaterUserId: string,
  memberUserId: string,
  newRole: WorkspaceRole
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Only owners can change roles
  const { data: updater } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', updaterUserId)
    .single();

  if (updater?.role !== 'owner') {
    return { success: false, error: 'Only workspace owners can change member roles' };
  }

  // Cannot change your own role
  if (updaterUserId === memberUserId) {
    return { success: false, error: 'Cannot change your own role' };
  }

  // Check if member being updated is an owner
  const { data: memberToUpdate } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', memberUserId)
    .single();

  if (memberToUpdate?.role === 'owner' && newRole !== 'owner') {
    // Demoting an owner - check if there are other owners
    const { data: owners } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('role', 'owner');

    if (owners && owners.length <= 1) {
      return {
        success: false,
        error: 'Cannot demote the last owner. Promote another member to owner first.',
      };
    }
  }

  // Update the role
  const { error } = await supabase
    .from('workspace_members')
    .update({ role: newRole })
    .eq('workspace_id', workspaceId)
    .eq('user_id', memberUserId);

  if (error) {
    console.error('Error updating member role:', error);
    return { success: false, error: 'Failed to update member role' };
  }

  return { success: true };
}

/**
 * Leave a workspace
 * Cannot leave if you're the last owner
 */
export async function leaveWorkspace(
  workspaceId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Check user's role
  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single();

  if (!member) {
    return { success: false, error: 'You are not a member of this workspace' };
  }

  // If owner, check if there are other owners
  if (member.role === 'owner') {
    const { data: owners } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('role', 'owner');

    if (owners && owners.length <= 1) {
      return {
        success: false,
        error: 'Cannot leave workspace as the last owner. Transfer ownership or delete workspace.',
      };
    }
  }

  // Leave the workspace
  const { error } = await supabase
    .from('workspace_members')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error leaving workspace:', error);
    return { success: false, error: 'Failed to leave workspace' };
  }

  return { success: true };
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: WorkspaceRole): string {
  const roleNames: Record<WorkspaceRole, string> = {
    owner: 'Owner',
    admin: 'Admin',
    member: 'Member',
  };
  return roleNames[role];
}

/**
 * Get role permissions description
 */
export function getRoleDescription(role: WorkspaceRole): string {
  const descriptions: Record<WorkspaceRole, string> = {
    owner: 'Full access to workspace settings, billing, and member management',
    admin: 'Can manage members and workspace content, but cannot modify billing',
    member: 'Can view and edit workspace content',
  };
  return descriptions[role];
}
