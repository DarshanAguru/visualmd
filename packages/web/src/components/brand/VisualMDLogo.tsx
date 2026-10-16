import React from 'react';

interface VisualMDLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  textClassName?: string;
}

export const VisualMDLogo: React.FC<VisualMDLogoProps> = ({
  size = 28,
  className = '',
  showText = false,
  textClassName = '',
}) => {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-300 hover:scale-105"
      >
        <defs>
          <linearGradient id="vmd-bg-grad" x1="2" y1="2" x2="46" y2="46" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0f172a" />
            <stop offset="0.6" stopColor="#090d16" />
            <stop offset="1" stopColor="#020617" />
          </linearGradient>
          <linearGradient id="vmd-border-grad" x1="2" y1="2" x2="46" y2="46" gradientUnits="userSpaceOnUse">
            <stop stopColor="#38bdf8" stopOpacity="0.6" />
            <stop offset="0.5" stopColor="#818cf8" stopOpacity="0.4" />
            <stop offset="1" stopColor="#c084fc" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="vmd-stroke-left" x1="10" y1="14" x2="24" y2="36" gradientUnits="userSpaceOnUse">
            <stop stopColor="#38bdf8" />
            <stop offset="0.5" stopColor="#3b82f6" />
            <stop offset="1" stopColor="#6366f1" />
          </linearGradient>
          <linearGradient id="vmd-stroke-right" x1="24" y1="36" x2="38" y2="14" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6366f1" />
            <stop offset="0.5" stopColor="#a855f7" />
            <stop offset="1" stopColor="#ec4899" />
          </linearGradient>
          <linearGradient id="vmd-chevron-grad" x1="16" y1="18" x2="32" y2="28" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ffffff" />
            <stop offset="1" stopColor="#bae6fd" />
          </linearGradient>
          <radialGradient id="vmd-glow-radial" cx="24" cy="24" r="18" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6366f1" stopOpacity="0.25" />
            <stop offset="0.6" stopColor="#38bdf8" stopOpacity="0.1" />
            <stop offset="1" stopColor="#6366f1" stopOpacity="0" />
          </radialGradient>
          <filter id="vmd-soft-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Satin Squircle Base Plate */}
        <rect
          x="3"
          y="3"
          width="42"
          height="42"
          rx="12"
          fill="url(#vmd-bg-grad)"
          stroke="url(#vmd-border-grad)"
          strokeWidth="1.2"
        />

        {/* Subtle Ambient Radial Backlight */}
        <circle cx="24" cy="24" r="18" fill="url(#vmd-glow-radial)" />

        {/* Dynamic Architectural V & M Synthetic Wings */}
        <path
          d="M12 16L24 35L29 27"
          stroke="url(#vmd-stroke-left)"
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M19 27L24 35L36 16"
          stroke="url(#vmd-stroke-right)"
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Luminous Floating Markdown Glyph Overlay */}
        <path
          d="M17 19.5L24 28.5L31 19.5"
          stroke="url(#vmd-chevron-grad)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#vmd-soft-glow)"
        />

        {/* Micro Precision Node Points */}
        <circle cx="24" cy="11.5" r="2" fill="#38bdf8" />
        <circle cx="24" cy="11.5" r="0.9" fill="#ffffff" />
      </svg>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className={`text-[15px] font-black tracking-tight text-[var(--text-primary)] font-sans ${textClassName}`}>
              Visual<span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent">MD</span>
            </span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
              v1.0
            </span>
          </div>
          <span className="text-[9.5px] font-mono tracking-wider uppercase text-[var(--text-muted)] -mt-0.5">
            Interactive Markdown
          </span>
        </div>
      )}
    </div>
  );
};
