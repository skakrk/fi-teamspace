import type { User } from '@supabase/supabase-js';

/** Single hard-coded system admin. Mirrors `public.is_admin()` SQL function. */
export const ADMIN_EMAIL = 'ska124.068@gmail.com';

export function isAdmin(user: User | null | undefined): boolean {
  return !!user && user.email === ADMIN_EMAIL;
}
