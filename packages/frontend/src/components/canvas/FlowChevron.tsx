/* ── Flow Chevron (between column headers) — filled arrow shape ───── */

import { useThemeStore } from "../../store/theme-store.ts";

export function FlowChevron() {
  const isDark = useThemeStore((s) => s.mode) === "dark";
  const fillColor = isDark ? "rgba(46,63,92,0.4)" : "rgba(148,163,184,0.25)";
  const strokeColor = isDark ? "rgba(46,63,92,0.6)" : "rgba(148,163,184,0.4)";

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
          fill={fillColor}
        />
        <path
          d="M0 0 L18 44 L0 88"
          stroke={strokeColor}
          strokeWidth="0.5"
          fill="none"
        />
      </svg>
    </div>
  );
}
