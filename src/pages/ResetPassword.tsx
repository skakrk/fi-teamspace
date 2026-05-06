import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from '@/components/shared/Logo';
import { supabase } from '@/lib/supabase';

/**
 * Landing page for the password-reset email link.
 *
 * Supabase sends a link like:
 *   https://app.url/#/auth/reset?access_token=…&type=recovery&...
 * The Supabase JS client picks up the token from the URL automatically when
 * the page loads (detectSessionInUrl=true) and creates a temporary session
 * with `aal=aal1` and the user can call `auth.updateUser({ password })`.
 */
export function ResetPassword() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    // Wait briefly for supabase-js to consume any token from the URL.
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      setHasSession(!!data.session);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setHasSession(!!session);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);
    if (error) {
      setError(error);
      return;
    }
    setInfo('Password updated. Redirecting to dashboard…');
    setTimeout(() => navigate('/'), 1500);
  }

  return (
    <div className="min-h-screen grid place-items-center bg-bg p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-6">
          <Logo size="lg" />
          <div>
            <h1 className="text-lg font-semibold leading-none">FI Teamspace</h1>
            <p className="text-xs text-muted mt-1">Reset your password</p>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl shadow-card p-6">
          {hasSession === null && (
            <div className="text-sm text-muted">Verifying reset link…</div>
          )}

          {hasSession === false && (
            <div className="space-y-3">
              <div className="text-sm text-bad">
                This link is invalid or has expired. Open the most recent reset email or request a new one.
              </div>
              <Button onClick={() => navigate('/login')} className="w-full">
                Back to sign in
              </Button>
            </div>
          )}

          {hasSession === true && (
            <>
              <h2 className="text-base font-semibold mb-1">Set a new password</h2>
              <p className="text-xs text-muted mb-5">
                Choose a password you'll remember. Min 6 characters.
              </p>

              <form onSubmit={onSubmit} className="space-y-3">
                <div>
                  <Label htmlFor="pw1">New password</Label>
                  <Input
                    id="pw1"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <Label htmlFor="pw2">Confirm new password</Label>
                  <Input
                    id="pw2"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
                {error && <div className="text-sm text-bad">{error}</div>}
                {info && (
                  <div className="text-sm text-primary-deep bg-bubble rounded-lg p-2">
                    {info}
                  </div>
                )}
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? '…' : 'Set new password'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
