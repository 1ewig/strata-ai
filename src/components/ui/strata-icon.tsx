import React from 'react';

/** Props for the StrataIcon brand icon. */
export interface StrataIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

/**
 * Brand icon depicting the signature asad.dev gradient circle dot.
 */
export function StrataIcon({ className = 'w-5 h-5', ...props }: StrataIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="strata-gradient" x1="2" y1="4" x2="22" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF5520" />
          <stop offset="1" stopColor="#FFAA1D" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="9" fill="url(#strata-gradient)" />
    </svg>
  );
}

export default StrataIcon;