import React from 'react';

/** Props for the StrataIcon brand icon. */
export interface StrataIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  gradient?: boolean;
}

/**
 * Brand icon depicting three strata layers plus a subtle AI spark star.
 *
 * @param props - Component props.
 * @param props.gradient - When true, strokes and fills use the primary-to-secondary brand gradient instead of the inherited color.
 */
export function StrataIcon({ className = 'w-5 h-5', gradient = false, ...props }: StrataIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={gradient ? 'url(#strata-gradient)' : 'currentColor'}
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {gradient && (
        <defs>
          {/* Shared gradient referenced by the stroke url and star fill */}
          <linearGradient id="strata-gradient" x1="2" y1="4" x2="22" y2="20" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F15A2B" />
            <stop offset="1" stopColor="#FFC229" />
          </linearGradient>
        </defs>
      )}
      {/* Top Strata Layer */}
      <path d="M4 6.5h16" />
      
      {/* Middle Strata Layer */}
      <path d="M4 12h12" />
      
      {/* Bottom Strata Layer */}
      <path d="M4 17.5h16" />
      
      {/* Subtle AI Spark Star */}
      <path
        d="M18.5 3.5l.5 1.2 1.2.5-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5z"
        fill={gradient ? 'url(#strata-gradient)' : 'currentColor'}
        stroke="none"
      />
    </svg>
  );
}

export default StrataIcon;
