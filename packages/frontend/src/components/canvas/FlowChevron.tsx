/* ── Flow Chevron (between column headers) — filled arrow shape ───── */

import { tv } from "../../theme.ts";

export function FlowChevron() {
  return (
    <div className="flex flex-shrink-0 items-start">
      <svg
        className="h-[88px] w-5"
        viewBox="0 0 20 88"
        preserveAspectRatio="none"
        fill="none"
        style={{ opacity: 0.6 }}
      >
        <path
          d="M0 0 L18 44 L0 88"
          fill={tv.borderSubtle}
          opacity="0.7"
        />
        <path
          d="M0 0 L18 44 L0 88"
          stroke={tv.borderSubtle}
          strokeWidth="0.5"
          fill="none"
        />
      </svg>
    </div>
  );
}
