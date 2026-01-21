import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getDefaultWorkspace } from '@/lib/auth/workspaces';
import { CreateBookForm } from '@/components/books/create-book-form';

export default async function NewBookPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const workspace = await getDefaultWorkspace(user.id);

  if (!workspace) {
    redirect('/dashboard');
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Create a New Book</h1>
        <p className="text-muted-foreground">
          Set up your book details. You can change these later.
        </p>
      </div>

      <CreateBookForm workspaceId={workspace.id} />
    </div>
  );
}
