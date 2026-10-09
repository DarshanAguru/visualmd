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
        className="shrink-0 transition-transform hover:scale-105 duration-200"
      >
        <defs>
          <linearGradient id="vmd-cyan-blue" x1="6" y1="8" x2="26" y2="42" gradientUnits="userSpaceOnUse">
            <stop stopColor="#38bdf8" />
            <stop offset="0.5" stopColor="#3b82f6" />
            <stop offset="1" stopColor="#6366f1" />
          </linearGradient>
          <linearGradient id="vmd-violet-pink" x1="22" y1="8" x2="42" y2="42" gradientUnits="userSpaceOnUse">
            <stop stopColor="#818cf8" />
            <stop offset="0.5" stopColor="#a855f7" />
            <stop offset="1" stopColor="#ec4899" />
          </linearGradient>
          <linearGradient id="vmd-top-plate" x1="24" y1="4" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="1" stopColor="#93c5fd" stopOpacity="0.4" />
          </linearGradient>
          <filter id="vmd-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer subtle glow boundary */}
        <circle cx="24" cy="24" r="22" fill="#6366f1" fillOpacity="0.08" />

        {/* Isometric Prism Base Plate */}
        <polygon
          points="24,4 42,14 42,34 24,44 6,34 6,14"
          fill="#0f172a"
          stroke="#334155"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Left 'V' Wing: Cyber Cyan/Blue */}
        <path
          d="M6 14L24 24V44L6 34V14Z"
          fill="url(#vmd-cyan-blue)"
          fillOpacity="0.9"
        />

        {/* Right 'M' Wing: Violet/Magenta */}
        <path
          d="M42 14L24 24V44L42 34V14Z"
          fill="url(#vmd-violet-pink)"
          fillOpacity="0.85"
        />

        {/* Top Diamond Facet: Translucent Light Reflection */}
        <polygon
          points="24,4 42,14 24,24 6,14"
          fill="url(#vmd-top-plate)"
        />

        {/* Internal Interactive 'V' & 'M' Glyph Overlay */}
        <path
          d="M14 18L24 32L34 18"
          stroke="#ffffff"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#vmd-glow)"
        />

        {/* Center Markdown Chevron */}
        <path
          d="M20 22L24 27L28 22"
          stroke="#38bdf8"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Glowing Interactive Data Node Points */}
        <circle cx="24" cy="4" r="2.5" fill="#facc15" stroke="#ffffff" strokeWidth="1" />
        <circle cx="42" cy="14" r="2" fill="#38bdf8" />
        <circle cx="6" cy="14" r="2" fill="#ec4899" />
        <circle cx="24" cy="44" r="2" fill="#818cf8" />
      </svg>

      {showText && (
        <div className="flex flex-col">
          <span className={`text-base font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent ${textClassName}`}>
            VisualMD
          </span>
          <span className="text-[9px] font-mono tracking-widest uppercase text-slate-500 -mt-1">
            Visual Markdown
          </span>
        </div>
      )}
    </div>
  );
};
