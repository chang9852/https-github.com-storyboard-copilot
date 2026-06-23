export { Button } from "./Button";
export { Input } from "./Input";
export { Dialog } from "./Dialog";
export { Select } from "./Select";
export { UiButton, UiChipButton, UiInput, UiTextArea, UiSelect, UiPanel } from "./primitives";

// Simple Modal component
import React, { useEffect, useRef } from 'react';

interface UiModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  widthClassName?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export function UiModal({ isOpen, onClose, title, widthClassName = 'w-[480px]', footer, children }: UiModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        ref={dialogRef}
        className={`relative ${widthClassName} rounded-lg border border-[var(--ui-border-soft)] bg-[var(--ui-surface-panel)] shadow-[var(--ui-shadow-panel)]`}
      >
        <div className="flex items-center justify-between border-b border-[var(--ui-border-soft)] px-4 py-3">
          <h2 className="text-sm font-semibold text-text-dark">{title}</h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-dark"
          >
            ×
          </button>
        </div>
        <div className="p-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-[var(--ui-border-soft)] px-4 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// Checkbox component
interface UiCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
}

export function UiCheckbox({ checked, onCheckedChange, onClick, className = '' }: UiCheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={(e) => {
        onClick?.(e);
        onCheckedChange(!checked);
      }}
      className={`h-4 w-4 rounded border border-[var(--ui-border-soft)] bg-[var(--ui-surface-field)] ${checked ? 'border-accent bg-accent' : ''} ${className}`}
    >
      {checked && <span className="text-white text-xs">✓</span>}
    </button>
  );
}
