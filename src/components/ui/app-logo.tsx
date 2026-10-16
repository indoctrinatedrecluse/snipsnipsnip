import type { SVGProps } from "react";

interface AppLogoProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

/**
 * Official vector brand logo for SnippetVault.
 * Renders the deep slate rounded squircle with the light-blue `< / >` code ligature.
 */
export function AppLogo({
  size = 28,
  className = "size-7",
  ...props
}: AppLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1024 1024"
      width={size}
      height={size}
      className={className}
      aria-label="SnippetVault Logo"
      {...props}
    >
      <defs>
        <linearGradient id="svLogoBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>
      <rect width="1024" height="1024" rx="220" fill="url(#svLogoBg)" />
      <g
        stroke="#7dd3fc"
        strokeWidth="68"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <path d="M392 336 L208 512 L392 688" />
        <path d="M632 336 L816 512 L632 688" />
        <path d="M636 328 L388 696" />
      </g>
    </svg>
  );
}
