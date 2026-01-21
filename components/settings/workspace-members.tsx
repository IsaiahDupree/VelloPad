'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface WorkspaceMembersProps {
  workspaceId: string;
  currentUserId: string;
}

interface Member {
  id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  profiles: {
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export function WorkspaceMembers({ workspaceId, currentUserId }: WorkspaceMembersProps) {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member');
  const [inviting, setInviting] = useState(false);
  const [message, setMessage] = useState('');
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);

  useEffect(() => {
    loadMembers();
  }, [workspaceId]);

  async function loadMembers() {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/members`);
      const data = await response.json();

      if (response.ok) {
        setMembers(data.members);
      }
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setMessage('');

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Member invited successfully');
        setInviteEmail('');
        loadMembers();
        router.refresh();
      } else {
        setMessage(data.error || 'Failed to invite member');
      }
    } catch (error) {
      console.error('Error inviting member:', error);
      setMessage('Failed to invite member');
    } finally {
      setInviting(false);
    }
  }

  async function handleRemoveMember() {
    if (!memberToRemove) return;

    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/members/${memberToRemove.user_id}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (response.ok) {
        setMessage('Member removed successfully');
        loadMembers();
        router.refresh();
      } else {
        setMessage(data.error || 'Failed to remove member');
      }
    } catch (error) {
      console.error('Error removing member:', error);
      setMessage('Failed to remove member');
    } finally {
      setMemberToRemove(null);
    }
  }

  async function handleUpdateRole(memberId: string, newRole: 'owner' | 'admin' | 'member') {
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/members/${memberId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: newRole }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setMessage('Role updated successfully');
        loadMembers();
        router.refresh();
      } else {
        setMessage(data.error || 'Failed to update role');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      setMessage('Failed to update role');
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>Loading members...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Invite and manage workspace members
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Invite Form */}
          <form onSubmit={handleInvite} className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-medium">Invite Member</h3>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="inviteEmail">Email Address</Label>
                <Input
                  id="inviteEmail"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inviteRole">Role</Label>
                <Select
                  value={inviteRole}
                  onValueChange={(value) => setInviteRole(value as 'member' | 'admin')}
                >
                  <SelectTrigger id="inviteRole">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" disabled={inviting}>
              {inviting ? 'Inviting...' : 'Send Invite'}
            </Button>
          </form>

          {message && (
            <p className={`text-sm ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
              {message}
            </p>
          )}

          {/* Members List */}
          <div className="space-y-3">
            <h3 className="font-medium">Current Members ({members.length})</h3>
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium">
                    {member.profiles.full_name || 'Unnamed User'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {member.profiles.email}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {member.user_id === currentUserId ? (
                    <Badge>You</Badge>
                  ) : (
                    <Select
                      value={member.role}
                      onValueChange={(value) =>
                        handleUpdateRole(member.user_id, value as any)
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="owner">Owner</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  {member.user_id !== currentUserId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setMemberToRemove(member)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Remove Member Confirmation Dialog */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{' '}
              <strong>{memberToRemove?.profiles.full_name || memberToRemove?.profiles.email}</strong>{' '}
              from this workspace? They will lose access to all workspace content.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveMember} className="bg-destructive">
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
