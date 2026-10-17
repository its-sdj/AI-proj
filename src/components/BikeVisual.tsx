import React from 'react';
import { BikeCategory } from '../types';

interface BikeVisualProps {
  category: BikeCategory;
  model: string;
  make: string;
  accentColor?: string;
  className?: string;
  badgeText?: string;
}

export const BikeVisual: React.FC<BikeVisualProps> = ({
  category,
  model,
  make,
  accentColor = '#e11d48',
  className = 'h-52 w-full',
  badgeText,
}) => {
  return (
    <div
      className={`relative overflow-hidden rounded-t-xl bg-gradient-to-b from-neutral-900 via-neutral-900 to-neutral-950 flex flex-col items-center justify-center p-4 border-b border-neutral-800 ${className}`}
    >
      {/* Subtle showroom floor grid lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] pointer-events-none" />

      {/* Spotlighting reflection */}
      <div
        className="absolute top-0 w-3/4 h-24 blur-3xl opacity-20 pointer-events-none"
        style={{ backgroundColor: accentColor }}
      />

      {/* Watermark brand signature in background */}
      <div className="absolute top-3 left-4 text-xs font-mono font-medium tracking-wider text-neutral-600 uppercase">
        {make} · {category}
      </div>

      {badgeText && (
        <div className="absolute top-3 right-3 text-[11px] font-mono text-neutral-300 bg-neutral-800/80 px-2 py-0.5 rounded border border-neutral-700/60 backdrop-blur-sm">
          {badgeText}
        </div>
      )}

      {/* Stylized Silhouette Rendering based on Category */}
      <div className="relative z-10 w-full max-w-[280px] h-32 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
        <svg
          viewBox="0 0 320 180"
          className="w-full h-full drop-shadow-[0_12px_20px_rgba(0,0,0,0.6)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Ground shadow */}
          <ellipse cx="160" cy="162" rx="130" ry="8" fill="#000000" fillOpacity="0.6" />

          {category === 'Cruiser' && (
            <g>
              {/* Cruiser Silhouette (Royal Enfield / Bullet / Meteor style) */}
              {/* Wheels */}
              <circle cx="65" cy="132" r="32" stroke="#404040" strokeWidth="6" />
              <circle cx="65" cy="132" r="24" stroke="#262626" strokeWidth="2" strokeDasharray="3 3" />
              <circle cx="65" cy="132" r="8" fill="#737373" />

              <circle cx="255" cy="132" r="32" stroke="#404040" strokeWidth="6" />
              <circle cx="255" cy="132" r="24" stroke="#262626" strokeWidth="2" strokeDasharray="3 3" />
              <circle cx="255" cy="132" r="8" fill="#737373" />

              {/* Rear Fender */}
              <path d="M40 132 C40 98 75 92 100 102 L115 115" stroke="#737373" strokeWidth="5" strokeLinecap="round" />
              {/* Front Fender */}
              <path d="M228 112 C240 100 270 100 280 125" stroke="#737373" strokeWidth="5" strokeLinecap="round" />

              {/* Frame & Engine block */}
              <rect x="110" y="112" width="56" height="36" rx="4" fill="#262626" stroke="#525252" strokeWidth="2" />
              <line x1="112" y1="120" x2="164" y2="120" stroke="#737373" strokeWidth="1.5" />
              <line x1="112" y1="128" x2="164" y2="128" stroke="#737373" strokeWidth="1.5" />
              <line x1="112" y1="136" x2="164" y2="136" stroke="#737373" strokeWidth="1.5" />

              {/* Exhaust pipe (long cruiser pipe) */}
              <path d="M140 142 L70 144 L45 142" stroke="#a3a3a3" strokeWidth="4.5" strokeLinecap="round" />

              {/* Teardrop Fuel Tank */}
              <path
                d="M142 86 C165 72 200 78 215 95 C200 105 155 105 142 86 Z"
                fill={accentColor}
                stroke="#fafafa"
                strokeWidth="1.5"
              />

              {/* Single / Split Seat */}
              <path d="M102 96 C115 90 138 90 148 98 C135 106 112 106 102 96 Z" fill="#171717" stroke="#404040" strokeWidth="2" />

              {/* Front Raked Telescopic Fork */}
              <line x1="255" y1="132" x2="216" y2="68" stroke="#a3a3a3" strokeWidth="4" strokeLinecap="round" />
              {/* Cruiser Handlebars */}
              <path d="M216 68 L208 52 L198 56" stroke="#e5e5e5" strokeWidth="3" strokeLinecap="round" />
              {/* Round Headlamp */}
              <circle cx="228" cy="74" r="8" fill="#fef08a" fillOpacity="0.9" stroke="#e5e5e5" strokeWidth="2" />
            </g>
          )}

          {category === 'Sport' && (
            <g>
              {/* Sportbike Silhouette (Yamaha R15 style) */}
              {/* Wheels with sporty alloy pattern */}
              <circle cx="65" cy="132" r="30" stroke="#1e293b" strokeWidth="7" />
              <circle cx="65" cy="132" r="22" stroke={accentColor} strokeWidth="1.5" />
              <circle cx="65" cy="132" r="7" fill="#64748b" />

              <circle cx="255" cy="132" r="30" stroke="#1e293b" strokeWidth="7" />
              <circle cx="255" cy="132" r="22" stroke={accentColor} strokeWidth="1.5" />
              <circle cx="255" cy="132" r="7" fill="#64748b" />

              {/* High tail cowl */}
              <path d="M68 98 L115 102 L140 82 L90 80 Z" fill={accentColor} stroke="#0f172a" strokeWidth="2" />
              <path d="M110 82 L138 82" stroke="#000" strokeWidth="4" strokeLinecap="round" />

              {/* Muscular Fuel Tank */}
              <path d="M140 82 C158 64 190 68 206 88 L170 98 Z" fill={accentColor} stroke="#0f172a" strokeWidth="2" />

              {/* Aerodynamic Front Fairing */}
              <path
                d="M206 88 L256 94 L268 76 L240 65 L212 70 Z"
                fill={accentColor}
                stroke="#0f172a"
                strokeWidth="2"
              />

              {/* Tinted Bubble Windscreen */}
              <path d="M240 65 L225 50 L212 70 Z" fill="#0f172a" fillOpacity="0.8" stroke="#334155" strokeWidth="1" />

              {/* USD Gold / Silver Front Fork */}
              <line x1="255" y1="132" x2="225" y2="70" stroke="#fbbf24" strokeWidth="4" strokeLinecap="round" />
              {/* Clip-on low handlebars */}
              <line x1="222" y1="68" x2="212" y2="65" stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round" />

              {/* Twin sharp headlights */}
              <polygon points="262,88 266,85 258,85" fill="#38bdf8" />

              {/* Underbelly Pan & Exhaust */}
              <path d="M140 138 L180 138 L195 125 L145 125 Z" fill="#1e293b" />
              <path d="M115 136 L85 124" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
            </g>
          )}

          {category === 'Scooter' && (
            <g>
              {/* Scooter Silhouette (Honda Activa / Jupiter style) */}
              {/* Smaller scooter wheels */}
              <circle cx="75" cy="136" r="24" stroke="#334155" strokeWidth="6" />
              <circle cx="75" cy="136" r="8" fill="#64748b" />

              <circle cx="245" cy="136" r="24" stroke="#334155" strokeWidth="6" />
              <circle cx="245" cy="136" r="8" fill="#64748b" />

              {/* Rear body panel covering engine */}
              <path
                d="M55 136 C55 105 85 95 130 95 L145 120 L95 136 Z"
                fill={accentColor}
                stroke="#0f172a"
                strokeWidth="2"
              />

              {/* Flat Step-through Footboard */}
              <line x1="145" y1="136" x2="200" y2="136" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" />

              {/* Front Apron Shield */}
              <path
                d="M200 136 L226 95 L215 75 L190 105 Z"
                fill={accentColor}
                stroke="#0f172a"
                strokeWidth="2"
              />

              {/* Handlebar mounted headlamp */}
              <path d="M215 75 L228 58 L210 58 Z" fill={accentColor} stroke="#0f172a" strokeWidth="1.5" />
              <circle cx="226" cy="62" r="5" fill="#fef08a" />
              <line x1="210" y1="58" x2="198" y2="60" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />

              {/* Long comfort seat */}
              <path d="M85 95 C110 88 155 88 165 102 L95 104 Z" fill="#18181b" stroke="#3f3f46" strokeWidth="2" />

              {/* Exhaust muffler shield */}
              <rect x="75" y="130" width="45" height="10" rx="3" fill="#0f172a" stroke="#94a3b8" strokeWidth="1" />
            </g>
          )}

          {category === 'Street Naked' && (
            <g>
              {/* Streetfighter / Naked (KTM Duke style) */}
              <circle cx="65" cy="132" r="30" stroke="#18181b" strokeWidth="7" />
              <circle cx="65" cy="132" r="22" stroke="#ea580c" strokeWidth="2" />
              <circle cx="65" cy="132" r="7" fill="#52525b" />

              <circle cx="255" cy="132" r="30" stroke="#18181b" strokeWidth="7" />
              <circle cx="255" cy="132" r="22" stroke="#ea580c" strokeWidth="2" />
              <circle cx="255" cy="132" r="7" fill="#52525b" />

              {/* Exposed Orange Trellis Frame */}
              <line x1="120" y1="95" x2="185" y2="125" stroke="#ea580c" strokeWidth="3.5" />
              <line x1="185" y1="95" x2="120" y2="125" stroke="#ea580c" strokeWidth="3.5" />
              <line x1="120" y1="95" x2="185" y2="95" stroke="#ea580c" strokeWidth="3.5" />

              {/* Angular Fuel Tank & Shrouds */}
              <path d="M140 85 L180 70 L210 80 L220 102 L175 105 Z" fill="#ea580c" stroke="#18181b" strokeWidth="2" />

              {/* Inverted WP Forks */}
              <line x1="255" y1="132" x2="225" y2="68" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />

              {/* Aggressive Insectoid Headlamp */}
              <polygon points="238,72 248,78 238,88 230,80" fill="#facc15" stroke="#18181b" strokeWidth="1" />
              <line x1="225" y1="68" x2="215" y2="65" stroke="#e4e4e7" strokeWidth="3.5" strokeLinecap="round" />

              {/* Compact stepped seat & high tail */}
              <path d="M90 92 L140 92 L130 104 L85 100 Z" fill="#18181b" />
              {/* Underbelly exhaust */}
              <rect x="145" y="132" width="28" height="12" rx="2" fill="#27272a" stroke="#71717a" strokeWidth="1.5" />
            </g>
          )}

          {category === 'Commuter' && (
            <g>
              {/* Commuter Bike (Apache / Pulsar / Splendor style) */}
              <circle cx="65" cy="132" r="31" stroke="#27272a" strokeWidth="6" />
              <circle cx="65" cy="132" r="8" fill="#71717a" />

              <circle cx="255" cy="132" r="31" stroke="#27272a" strokeWidth="6" />
              <circle cx="255" cy="132" r="8" fill="#71717a" />

              {/* Twin rear shock absorbers */}
              <line x1="85" y1="132" x2="110" y2="95" stroke="#ef4444" strokeWidth="4" strokeDasharray="3 2" />

              {/* Commuter tank & body */}
              <path d="M135 88 C155 75 190 75 205 92 L160 106 Z" fill={accentColor} stroke="#18181b" strokeWidth="2" />
              {/* Headlamp bikini cowl */}
              <path d="M210 75 L235 70 L230 90 L212 85 Z" fill={accentColor} stroke="#18181b" strokeWidth="1.5" />
              <circle cx="230" cy="80" r="5" fill="#fef08a" />

              {/* Telescopic Fork */}
              <line x1="255" y1="132" x2="225" y2="72" stroke="#a1a1aa" strokeWidth="4" strokeLinecap="round" />
              {/* Single long seat */}
              <path d="M90 92 C115 88 140 88 150 96 L100 102 Z" fill="#18181b" stroke="#3f3f46" strokeWidth="1.5" />
              {/* Exhaust */}
              <path d="M140 134 L65 130" stroke="#71717a" strokeWidth="5" strokeLinecap="round" />
            </g>
          )}

          {category === 'Electric' && (
            <g>
              {/* Electric Scooter (Ather 450X style) */}
              <circle cx="75" cy="136" r="25" stroke="#10b981" strokeWidth="4" />
              <circle cx="75" cy="136" r="23" stroke="#18181b" strokeWidth="4" />
              <circle cx="75" cy="136" r="7" fill="#34d399" />

              <circle cx="245" cy="136" r="25" stroke="#10b981" strokeWidth="4" />
              <circle cx="245" cy="136" r="23" stroke="#18181b" strokeWidth="4" />
              <circle cx="245" cy="136" r="7" fill="#34d399" />

              {/* Minimalist futuristic body */}
              <path
                d="M60 130 L110 85 L145 92 L145 132 L85 136 Z"
                fill="#27272a"
                stroke="#10b981"
                strokeWidth="2"
              />

              {/* Battery floorboard */}
              <rect x="140" y="130" width="60" height="12" rx="3" fill="#047857" stroke="#10b981" strokeWidth="1" />

              {/* Sharp front cowl */}
              <path d="M195 132 L235 90 L228 65 L200 95 Z" fill="#27272a" stroke="#10b981" strokeWidth="2" />

              {/* Horizontal LED lightbar */}
              <line x1="225" y1="72" x2="238" y2="82" stroke="#34d399" strokeWidth="3" strokeLinecap="round" />

              {/* Touchscreen cockpit silhouette */}
              <rect x="208" y="52" width="14" height="9" rx="1.5" fill="#38bdf8" stroke="#0284c7" strokeWidth="1" />

              {/* Monoshock suspension & belt drive */}
              <line x1="90" y1="134" x2="125" y2="108" stroke="#10b981" strokeWidth="3" />
            </g>
          )}
        </svg>
      </div>

      {/* Model name kicker */}
      <div className="relative z-10 mt-1 text-center">
        <div className="text-sm font-semibold tracking-wide text-neutral-100">{model}</div>
      </div>
    </div>
  );
};
