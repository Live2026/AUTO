import type { BodyType } from "@/lib/types";
import { cn } from "../ui";

// Illustration vectorielle utilisée tant que les vraies photos ne sont pas chargées
// (données de démonstration). Dès qu'une photo existe, <VehicleMedia> l'affiche à la place.

interface Shape {
  body: string;
  windows: string[];
  /** ligne de caisse (y) */
  belt: number;
  /** séparation des portières (x) */
  door: number;
  /** poignées de porte (x) */
  handles: number[];
  /** rétroviseur (x, y) */
  mirror: [number, number];
  /** avant du véhicule à droite (true) ou à gauche */
  frontRight: boolean;
  /** séparation cabine / benne (pick-up) */
  bed?: number;
}

const SHAPES: Record<BodyType, Shape> = {
  suv: {
    body: "M40 150 L40 110 Q42 95 60 92 L110 88 L150 55 Q158 48 170 48 L300 48 Q315 48 322 58 L345 90 L360 94 Q372 97 372 110 L372 150 Z",
    windows: ["M162 58 L127 88 L230 88 L230 58 Z", "M238 58 L238 88 L335 88 L316 61 Q312 58 305 58 Z"],
    belt: 97,
    door: 234,
    handles: [205, 300],
    mirror: [134, 84],
    frontRight: false,
  },
  sedan: {
    body: "M30 150 L30 118 Q32 105 50 102 L120 96 L165 66 Q173 60 185 60 L270 60 Q282 60 292 68 L330 96 L362 102 Q375 105 375 118 L375 150 Z",
    windows: ["M177 70 L142 96 L245 96 L245 70 Z", "M252 70 L252 96 L318 96 L291 73 Q287 70 280 70 Z"],
    belt: 106,
    door: 248,
    handles: [220, 295],
    mirror: [150, 93],
    frontRight: false,
  },
  coupe: {
    body: "M30 150 L30 120 Q32 108 50 105 L130 98 L180 70 Q190 64 202 64 L262 64 Q276 64 288 74 L325 99 L362 104 Q375 107 375 120 L375 150 Z",
    windows: ["M192 73 L152 97 L250 97 L250 73 Z", "M257 73 L257 97 L312 97 L286 76 Q282 73 275 73 Z"],
    belt: 108,
    door: 253,
    handles: [228],
    mirror: [160, 95],
    frontRight: false,
  },
  hatchback: {
    body: "M40 150 L40 115 Q42 102 58 100 L120 94 L165 62 Q172 57 182 57 L300 57 Q318 57 322 72 L335 100 L350 104 Q360 108 360 120 L360 150 Z",
    windows: ["M177 67 L142 94 L240 94 L240 67 Z", "M248 67 L248 94 L325 94 L314 72 Q311 67 303 67 Z"],
    belt: 104,
    door: 244,
    handles: [215, 292],
    mirror: [150, 91],
    frontRight: false,
  },
  pickup: {
    body: "M30 150 L30 110 Q32 98 48 95 L100 90 L140 55 Q146 50 156 50 L235 50 Q243 50 245 58 L248 92 L372 92 L372 150 Z",
    windows: ["M152 60 L120 90 L195 90 L195 60 Z", "M202 60 L202 90 L240 90 L238 62 Z"],
    belt: 100,
    door: 198,
    handles: [178, 228],
    mirror: [124, 87],
    frontRight: false,
    bed: 250,
  },
  van: {
    body: "M30 150 L30 80 Q32 50 70 45 L340 42 Q368 42 370 70 L372 150 Z",
    windows: ["M62 55 Q46 60 43 90 L95 90 L95 55 Z", "M105 55 L105 90 L200 90 L200 55 Z", "M210 55 L210 90 L300 90 L300 55 Z", "M310 55 L310 90 L360 90 L358 61 Q356 55 350 55 Z"],
    belt: 98,
    door: 102,
    handles: [120, 215],
    mirror: [44, 88],
    frontRight: false,
  },
};

const BACKDROPS: [string, string][] = [
  ["#f1f3f7", "#d8dde7"],
  ["#f5f1e6", "#e1d6bc"],
  ["#eaf3f5", "#c7dde3"],
  ["#f3eef2", "#dccdd8"],
];

