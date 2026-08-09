import React from 'react';

/** Props for the StrataIcon brand icon. */
export interface StrataIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  gradient?: boolean;
}

/**
 * Brand icon depicting the signature asad.dev solid circular dot.
 *
 * @param props - Component props.
 * @param props.gradient - When true, fill uses the primary-to-secondary brand gradient instead of the inherited color.
 */
export function StrataIcon({ className = 'w-5 h-5', gradient = false, ...props }: StrataIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      {...props}
    >
      {gradient && (
        <defs>
          {/* Shared gradient referenced by the circle fill */}
          <linearGradient id="strata-gradient" x1="2" y1="4" x2="22" y2="20" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF5520" />
            <stop offset="1" stopColor="#FFAA1D" />
          </linearGradient>
        </defs>
      )}
      {/* Signature asad.dev circular brand dot */}
      <circle
        cx="12"
        cy="12"
        r="9"
        fill={gradient ? 'url(#strata-gradient)' : 'currentColor'}
      />
    </svg>
  );
}

export default StrataIcon;
