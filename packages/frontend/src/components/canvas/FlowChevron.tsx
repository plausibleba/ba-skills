/* ── Flow Chevron (between column headers) — filled arrow shape ───── */

export function FlowChevron() {
  return (
    <div className="flex flex-shrink-0 items-start">
      <svg
        className="h-[88px] w-5"
        viewBox="0 0 20 88"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M0 0 L18 44 L0 88"
          fill="currentColor"
          className="text-vcc-500/25"
        />
        <path
          d="M0 0 L18 44 L0 88"
          stroke="currentColor"
          strokeWidth="0.5"
          className="text-vcc-400/40"
          fill="none"
        />
      </svg>
    </div>
  );
}
