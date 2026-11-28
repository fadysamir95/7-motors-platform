import { useId } from 'react';

/**
 * Loading indicator drawn as a modern car driving along a dashed road: the wheels spin, the body bobs slightly
 * and the road streams past. Pure SVG + CSS (see the car loader block in globals.css), so it costs no JS.
 * `tone="ink"` is for light backgrounds, `tone="bone"` for dark ones. The car faces the reading direction.
 */
export default function CarLoader({
  label,
  tone = 'ink',
  size = 'md',
  still = false,
  className = '',
}: {
  label?: string;
  tone?: 'ink' | 'bone';
  size?: 'xs' | 'md' | 'lg';
  /** Draws the car parked (no motion), for empty and error states. */
  still?: boolean;
  className?: string;
}) {
  const uid = useId().replace(/:/g, '');
  const onLight = tone === 'ink';
  const body = onLight ? '#1e1f1c' : '#f4f2ec';
  const accent = onLight ? '#c6f53f' : '#1e1f1c';
  const beam = onLight ? '#7fa21f' : '#c6f53f';
  const width = size === 'xs' ? 'w-12' : size === 'lg' ? 'w-72' : 'w-48';

  return (
    <div role="status" aria-live="polite" className={`car-loader ${still ? 'car-still' : ''} inline-flex flex-col items-center gap-3 ${className}`}>
      <svg viewBox="0 0 270 112" className={`${width} h-auto rtl:-scale-x-100`} aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={`${uid}-beam`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor={beam} stopOpacity="0.55" />
            <stop offset="1" stopColor={beam} stopOpacity="0" />
          </linearGradient>
          {/* Knocks the wheel arches and the windows out of the body so the background shows through. */}
          <mask id={`${uid}-body`} maskUnits="userSpaceOnUse" x="0" y="0" width="270" height="112">
            <rect width="270" height="112" fill="#fff" />
            <circle cx="76" cy="86" r="20" fill="#000" />
            <circle cx="198" cy="86" r="20" fill="#000" />
            <path d="M94 52 C104 44 115 39 128 38 L137 38 L137 52 Z" fill="#000" />
            <path d="M145 38 L155 38 C167 39 179 46 190 52 L145 52 Z" fill="#000" />
          </mask>
        </defs>

        {/* road */}
        <line className="car-road" x1="0" x2="270" y1="107" y2="107" stroke={body} strokeOpacity="0.28" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="16 14" />

        <g className="car-body">
          {/* headlight beam */}
          <path className="car-beam" d="M246 68 L270 58 L270 82 Z" fill={`url(#${uid}-beam)`} />
          {/* body */}
          <path
            mask={`url(#${uid}-body)`}
            fill={body}
            d="M26 87 L26 76 C27 70 31 67 38 65 C60 59 82 47 104 39 C114 35 124 33 136 33 L156 33 C172 34 188 43 204 57 L232 63 C241 65 246 70 246 78 L246 87 Z"
          />
          {/* character line and lights */}
          <path d="M44 71 C110 66 170 64 236 69" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" />
          <rect x="234" y="66" width="11" height="4" rx="2" fill={onLight ? '#c6f53f' : '#7fa21f'} />
          <rect x="26" y="70" width="7" height="3.5" rx="1.75" fill={accent} opacity="0.9" />

          {/* wheels */}
          {[76, 198].map((cx) => (
            <g key={cx}>
              <circle cx={cx} cy="86" r="15" fill={body} />
              <g className="car-wheel" style={{ transformOrigin: `${cx}px 86px` }}>
                <circle cx={cx} cy="86" r="9" fill="none" stroke={accent} strokeWidth="2" />
                {[0, 72, 144, 216, 288].map((deg) => (
                  <line key={deg} x1={cx} y1="86" x2={cx} y2="78.5" stroke={accent} strokeWidth="2" strokeLinecap="round" transform={`rotate(${deg} ${cx} 86)`} />
                ))}
              </g>
            </g>
          ))}
        </g>
      </svg>
      {label ? (
        <span className={`text-sm font-semibold ${onLight ? 'text-brand-ink/70' : 'text-brand-bone/80'}`}>{label}</span>
      ) : null}
    </div>
  );
}
