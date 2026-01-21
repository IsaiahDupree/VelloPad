import { Metadata } from 'next';
import Link from 'next/link';
import { SignupForm } from '@/components/auth/signup-form';

export const metadata: Metadata = {
  title: 'Sign Up | VelloPad',
  description: 'Create your VelloPad account',
};

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Create an account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Start creating professional books in minutes
          </p>
        </div>

        <SignupForm />

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link
            href="/auth/login"
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
