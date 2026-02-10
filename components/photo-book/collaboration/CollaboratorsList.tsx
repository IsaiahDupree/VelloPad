'use client';

/**
 * Collaborators List Component
 * Feature: PB-029
 *
 * Displays list of collaborators with role management
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { UserPlus, Trash2, Crown, Edit, Eye } from 'lucide-react';
import type { Collaborator } from '@/lib/collaboration';

interface CollaboratorsListProps {
  projectId: string;
  currentUserId: string;
  isOwner?: boolean;
  onInvite?: () => void;
}

export function CollaboratorsList({
  projectId,
  currentUserId,
  isOwner = false,
  onInvite,
}: CollaboratorsListProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchCollaborators();
  }, [projectId]);

  const fetchCollaborators = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/photo-book/projects/${projectId}/collaborators`
      );
      if (!response.ok) throw new Error('Failed to fetch collaborators');
      const data = await response.json();
      setCollaborators(data.collaborators || []);
    } catch (error) {
      console.error('Error fetching collaborators:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateRole = async (collaboratorId: string, newRole: string) => {
    try {
      setUpdating(collaboratorId);
      const response = await fetch(
        `/api/photo-book/projects/${projectId}/collaborators/${collaboratorId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: newRole }),
        }
      );

      if (!response.ok) throw new Error('Failed to update role');
      await fetchCollaborators();
    } catch (error) {
      console.error('Error updating role:', error);
    } finally {
      setUpdating(null);
    }
  };

  const removeCollaborator = async (collaboratorId: string) => {
    if (!confirm('Remove this collaborator?')) return;

    try {
      setUpdating(collaboratorId);
      const response = await fetch(
        `/api/photo-book/projects/${projectId}/collaborators/${collaboratorId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) throw new Error('Failed to remove collaborator');
      await fetchCollaborators();
    } catch (error) {
      console.error('Error removing collaborator:', error);
    } finally {
      setUpdating(null);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4" />;
      case 'editor':
        return <Edit className="h-4 w-4" />;
      case 'viewer':
        return <Eye className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'editor':
        return 'secondary';
      case 'viewer':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Collaborators</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Collaborators</CardTitle>
            <CardDescription>
              {collaborators.length} {collaborators.length === 1 ? 'person' : 'people'}{' '}
              working on this project
            </CardDescription>
          </div>
          {isOwner && (
            <Button onClick={onInvite} size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Invite
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {collaborators.map((collaborator) => {
            const isCurrentUser = collaborator.userId === currentUserId;
            const canManage = isOwner && !isCurrentUser && collaborator.role !== 'owner';

            return (
              <div
                key={collaborator.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {getInitials(collaborator.email || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        {collaborator.email}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (you)
                          </span>
                        )}
                      </p>
                      {collaborator.isOnline && (
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                      )}
                    </div>
                    {!collaborator.acceptedAt && (
                      <p className="text-xs text-muted-foreground">Pending invitation</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {canManage ? (
                    <Select
                      value={collaborator.role}
                      onValueChange={(value) => updateRole(collaborator.id, value)}
                      disabled={updating === collaborator.id}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">Viewer</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="owner">Owner</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={getRoleBadgeVariant(collaborator.role)}>
                      <span className="flex items-center gap-1">
                        {getRoleIcon(collaborator.role)}
                        {collaborator.role}
                      </span>
                    </Badge>
                  )}

                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCollaborator(collaborator.id)}
                      disabled={updating === collaborator.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
