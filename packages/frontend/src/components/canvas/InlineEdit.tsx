import { useState, useRef, useEffect, useCallback } from "react";
import { useGateCheck } from "../../hooks/useGateCheck.ts";

/**
 * InlineEdit — double-click-to-edit text field (D-092: Editable Canvas).
 *
 * Follows the StoryEditor pattern from TransformationPane:
 * - Double-click to enter edit mode
 * - Enter to save, Escape to cancel
 * - Subtle pencil icon on hover as affordance
 * - Minimal styling — blends with existing Tailwind design language
 *
 * Tier gating: double-click triggers "edit_field" gate check.
 * If the user's tier doesn't allow editing, the upsell modal appears instead.
 */

interface InlineEditProps {
  value: string;
  onSave: (newValue: string) => void;
  className?: string;       // applied to the display text
  inputClassName?: string;  // applied to the input field
  placeholder?: string;
  /** Use textarea instead of input for multi-line content */
  multiline?: boolean;
  /** Max length for the input */
  maxLength?: number;
  /** Inline styles applied to the display span */
  style?: React.CSSProperties;
  /** Skip tier gate check (e.g. for fields that are always editable) */
  ungated?: boolean;
}

export function InlineEdit({
  value,
  onSave,
  className = "",
  inputClassName = "",
  placeholder = "Untitled",
  multiline = false,
  maxLength,
  style,
  ungated = false,
}: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const { gate } = useGateCheck();

  // Sync draft when value changes externally
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  // Auto-focus and select on edit start
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const doStartEdit = useCallback(() => {
    setDraft(value);
    setEditing(true);
  }, [value]);

  const startEdit = useCallback(() => {
    if (ungated) {
      doStartEdit();
    } else {
      gate("edit_field", doStartEdit, "editing model fields");
    }
  }, [ungated, doStartEdit, gate]);

  const save = useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    }
    setEditing(false);
  }, [draft, value, onSave]);

  const cancel = useCallback(() => {
    setDraft(value);
    setEditing(false);
  }, [value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !multiline) {
        e.preventDefault();
        save();
      } else if (e.key === "Enter" && multiline && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        save();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancel();
      }
    },
    [save, cancel, multiline],
  );

  if (editing) {
    const sharedProps = {
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setDraft(e.target.value),
      onBlur: save,
      onKeyDown: handleKeyDown,
      maxLength,
      className: `w-full rounded border border-vcc-300 px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-vcc-400 ${inputClassName}`,
    };

    if (multiline) {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          rows={3}
          {...sharedProps}
        />
      );
    }
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        {...sharedProps}
      />
    );
  }

  return (
    <span
      onDoubleClick={startEdit}
      title="Double-click to edit"
      className={`group/edit cursor-text inline-flex items-center gap-1 ${className}`}
      style={style}
    >
      <span className={value ? "" : "italic text-gray-400"}>{value || placeholder}</span>
      <svg
        className="h-3 w-3 flex-shrink-0 text-gray-300 opacity-0 transition-opacity group-hover/edit:opacity-100"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
        />
      </svg>
    </span>
  );
}
