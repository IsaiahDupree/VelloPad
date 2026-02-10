'use client';

/**
 * Invite Collaborator Dialog
 * Feature: PB-029
 *
 * Dialog for inviting new collaborators to a project
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface InviteCollaboratorDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvited?: () => void;
}

export function InviteCollaboratorDialog({
  projectId,
  open,
  onOpenChange,
  onInvited,
}: InviteCollaboratorDialogProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'viewer' | 'editor'>('viewer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInvite = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/photo-book/projects/${projectId}/collaborators`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, role }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to invite collaborator');
      }

      // Reset form and close dialog
      setEmail('');
      setRole('viewer');
      onOpenChange(false);
      onInvited?.();
    } catch (error) {
      console.error('Error inviting collaborator:', error);
      setError(error instanceof Error ? error.message : 'Failed to invite collaborator');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Collaborator</DialogTitle>
          <DialogDescription>
            Invite someone to collaborate on this photo book project
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="collaborator@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(value: any) => setRole(value)}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">
                  <div>
                    <p className="font-medium">Viewer</p>
                    <p className="text-xs text-muted-foreground">
                      Can view the project but not make changes
                    </p>
                  </div>
                </SelectItem>
                <SelectItem value="editor">
                  <div>
                    <p className="font-medium">Editor</p>
                    <p className="text-xs text-muted-foreground">
                      Can edit photos, layouts, and pages
                    </p>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
