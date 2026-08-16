import React, { useId } from 'react';

/** Props for the StrataIcon brand icon. */
export interface StrataIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  /** Primary orange brand color (defaults to #E27828) */
  color?: string;
}

/**
 * Premium brand icon depicting the Strata tactile mark with an ambient outer glow,
 * a top-lit polished disc with subtle specular edge, and a soft recessed tactile dimple.
 */
export function StrataIcon({
  className = 'w-6 h-6',
  color = '#E27828',
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
          <stop offset="60%" stopColor="#FFA438" stopOpacity="0.38" />
          <stop offset="85%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor="#CC5424" stopOpacity="0" />
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
          <stop offset="0%" stopColor="#FFE0B2" stopOpacity="0.65" />
          <stop offset="40%" stopColor="#FFAE52" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>

        {/* Outer disc gradient: Soft warm amber highlight -> muted terracotta bottom */}
        <linearGradient
          id={outerGradId}
          x1="12"
          y1="3"
          x2="12"
          y2="21"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#ECA248" />
          <stop offset="45%" stopColor={color} />
          <stop offset="100%" stopColor="#CC5424" />
        </linearGradient>

        {/* Inner dimple gradient: Softened upper shadow -> warm reflective floor */}
        <linearGradient
          id={innerGradId}
          x1="12"
          y1="8"
          x2="12"
          y2="16"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#CB622C" />
          <stop offset="45%" stopColor="#DC7A2E" />
          <stop offset="100%" stopColor="#EFA546" />
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