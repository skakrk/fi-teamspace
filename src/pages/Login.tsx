import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from '@/components/shared/Logo';

type Mode = 'signin' | 'signup' | 'forgot';

export function Login() {
  const { signIn, signUp, sendPasswordReset } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function switchMode(m: Mode) {
    setMode(m);
    setError(null);
    setInfo(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    if (mode === 'signin') {
      const { error } = await signIn(email, password);
      if (error) setError(error);
    } else if (mode === 'signup') {
      const { error } = await signUp(email, password, fullName);
      if (error) setError(error);
      else setInfo('Account created. Check your inbox if email confirmation is required, then sign in.');
    } else {
      const { error } = await sendPasswordReset(email);
      if (error) setError(error);
      else
        setInfo(
          'Password reset link sent. Check your inbox — the link will let you set a new password.',
        );
    }
    setLoading(false);
  }

  const titleByMode: Record<Mode, string> = {
    signin: 'Sign in',
    signup: 'Create account',
    forgot: 'Reset password',
  };
  const subByMode: Record<Mode, string> = {
    signin: 'Use the email you registered with.',
    signup: 'Create your founder account.',
    forgot: "Enter your email — we'll send you a link to set a new password.",
  };
  const submitLabel: Record<Mode, string> = {
    signin: 'Sign in',
    signup: 'Sign up',
    forgot: 'Send reset link',
  };

  return (
    <div className="min-h-screen grid place-items-center bg-bg p-6 relative">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-6">
          <Logo size="2xl" className="rounded-2xl shadow-card" />
          <h1 className="text-3xl font-bold mt-5">Best Teamspace</h1>
          <p className="text-base text-muted mt-2">
            Breakers Team · FI Core Program (CEE, Spring 2026)
          </p>
        </div>

        <div className="bg-surface border border-border rounded-xl shadow-card p-6">
          <h2 className="text-base font-semibold mb-1">{titleByMode[mode]}</h2>
          <p className="text-xs text-muted mb-5">{subByMode[mode]}</p>

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
            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      className="text-xs text-primary-dark hover:underline"
                      onClick={() => switchMode('forgot')}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
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
            )}
            {error && <div className="text-sm text-bad">{error}</div>}
            {info && (
              <div className="text-sm text-primary-deep bg-bubble rounded-lg p-2">{info}</div>
            )}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? '…' : submitLabel[mode]}
            </Button>
          </form>

          <div className="mt-4 text-sm text-muted space-y-1">
            {mode === 'signin' && (
              <>
                <button
                  type="button"
                  className="hover:text-ink"
                  onClick={() => switchMode('signup')}
                >
                  Don't have an account? Sign up
                </button>
              </>
            )}
            {mode === 'signup' && (
              <button
                type="button"
                className="hover:text-ink"
                onClick={() => switchMode('signin')}
              >
                Already have an account? Sign in
              </button>
            )}
            {mode === 'forgot' && (
              <button
                type="button"
                className="hover:text-ink"
                onClick={() => switchMode('signin')}
              >
                ← Back to sign in
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="fixed bottom-4 inset-x-4 flex flex-col items-center gap-1 text-center sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:text-left text-[11px] text-muted/80 leading-snug pointer-events-none">
        <div className="pointer-events-auto whitespace-nowrap">
          Designed and developed by{' '}
          <a
            href="https://www.linkedin.com/in/konstantin-skavitin/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-ink hover:underline"
          >
            Konstantin Skavitin
          </a>
        </div>
        <div className="pointer-events-auto flex items-center gap-3 whitespace-nowrap">
          <Link to="/guide" className="hover:text-ink hover:underline">
            User guide
          </Link>
          <span aria-hidden className="text-muted/40">·</span>
          <Link to="/security" className="hover:text-ink hover:underline">
            How we store passwords
          </Link>
        </div>
      </div>
    </div>
  );
}
