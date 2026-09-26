import type { BodyType } from "@/lib/types";
import { cn } from "../ui";

// Illustration vectorielle utilisée tant que les vraies photos ne sont pas chargées
// (données de démonstration). Avec Supabase Storage, <VehicleImage> affichera les photos.

const BODY: Record<BodyType, { body: string; windows: string[] }> = {
  suv: {
    body: "M40 150 L40 110 Q42 95 60 92 L110 88 L150 55 Q158 48 170 48 L300 48 Q315 48 322 58 L345 90 L360 94 Q372 97 372 110 L372 150 Z",
    windows: ["M162 58 L127 88 L230 88 L230 58 Z", "M238 58 L238 88 L335 88 L316 61 Q312 58 305 58 Z"],
  },
  sedan: {
    body: "M30 150 L30 118 Q32 105 50 102 L120 96 L165 66 Q173 60 185 60 L270 60 Q282 60 292 68 L330 96 L362 102 Q375 105 375 118 L375 150 Z",
    windows: ["M177 70 L142 96 L245 96 L245 70 Z", "M252 70 L252 96 L318 96 L291 73 Q287 70 280 70 Z"],
  },
  coupe: {
    body: "M30 150 L30 120 Q32 108 50 105 L130 98 L180 70 Q190 64 202 64 L262 64 Q276 64 288 74 L325 99 L362 104 Q375 107 375 120 L375 150 Z",
    windows: ["M192 73 L152 97 L250 97 L250 73 Z", "M257 73 L257 97 L312 97 L286 76 Q282 73 275 73 Z"],
  },
  hatchback: {
    body: "M40 150 L40 115 Q42 102 58 100 L120 94 L165 62 Q172 57 182 57 L300 57 Q318 57 322 72 L335 100 L350 104 Q360 108 360 120 L360 150 Z",
    windows: ["M177 67 L142 94 L240 94 L240 67 Z", "M248 67 L248 94 L325 94 L314 72 Q311 67 303 67 Z"],
  },
  pickup: {
    body: "M30 150 L30 110 Q32 98 48 95 L100 90 L140 55 Q146 50 156 50 L235 50 Q243 50 245 58 L248 92 L372 92 L372 150 Z",
    windows: ["M152 60 L120 90 L195 90 L195 60 Z", "M202 60 L202 90 L240 90 L238 62 Z"],
  },
  van: {
    body: "M30 150 L30 80 Q32 50 70 45 L340 42 Q368 42 370 70 L372 150 Z",
    windows: ["M62 55 Q46 60 43 90 L95 90 L95 55 Z", "M105 55 L105 90 L200 90 L200 55 Z", "M210 55 L210 90 L300 90 L300 55 Z", "M310 55 L310 90 L360 90 L358 61 Q356 55 350 55 Z"],
  },
};

const BACKDROPS = [
  ["#eef0f4", "#d9dde6"],
  ["#f3efe4", "#e2d8bf"],
  ["#e8f1f3", "#c9dee3"],
  ["#f1ecf0", "#dccfd8"],
];

function isLight(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 200;
}

export function VehicleVisual({
  bodyType,
  colorHex,
  label,
  variant = 0,
  className,
  flip,
}: {
  bodyType: BodyType;
  colorHex: string;
  label?: string;
  variant?: number;
  className?: string;
  flip?: boolean;
}) {
  const shape = BODY[bodyType];
  const [from, to] = BACKDROPS[variant % BACKDROPS.length];
  const id = `g-${bodyType}-${colorHex.slice(1)}-${variant}`;
  return (
    <svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" className={cn("block h-full w-full", className)} role="img" aria-label={label}>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={colorHex} stopOpacity="0.92" />
          <stop offset="0.55" stopColor={colorHex} />
          <stop offset="1" stopColor="#000" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <rect width="400" height="220" fill={`url(#${id}-bg)`} />
      <ellipse cx="205" cy="180" rx="175" ry="10" fill="#000" opacity="0.12" />
      <g transform={flip ? "translate(405 12) scale(-1 1)" : "translate(0 12)"}>
        <path d={shape.body} fill={`url(#${id}-body)`} stroke={isLight(colorHex) ? "#b8c0cc" : "none"} strokeWidth="1.5" />
        {shape.windows.map((w) => (
          <path key={w} d={w} fill="#1b2433" opacity="0.85" />
        ))}
        <rect x="345" y="112" width="22" height="7" rx="3" fill="#fde68a" opacity="0.9" />
        <rect x="38" y="116" width="14" height="6" rx="3" fill="#ef4444" opacity="0.8" />
        {[110, 290].map((cx) => (
          <g key={cx}>
            <circle cx={cx} cy="150" r="27" fill="#111827" />
            <circle cx={cx} cy="150" r="14" fill="#9ca3af" />
            <circle cx={cx} cy="150" r="5" fill="#374151" />
          </g>
        ))}
      </g>
    </svg>
  );
}
