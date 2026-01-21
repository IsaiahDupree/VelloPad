'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { WorkspaceMembers } from './workspace-members';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface WorkspaceSettingsProps {
  workspaces: any[];
  userId: string;
}

export function WorkspaceSettings({ workspaces, userId }: WorkspaceSettingsProps) {
  const router = useRouter();
  const [selectedWorkspace, setSelectedWorkspace] = useState(workspaces[0] || null);
  const [workspaceName, setWorkspaceName] = useState(selectedWorkspace?.name || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleUpdateWorkspace(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedWorkspace) return;

    setLoading(true);
    setMessage('');

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('workspaces')
        .update({ name: workspaceName })
        .eq('id', selectedWorkspace.id);

      if (error) throw error;

      setMessage('Workspace updated successfully');
      router.refresh();
    } catch (error) {
      console.error('Error updating workspace:', error);
      setMessage('Failed to update workspace');
    } finally {
      setLoading(false);
    }
  }

  if (!selectedWorkspace) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Workspace</CardTitle>
          <CardDescription>You don't belong to any workspace yet.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const isOwnerOrAdmin = selectedWorkspace.role === 'owner' || selectedWorkspace.role === 'admin';

  return (
    <>
      {workspaces.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Workspaces</CardTitle>
            <CardDescription>Switch between workspaces</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                onClick={() => {
                  setSelectedWorkspace(workspace);
                  setWorkspaceName(workspace.name);
                }}
                className={`w-full p-3 text-left rounded-lg border transition-colors ${
                  selectedWorkspace.id === workspace.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{workspace.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {workspace.slug}
                    </div>
                  </div>
                  <Badge variant={workspace.role === 'owner' ? 'default' : 'secondary'}>
                    {workspace.role}
                  </Badge>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Workspace Settings</CardTitle>
          <CardDescription>
            Manage your workspace settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateWorkspace} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workspaceName">Workspace Name</Label>
              <Input
                id="workspaceName"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="Enter workspace name"
                disabled={!isOwnerOrAdmin}
              />
              {!isOwnerOrAdmin && (
                <p className="text-xs text-muted-foreground">
                  Only owners and admins can update workspace settings
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Workspace Slug</Label>
              <Input
                value={selectedWorkspace.slug}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Workspace slug cannot be changed
              </p>
            </div>

            <div className="space-y-2">
              <Label>Your Role</Label>
              <div>
                <Badge variant={selectedWorkspace.role === 'owner' ? 'default' : 'secondary'}>
                  {selectedWorkspace.role}
                </Badge>
              </div>
            </div>

            {message && (
              <p className={`text-sm ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                {message}
              </p>
            )}

            {isOwnerOrAdmin && (
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {isOwnerOrAdmin && (
        <WorkspaceMembers workspaceId={selectedWorkspace.id} currentUserId={userId} />
      )}
    </>
  );
}
