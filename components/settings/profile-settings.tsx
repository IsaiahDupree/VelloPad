'use client';

import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface ProfileSettingsProps {
  user: User;
  profile: any;
}

export function ProfileSettings({ user, profile }: ProfileSettingsProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user.id);

      if (error) throw error;

      setMessage('Profile updated successfully');
      router.refresh();
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('Failed to update profile');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>
            Update your profile details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
              />
            </div>

            {message && (
              <p className={`text-sm ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                {message}
              </p>
            )}

            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Manage your account settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Account created: {new Date(user.created_at).toLocaleDateString()}
            </p>
            <p className="text-sm text-muted-foreground">
              User ID: {user.id.substring(0, 8)}...
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
