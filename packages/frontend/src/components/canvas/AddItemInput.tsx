import { useState, useRef, useEffect, useCallback } from "react";

/**
 * AddItemInput — compact inline input for adding new scaffold elements (D-093).
 *
 * Shows a small "+ Add" button that expands into a text input.
 * Enter to confirm, Escape or blur to cancel.
 */

interface AddItemInputProps {
  label: string;           // e.g. "Capability", "Activity", "Role"
  onAdd: (name: string) => void;
  className?: string;
}

export function AddItemInput({ label, onAdd, className = "" }: AddItemInputProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const submit = useCallback(() => {
    const trimmed = value.trim();
    if (trimmed) {
      onAdd(trimmed);
    }
    setValue("");
    setOpen(false);
  }, [value, onAdd]);

  const cancel = useCallback(() => {
    setValue("");
    setOpen(false);
  }, []);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1 rounded border border-dashed border-gray-300 px-2 py-1 text-[10px] font-medium text-gray-400 hover:border-vcc-400 hover:text-vcc-600 transition-colors ${className}`}
      >
        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add {label}
      </button>
    );
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); submit(); }
          if (e.key === "Escape") { e.preventDefault(); cancel(); }
        }}
        onBlur={submit}
        placeholder={`New ${label.toLowerCase()} name…`}
        className="flex-1 rounded border border-vcc-300 px-2 py-0.5 text-[11px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-vcc-400"
      />
    </div>
  );
}
