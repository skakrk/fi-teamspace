import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { RocketIcon } from '@/components/icons/StartupIcons';

export function Login() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    if (mode === 'signin') {
      const { error } = await signIn(email, password);
      if (error) setError(error);
    } else {
      const { error } = await signUp(email, password, fullName);
      if (error) setError(error);
      else setInfo('Account created. Check your inbox if email confirmation is required, then sign in.');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen grid place-items-center bg-bg p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary text-white grid place-items-center">
            <RocketIcon width={22} height={22} />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-none">FI Teamspace</h1>
            <p className="text-xs text-muted mt-1">Breakers Team · FI Core Program (CEE, Spring 2026)</p>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl shadow-card p-6">
          <h2 className="text-base font-semibold mb-1">
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </h2>
          <p className="text-xs text-muted mb-5">
            {mode === 'signin'
              ? 'Use the email you registered with.'
              : 'Create your founder account.'}
          </p>

          <form onSubmit={onSubmit} className="space-y-3">
            {mode === 'signup' && (
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Jane Founder"
                />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              />
            </div>
            {error && <div className="text-sm text-bad">{error}</div>}
            {info && <div className="text-sm text-primary-deep bg-bubble rounded-lg p-2">{info}</div>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? '…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
            </Button>
          </form>

          <button
            type="button"
            className="mt-4 text-sm text-muted hover:text-ink"
            onClick={() => {
              setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
              setError(null);
              setInfo(null);
            }}
          >
            {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
