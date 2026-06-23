import { useEffect, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "./Button";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
  showFooter?: boolean;
}

export function Dialog({
  open,
  onClose,
  title,
  children,
  onConfirm,
  confirmText = "common.confirm",
  cancelText = "common.cancel",
  showFooter = true,
}: DialogProps) {
  const { t } = useTranslation();
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative mx-4 w-full max-w-md rounded-lg border border-[var(--ui-border-soft)] bg-[var(--ui-surface-panel)] shadow-[var(--ui-shadow-panel)]">
        <div className="flex items-center justify-between border-b border-[var(--ui-border-soft)] px-4 py-3">
          <h3 className="text-sm font-semibold text-text-dark">{title}</h3>
          <button
            onClick={onClose}
            className="text-text-muted transition-colors hover:text-text-dark"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="px-4 py-4">{children}</div>
        {showFooter && (
          <div className="flex justify-end gap-2 border-t border-[var(--ui-border-soft)] px-4 py-3">
            <Button variant="ghost" onClick={onClose}>
              {t(cancelText)}
            </Button>
            {onConfirm && (
              <Button variant="primary" onClick={onConfirm}>
                {t(confirmText)}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
