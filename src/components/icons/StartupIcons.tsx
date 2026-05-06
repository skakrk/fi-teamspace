import type { SVGProps } from 'react';

const D = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function RocketIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...D} {...p}>
      <path d="M14 4c4 0 6 2 6 6-2 1-3 3-3 5l-3 3-5-5 3-3c2 0 4-1 5-3-2-1-3-3-3-3z" />
      <path d="M9 15l-3 3 1 2 2-2" />
      <path d="M5 19c-1 1-2 3-2 4 1 0 3-1 4-2" />
      <circle cx="15" cy="9" r="1.4" />
    </svg>
  );
}

export function LightbulbIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...D} {...p}>
      <path d="M9 18h6" />
      <path d="M10 21h4" />
      <path d="M12 3a6 6 0 0 0-4 10c1 1 1 2 1 3v1h6v-1c0-1 0-2 1-3a6 6 0 0 0-4-10z" />
    </svg>
  );
}

export function TargetIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...D} {...p}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function GrowthIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...D} {...p}>
      <path d="M3 20h18" />
      <path d="M5 17v-3" />
      <path d="M10 17v-7" />
      <path d="M15 17v-5" />
      <path d="M20 17v-9" />
      <path d="M3 8l5-3 4 2 8-4" />
    </svg>
  );
}

export function HandshakeIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...D} {...p}>
      <path d="M3 12l3-3 4 1 2 2-2 2-3-1z" />
      <path d="M12 12l4-3 5 2-3 5-3-1" />
      <path d="M10 12l2 2 2-2" />
    </svg>
  );
}

export function TrophyIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...D} {...p}>
      <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
      <path d="M8 6H5v2a3 3 0 0 0 3 3" />
      <path d="M16 6h3v2a3 3 0 0 1-3 3" />
      <path d="M12 13v3" />
      <path d="M9 19h6" />
      <path d="M8 16h8v3H8z" />
    </svg>
  );
}

export function CompassIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...D} {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2 5-5 2 2-5z" />
    </svg>
  );
}

export function StopwatchIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...D} {...p}>
      <path d="M10 2h4" />
      <path d="M12 5v3" />
      <circle cx="12" cy="14" r="7" />
      <path d="M12 11v3l2 2" />
    </svg>
  );
}

export function MegaphoneIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...D} {...p}>
      <path d="M3 11v2l13 6V5z" />
      <path d="M16 8c2 0 3 1.5 3 4s-1 4-3 4" />
      <path d="M6 13l1 5h3l-1-5" />
    </svg>
  );
}

export function ChatIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...D} {...p}>
      <path d="M4 5h16v11H8l-4 4z" />
    </svg>
  );
}
