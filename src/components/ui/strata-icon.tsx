import React, { useId } from 'react';

/** Props for the StrataIcon brand icon. */
export interface StrataIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  /** Primary fiery orange brand color (defaults to #FF5005) */
  color?: string;
}

/**
 * 1:1 Brand icon matching the 3D tactile concave mark:
 * - Smooth top-right to bottom-left lighting
 * - Soft recessed inner dimple with cast shadow
 * - Ambient warm drop-glow
 */
export function StrataIcon({
  className = 'w-6 h-6',
  color = '#FF5005',
  ...props
}: StrataIconProps) {
  const id = useId();
  const rawId = id.replace(/:/g, '');
  const outerGradId = `strata-outer-${rawId}`;
  const innerGradId = `strata-inner-${rawId}`;
  const glowGradId = `strata-glow-${rawId}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <defs>
        {/* Ambient warm drop glow */}
        <radialGradient
          id={glowGradId}
          cx="50%"
          cy="50%"
          r="50%"
          fx="50%"
          fy="50%"
        >
          <stop offset="60%" stopColor="#FF4D08" stopOpacity="0.38" />
          <stop offset="80%" stopColor="#FF7A1A" stopOpacity="0.16" />
          <stop offset="95%" stopColor="#FFA020" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#FF4500" stopOpacity="0" />
        </radialGradient>

        {/* Outer Disc: Top-Right (Golden Amber) -> Bottom-Left (Deep Red-Orange) */}
        <linearGradient
          id={outerGradId}
          x1="18.5"
          y1="5.5"
          x2="5.5"
          y2="18.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFA116" />
          <stop offset="35%" stopColor="#FF7108" />
          <stop offset="68%" stopColor={color} />
          <stop offset="100%" stopColor="#FF3100" />
        </linearGradient>

        {/* Inner Dimple: Top-Left Shadow -> Bottom-Right Illuminated Floor */}
        <linearGradient
          id={innerGradId}
          x1="10.2"
          y1="8.6"
          x2="13.8"
          y2="15.4"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#AD2500" />
          <stop offset="28%" stopColor="#CD3602" />
          <stop offset="65%" stopColor="#FF6B08" />
          <stop offset="100%" stopColor="#FFA016" />
        </linearGradient>
      </defs>

      {/* Layer 1: Ambient soft outer bloom */}
      <circle cx="12" cy="12" r="11.8" fill={`url(#${glowGradId})`} />

      {/* Layer 2: Main tactile body disc */}
      <circle cx="12" cy="12" r="8.6" fill={`url(#${outerGradId})`} />

      {/* Layer 3: Recessed inner dimple cavity */}
      <circle cx="12" cy="12" r="3.7" fill={`url(#${innerGradId})`} />
    </svg>
  );
}

export default StrataIcon;