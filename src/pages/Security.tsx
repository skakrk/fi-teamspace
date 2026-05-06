import { Link } from 'react-router-dom';
import { Logo } from '@/components/shared/Logo';

export function Security() {
  return (
    <div className="min-h-screen bg-bg p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Logo size="lg" />
          <div>
            <h1 className="text-lg font-semibold leading-none">Best Teamspace</h1>
            <p className="text-xs text-muted mt-1">
              Breakers Team · FI Core Program (CEE, Spring 2026)
            </p>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl shadow-card p-6 sm:p-8 space-y-5">
          <h2 className="text-xl font-semibold">How we store passwords</h2>

          <p className="text-sm text-muted">
            Authentication is handled by{' '}
            <a
              href="https://supabase.com/docs/guides/auth"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-dark hover:underline"
            >
              Supabase Auth
            </a>
            . Your raw password is never stored — only its{' '}
            <strong>bcrypt hash</strong>. That means nobody can read the original password:
            not the app administrators, not Supabase staff.
          </p>

          <div>
            <h3 className="text-sm font-semibold mb-2">What this means in practice</h3>
            <ul className="text-sm text-muted space-y-1.5 list-disc pl-5">
              <li>
                On sign-up, your password is one-way hashed with bcrypt before being saved.
                The original password cannot be recovered from the hash.
              </li>
              <li>
                On sign-in, the password you type is hashed with the same algorithm and
                compared against the stored hash — the raw password never leaves the
                encrypted connection.
              </li>
              <li>
                Even if the hash database leaks, bcrypt's modern cost factor makes brute-force
                attacks impractical for strong passwords.
              </li>
              <li>
                Data access is protected by{' '}
                <a
                  href="https://supabase.com/docs/guides/database/postgres/row-level-security"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-dark hover:underline"
                >
                  Row Level Security
                </a>
                : every query is checked at the database level against rules tied to your
                user account.
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Proof and documentation</h3>
            <ul className="text-sm space-y-1.5 list-disc pl-5">
              <li>
                <a
                  href="https://supabase.com/docs/guides/auth/passwords"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-dark hover:underline"
                >
                  Supabase Auth — Passwords
                </a>{' '}
                <span className="text-muted">— how Supabase handles passwords</span>
              </li>
              <li>
                <a
                  href="https://github.com/supabase/auth"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-dark hover:underline"
                >
                  github.com/supabase/auth
                </a>{' '}
                <span className="text-muted">— open-source auth service code</span>
              </li>
              <li>
                <a
                  href="https://supabase.com/security"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-dark hover:underline"
                >
                  Supabase Security
                </a>{' '}
                <span className="text-muted">— SOC 2 Type 2, HIPAA, data encryption</span>
              </li>
              <li>
                <a
                  href="https://en.wikipedia.org/wiki/Bcrypt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-dark hover:underline"
                >
                  bcrypt
                </a>{' '}
                <span className="text-muted">— about the hashing algorithm itself</span>
              </li>
            </ul>
          </div>

          <p className="text-xs text-muted">
            If you forget your password, we cannot recover it — only reset it. Use the
            "Forgot password?" link on the sign-in page.
          </p>
        </div>

        <div className="mt-6">
          <Link to="/login" className="text-sm text-primary-dark hover:underline">
            ← Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
