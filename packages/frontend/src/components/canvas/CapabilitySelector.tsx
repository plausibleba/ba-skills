import { useState, useRef, useEffect, useCallback, useMemo, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useCanvasStore } from "../../store/canvas-store.ts";
import { tv } from "../../theme.ts";
import type { ScaffoldCapability } from "../../types.ts";
import { getCapabilityIds } from "../../types.ts";

/**
 * CapabilitySelector — searchable dropdown for picking existing capabilities
 * or creating a new one (D-097 Step 1 lite).
 *
 * Shows a "+ Add Capability" button that expands into a search input.
 * As user types, filters existing L4 capabilities with fuzzy matching.
 * Selecting an existing one calls linkExistingCapabilityToActivity.
 * Typing a new name and pressing Enter calls addCapabilityToActivity.
 */

interface CapabilitySelectorProps {
  activityId: string;
  className?: string;
}

export function CapabilitySelector({ activityId, className = "" }: CapabilitySelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIdx, setHighlightIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const scaffoldData = useCanvasStore((s) => s.scaffoldData);
  const addCapabilityToActivity = useCanvasStore((s) => s.addCapabilityToActivity);
  const linkExistingCapabilityToActivity = useCanvasStore((s) => s.linkExistingCapabilityToActivity);

  // Get capabilities already on this activity (to exclude from suggestions)
  const existingCapIds = useMemo(() => {
    if (!scaffoldData) return new Set<string>();
    const act = scaffoldData.elements.activities[activityId];
    return act ? new Set(getCapabilityIds(act)) : new Set<string>();
  }, [scaffoldData, activityId]);

  // Build filtered list of available capabilities
  const suggestions = useMemo(() => {
    if (!scaffoldData || !query.trim()) return [];
    const caps = scaffoldData.elements.capabilities ?? {};
    const q = query.toLowerCase();
    const results: { id: string; name: string; level?: number; parentName?: string }[] = [];

    for (const [capId, cap] of Object.entries(caps)) {
      const c = cap as ScaffoldCapability;
      if (existingCapIds.has(capId)) continue; // Already on this activity
      const name = c.name ?? capId;
      if (!name.toLowerCase().includes(q)) continue;

      // Get parent name for context
      let parentName: string | undefined;
      if (c.parentId && caps[c.parentId]) {
        parentName = (caps[c.parentId] as ScaffoldCapability).name;
      }

      results.push({ id: capId, name, level: c.level, parentName });
    }

    // Sort: L4 first, then by name
    results.sort((a, b) => {
      const lvlA = a.level ?? 99;
      const lvlB = b.level ?? 99;
      if (lvlA !== lvlB) return lvlB - lvlA; // Higher level (L4) first
      return a.name.localeCompare(b.name);
    });

    return results.slice(0, 8); // Max 8 suggestions
  }, [scaffoldData, query, existingCapIds]);

  // Does the query exactly match an existing capability?
  const exactMatch = suggestions.find(
    (s) => s.name.toLowerCase() === query.trim().toLowerCase()
  );

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(() => {
    setHighlightIdx(0);
  }, [query]);

  const close = useCallback(() => {
    setQuery("");
    setOpen(false);
    setHighlightIdx(0);
  }, []);

  const selectExisting = useCallback((capId: string) => {
    linkExistingCapabilityToActivity(activityId, capId);
    close();
  }, [activityId, linkExistingCapabilityToActivity, close]);

  const createNew = useCallback(() => {
    const name = query.trim();
    if (!name) return;
    addCapabilityToActivity(activityId, name);
    close();
  }, [query, activityId, addCapabilityToActivity, close]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); close(); return; }

    // Total items = suggestions + (create new option if query doesn't match exactly)
    const hasCreateNew = query.trim() && !exactMatch;
    const totalItems = suggestions.length + (hasCreateNew ? 1 : 0);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((prev) => Math.min(prev + 1, totalItems - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIdx < suggestions.length) {
        selectExisting(suggestions[highlightIdx].id);
      } else if (hasCreateNew) {
        createNew();
      } else if (suggestions.length === 1) {
        selectExisting(suggestions[0].id);
      } else if (query.trim()) {
        createNew();
      }
    }
  }, [suggestions, highlightIdx, query, exactMatch, selectExisting, createNew, close]);

  // Track input position for portal dropdown
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  useLayoutEffect(() => {
    if (open && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownRect({ top: rect.bottom + 2, left: rect.left, width: rect.width });
    } else {
      setDropdownRect(null);
    }
  }, [open, query]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (listRef.current) {
      const el = listRef.current.children[highlightIdx] as HTMLElement | undefined;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIdx]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1 rounded border border-dashed px-2 py-1 text-[10px] font-medium transition-colors ${className}`}
        style={{ borderColor: tv.borderSubtle, color: tv.textDim }}
      >
        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Capability
      </button>
    );
  }

  const hasCreateNew = query.trim().length > 0 && !exactMatch;

  const showDropdown = (suggestions.length > 0 || hasCreateNew) && dropdownRect;

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          // Delay close to allow click on suggestion
          setTimeout(close, 200);
        }}
        placeholder="Search capabilities or type new name…"
        className="w-full rounded px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-400"
        style={{ border: `1px solid ${tv.borderSubtle}`, background: tv.bgSurface, color: tv.textSecondary }}
      />

      {/* Portal dropdown — escapes overflow-hidden on StageCard */}
      {showDropdown && createPortal(
        <div
          ref={listRef}
          className="fixed z-[9999] max-h-48 overflow-auto rounded border shadow-lg"
          style={{
            top: dropdownRect.top,
            left: dropdownRect.left,
            width: dropdownRect.width,
            background: tv.bgCard,
            borderColor: tv.borderSubtle,
          }}
        >
          {suggestions.map((s, i) => (
            <div
              key={s.id}
              onMouseDown={(e) => { e.preventDefault(); selectExisting(s.id); }}
              onMouseEnter={() => setHighlightIdx(i)}
              className="flex items-center gap-2 px-2 py-1.5 cursor-pointer text-[11px]"
              style={{
                background: i === highlightIdx ? tv.bgSurface : "transparent",
                color: tv.textPrimary,
              }}
            >
              <span className="flex-1 truncate">{s.name}</span>
              {s.level && (
                <span className="text-[9px] px-1 rounded" style={{ background: tv.bgSurface, color: tv.textDim }}>
                  L{s.level}
                </span>
              )}
              {s.parentName && (
                <span className="text-[9px] truncate max-w-[100px]" style={{ color: tv.textDim }}>
                  {s.parentName}
                </span>
              )}
            </div>
          ))}
          {hasCreateNew && (
            <div
              onMouseDown={(e) => { e.preventDefault(); createNew(); }}
              onMouseEnter={() => setHighlightIdx(suggestions.length)}
              className="flex items-center gap-2 px-2 py-1.5 cursor-pointer text-[11px] border-t"
              style={{
                background: highlightIdx === suggestions.length ? tv.bgSurface : "transparent",
                color: tv.textDim,
                borderColor: tv.borderSubtle,
              }}
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Create &ldquo;{query.trim()}&rdquo;</span>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
