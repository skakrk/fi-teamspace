import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name: string): string {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function formatScore(n: number | null | undefined, digits = 1): string {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toFixed(digits);
}

export function avg(nums: Array<number | null | undefined>): number | null {
  const xs = nums.filter((x): x is number => typeof x === 'number');
  if (!xs.length) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Parse to Date, return null if invalid. */
export function toDate(input: string | number | Date | null | undefined): Date | null {
  if (input == null) return null;
  const d = input instanceof Date ? input : new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Format a date input safely. Returns fallback if input is missing/invalid. */
export function safeFormat(
  input: string | number | Date | null | undefined,
  pattern: string,
  fallback = '—',
): string {
  const d = toDate(input);
  if (!d) return fallback;
  try {
    return format(d, pattern);
  } catch {
    return fallback;
  }
}

export function safeDistance(
  input: string | number | Date | null | undefined,
  opts: { addSuffix?: boolean } = { addSuffix: false },
  fallback = '',
): string {
  const d = toDate(input);
  if (!d) return fallback;
  try {
    return formatDistanceToNow(d, opts);
  } catch {
    return fallback;
  }
}

/** Strip everything but digits; returns null if no digits. */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return digits.length ? digits : null;
}

/** Build WhatsApp deep-link from a phone string. Null if phone unusable. */
export function whatsappLink(phone: string | null | undefined): string | null {
  const d = normalizePhone(phone);
  return d ? `https://wa.me/${d}` : null;
}

/**
 * Extract YouTube video ID from various URL forms:
 *   https://youtu.be/<ID>
 *   https://www.youtube.com/watch?v=<ID>
 *   https://www.youtube.com/embed/<ID>
 *   https://www.youtube.com/shorts/<ID>
 * Returns null if not a recognised YouTube URL.
 */
export function extractYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '').split('/')[0];
      return id || null;
    }
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname === '/watch') return u.searchParams.get('v');
      const m = u.pathname.match(/^\/(embed|shorts|v)\/([^/?#]+)/);
      if (m) return m[2];
    }
    return null;
  } catch {
    return null;
  }
}
