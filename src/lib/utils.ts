import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
