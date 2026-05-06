import { Logo } from '@/components/shared/Logo';

export function ConfigBanner() {
  return (
    <div className="min-h-screen grid place-items-center bg-bg p-6">
      <div className="max-w-xl w-full bg-surface border border-border rounded-xl shadow-card p-8">
        <div className="flex items-center gap-3 mb-4">
          <Logo size="lg" />
          <h1 className="text-xl font-semibold">FI Teamspace — Setup needed</h1>
        </div>
        <p className="text-sm text-muted mb-4">
          Supabase is not configured. Create a Supabase project, run{' '}
          <code className="bg-bg px-1 rounded">supabase/migrations/0001_initial_schema.sql</code>{' '}
          in the SQL Editor, then set the following env vars in <code className="bg-bg px-1 rounded">.env</code>:
        </p>
        <pre className="bg-bg border border-border rounded-lg p-4 text-xs leading-5 mb-4 overflow-auto">{`VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key`}</pre>
        <p className="text-xs text-muted">
          For deployment, add the same values to your GitHub repo Secrets (Settings → Secrets and variables → Actions).
        </p>
      </div>
    </div>
  );
}
