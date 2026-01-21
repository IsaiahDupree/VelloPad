import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SettingsTabs } from '@/components/settings/settings-tabs';

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/auth/login');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Get user's workspaces with role info
  const { data: membershipData } = await supabase
    .from('workspace_members')
    .select(
      `
      role,
      workspaces (
        id,
        name,
        slug,
        created_at
      )
    `
    )
    .eq('user_id', user.id);

  const workspaces = membershipData?.map((m) => ({
    ...m.workspaces,
    role: m.role,
  })) || [];

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your profile and workspace settings
        </p>
      </div>

      <SettingsTabs
        user={user}
        profile={profile}
        workspaces={workspaces}
      />
    </div>
  );
}
