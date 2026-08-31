import React, { useId } from 'react';

/** Props for the StrataIcon brand icon. */
export interface StrataIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  /** Primary fiery orange brand color (defaults to #FF5520) */
  color?: string;
}

/**
 * Premium brand icon depicting the Strata tactile mark with an ambient outer glow,
 * a top-lit polished disc with subtle specular edge, and a soft recessed tactile dimple,
 * colored with the signature fiery orange (#FF5520) to radiant amber (#FFAA1D) brand gradient.
 */
export function StrataIcon({
  className = 'w-6 h-6',
  color = '#FF5520',
  ...props
}: StrataIconProps) {
  const id = useId();
  const rawId = id.replace(/:/g, '');
  const outerGradId = `strata-outer-${rawId}`;
  const innerGradId = `strata-inner-${rawId}`;
  const glowGradId = `strata-glow-${rawId}`;
  const rimGradId = `strata-rim-${rawId}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      {...props}
    >
      <defs>
        {/* Ambient atmospheric outer glow */}
        <radialGradient
          id={glowGradId}
          cx="50%"
          cy="50%"
          r="50%"
          fx="50%"
          fy="50%"
        >
          <stop offset="60%" stopColor="#FFAA1D" stopOpacity="0.4" />
          <stop offset="85%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor="#FF5520" stopOpacity="0" />
        </radialGradient>

        {/* Specular rim gradient: delicate polished top light */}
        <linearGradient
          id={rimGradId}
          x1="12"
          y1="3"
          x2="12"
          y2="21"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFEACC" stopOpacity="0.7" />
          <stop offset="40%" stopColor="#FFAA1D" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>

        {/* Outer disc gradient: Matching icon.svg fiery orange -> warm amber */}
        <linearGradient
          id={outerGradId}
          x1="3"
          y1="3"
          x2="21"
          y2="21"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FF6B38" />
          <stop offset="45%" stopColor={color} />
          <stop offset="100%" stopColor="#FFAA1D" />
        </linearGradient>

        {/* Inner dimple gradient: Soft top shadow -> warm reflective floor */}
        <linearGradient
          id={innerGradId}
          x1="12"
          y1="8"
          x2="12"
          y2="16"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#D94010" />
          <stop offset="50%" stopColor="#FF5520" />
          <stop offset="100%" stopColor="#FFAA1D" />
        </linearGradient>
      </defs>

      {/* Layer 1: Ambient warm glow / bloom */}
      <circle cx="12" cy="12" r="11.8" fill={`url(#${glowGradId})`} />

      {/* Layer 2: Outer illuminated disc */}
      <circle cx="12" cy="12" r="9" fill={`url(#${outerGradId})`} />

      {/* Layer 3: Polished specular rim sheen for a tactile premium edge */}
      <circle
        cx="12"
        cy="12"
        r="8.75"
        stroke={`url(#${rimGradId})`}
        strokeWidth="0.5"
      />

      {/* Layer 4: Recessed tactile inner dot */}
      <circle cx="12" cy="12" r="4.0" fill={`url(#${innerGradId})`} />
    </svg>
  );
}

export default StrataIcon;