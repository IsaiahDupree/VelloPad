'use client';

import { User } from '@supabase/supabase-js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfileSettings } from './profile-settings';
import { WorkspaceSettings } from './workspace-settings';

interface SettingsTabsProps {
  user: User;
  profile: any;
  workspaces: any[];
}

export function SettingsTabs({ user, profile, workspaces }: SettingsTabsProps) {
  return (
    <Tabs defaultValue="profile" className="space-y-6">
      <TabsList>
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="workspace">Workspace</TabsTrigger>
      </TabsList>

      <TabsContent value="profile" className="space-y-6">
        <ProfileSettings user={user} profile={profile} />
      </TabsContent>

      <TabsContent value="workspace" className="space-y-6">
        <WorkspaceSettings workspaces={workspaces} userId={user.id} />
      </TabsContent>
    </Tabs>
  );
}