function hexToRgb(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(hex: string, target: number, amount: number) {
  const [r, g, b] = hexToRgb(hex).map((c) => Math.round(c + (target - c) * amount));
  return `rgb(${r} ${g} ${b})`;
}

function isLight(hex: string) {
  const [r, g, b] = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b > 200;
}

function Wheel({ cx, id }: { cx: number; id: string }) {
  return (
    <g>
      <circle cx={cx} cy="150" r="27" fill="#0f141c" />
      <circle cx={cx} cy="150" r="24.5" fill="none" stroke="#252c38" strokeWidth="1.5" />
      <circle cx={cx} cy="150" r="17" fill={`url(#${id}-rim)`} />
      {[0, 72, 144, 216, 288].map((a) => (
        <rect key={a} x={cx - 2.2} y={135} width="4.4" height="13" rx="2" fill="#6b7280" transform={`rotate(${a} ${cx} 150)`} />
      ))}
      <circle cx={cx} cy="150" r="5" fill="#374151" />
      <circle cx={cx} cy="150" r="2" fill="#9ca3af" />
    </g>
  );
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
  const s = SHAPES[bodyType];
  const [from, to] = BACKDROPS[variant % BACKDROPS.length];
  const id = `v-${bodyType}-${colorHex.slice(1)}-${variant}`;
  const light = isLight(colorHex);
  const front = s.frontRight ? 1 : -1;
  const xs = s.body.match(/-?\d+(\.\d+)?/g)!.map(Number).filter((_, i) => i % 2 === 0);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const headX = front === 1 ? maxX - 26 : minX + 4;
  const tailX = front === 1 ? minX + 2 : maxX - 12;

  return (
    <svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" className={cn("block h-full w-full", className)} role="img" aria-label={label}>
      <defs>
        <radialGradient id={`${id}-bg`} cx="50%" cy="35%" r="80%">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </radialGradient>
        <linearGradient id={`${id}-floor`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.08" />
        </linearGradient>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={mix(colorHex, 255, light ? 0.5 : 0.28)} />
          <stop offset="0.42" stopColor={colorHex} />
          <stop offset="0.75" stopColor={mix(colorHex, 0, light ? 0.12 : 0.25)} />
          <stop offset="1" stopColor={mix(colorHex, 0, light ? 0.3 : 0.5)} />
        </linearGradient>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b3a52" />
          <stop offset="1" stopColor="#0f1623" />
        </linearGradient>
        <radialGradient id={`${id}-rim`} cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#f3f4f6" />
          <stop offset="0.6" stopColor="#b6bcc6" />
          <stop offset="1" stopColor="#7c8490" />
        </radialGradient>
        <filter id={`${id}-blur`} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <clipPath id={`${id}-clip`}>
          <path d={s.body} />
        </clipPath>
        <clipPath id={`${id}-glassclip`}>
          {s.windows.map((w) => (
            <path key={w} d={w} />
          ))}
        </clipPath>
      </defs>

      <rect width="400" height="220" fill={`url(#${id}-bg)`} />
      <rect y="168" width="400" height="52" fill={`url(#${id}-floor)`} />

      <g transform={flip ? "translate(374 26) scale(-0.86 0.86)" : "translate(30 26) scale(0.86)"}>
        <ellipse cx="205" cy="176" rx="170" ry="9" fill="#000" opacity="0.22" filter={`url(#${id}-blur)`} />

        {/* Carrosserie */}
        <path d={s.body} fill={`url(#${id}-body)`} stroke={light ? "#aab2bf" : mix(colorHex, 0, 0.45)} strokeWidth="1.2" />
        <g clipPath={`url(#${id}-clip)`}>
          {/* reflet de toit / capot */}
          <rect x="0" y="40" width="400" height="14" fill="#fff" opacity={light ? 0.35 : 0.14} />
          {/* ligne de caisse */}
          <path d={`M${minX} ${s.belt} L${maxX} ${s.belt}`} stroke="#fff" strokeOpacity={light ? 0.9 : 0.35} strokeWidth="2" />
          <path d={`M${minX} ${s.belt + 2} L${maxX} ${s.belt + 2}`} stroke="#000" strokeOpacity="0.12" strokeWidth="1" />
          {/* bas de caisse */}
          <rect x="0" y="140" width="400" height="12" fill="#000" opacity={light ? 0.08 : 0.18} />
          {/* portières */}
          <path d={`M${s.door} ${s.belt - 12} L${s.door} 141`} stroke="#000" strokeOpacity="0.2" strokeWidth="1.2" />
          {s.bed && <path d={`M${s.bed} 92 L${s.bed} 141`} stroke="#000" strokeOpacity="0.25" strokeWidth="1.5" />}
          {/* passages de roues */}
          {[110, 290].map((cx) => (
            <circle key={cx} cx={cx} cy="150" r="33" fill="#0b0f17" />
          ))}
        </g>

        {/* Vitres + reflet */}
        {s.windows.map((w) => (
          <path key={w} d={w} fill={`url(#${id}-glass)`} stroke={light ? "#8b93a0" : "none"} strokeWidth="0.8" />
        ))}
        <g clipPath={`url(#${id}-glassclip)`}>
          <polygon points="150,40 190,40 140,100 100,100" fill="#fff" opacity="0.14" />
          <polygon points="250,40 265,40 215,100 200,100" fill="#fff" opacity="0.1" />
        </g>

        {/* Détails */}
        {s.handles.map((x) => (
          <rect key={x} x={x} y={s.belt + 6} width="14" height="3" rx="1.5" fill="#000" opacity="0.3" />
        ))}
        <path d={`M${s.mirror[0]} ${s.mirror[1]} l${-10 * front} -3 l0 7 z`} fill={mix(colorHex, 0, 0.35)} />
        <rect x={headX} y={s.belt + 4} width="22" height="7" rx="3.5" fill="#fff7cc" stroke="#e5c55a" strokeWidth="1" />
        <rect x={tailX} y={s.belt + 4} width="10" height="7" rx="3" fill="#dc2626" opacity="0.9" />

        <Wheel cx={110} id={id} />
        <Wheel cx={290} id={id} />
      </g>
    </svg>
  );
}
