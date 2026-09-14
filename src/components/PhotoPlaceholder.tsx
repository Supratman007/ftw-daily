/** The "no photo yet" state for a trip/vehicle card -- a plain
 * sand-colored block used to look exactly like a broken image, which
 * is exactly what it was mistaken for. Shared by ProductCardImage
 * (below) and anywhere else a card needs the same fallback. */
export function PhotoPlaceholder({ label, className = "h-40" }: { label: string; className?: string }) {
  return (
    <div className={`flex w-full flex-col items-center justify-center gap-1 bg-sand text-ink-soft ${className}`}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="6" width="18" height="14" rx="2" />
        <path d="M8 6l1.5-2.5h5L16 6" />
        <circle cx="12" cy="13" r="3.5" />
      </svg>
      <span className="text-[11px]">{label}</span>
    </div>
  );
}
