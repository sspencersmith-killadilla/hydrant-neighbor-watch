export function BrandMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="bm-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1f4e63" />
          <stop offset="1" stopColor="#22a06b" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#bm-g)" />
      <path d="M32 9C32 9 15 28 15 39a17 17 0 0 0 34 0C49 28 32 9 32 9z" fill="#fff" />
      <g stroke="#1f6a68" strokeWidth="3.2" strokeLinecap="round">
        <path d="M23 37h18" /><path d="M22.5 43h19" /><path d="M25 49h14" />
      </g>
    </svg>
  );
}
