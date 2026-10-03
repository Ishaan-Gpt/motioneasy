/** The MotionEasy mark: a dot leaving two motion ghosts behind it. */
export function Mark({ size = 28, inverted = false }: { size?: number; inverted?: boolean }) {
  const bg = inverted ? "#FFFFEB" : "#1A1A1A";
  const fg = inverted ? "#1A1A1A" : "#FFFFEB";
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden>
      <rect width="28" height="28" rx="8" fill={bg} />
      <circle cx="9" cy="14" r="3.2" fill={fg} opacity="0.22" />
      <circle cx="13.2" cy="14" r="4" fill={fg} opacity="0.45" />
      <circle cx="18.6" cy="14" r="5" fill={fg} />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Mark />
      <span className="text-[17px] font-bold tracking-[-0.04em]">
        Motion<em className="text-[19px] tracking-normal">Easy</em>
      </span>
    </span>
  );
}
