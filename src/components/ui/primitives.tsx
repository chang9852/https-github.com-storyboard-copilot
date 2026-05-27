import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from "react";

type ButtonVariant = "primary" | "muted" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface UiButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

interface UiChipButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

function resolveButtonVariant(variant: ButtonVariant): string {
  if (variant === "primary") {
    return "bg-accent text-white hover:bg-accent/90 shadow-sm shadow-accent/20";
  }
  if (variant === "ghost") {
    return "bg-transparent text-text hover:bg-[rgba(15,23,42,0.06)] dark:hover:bg-white/[0.06]";
  }
  if (variant === "danger") {
    return "bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20";
  }
  return "bg-[rgba(15,23,42,0.06)] text-text hover:bg-[rgba(15,23,42,0.12)] dark:bg-white/[0.08] dark:hover:bg-white/[0.12]";
}

function resolveButtonSize(size: ButtonSize): string {
  if (size === "sm") return "h-8 px-3 text-xs gap-1.5";
  if (size === "lg") return "h-11 px-5 text-sm gap-2";
  return "h-10 px-3.5 text-sm gap-1.5";
}

export function UiButton({
  className = "",
  variant = "muted",
  size = "md",
  ...props
}: UiButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98] ${resolveButtonVariant(variant)} ${resolveButtonSize(size)} ${className}`}
      {...props}
    />
  );
}

export const UiChipButton = forwardRef<HTMLButtonElement, UiChipButtonProps>(
  ({ className = "", active = false, ...props }, ref) => (
    <button
      ref={ref}
      className={`inline-flex h-9 items-center gap-2 border border-[color:var(--ui-border-soft)] bg-[var(--ui-surface-field)] px-3 text-xs font-medium transition-colors ${
        active
          ? "border-accent/40 bg-accent/10 text-text"
          : "text-text hover:bg-[rgba(15,23,42,0.06)] dark:hover:bg-white/[0.06]"
      } ${className}`}
      {...props}
    />
  )
);

UiChipButton.displayName = "UiChipButton";

export const UiInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => (
    <input
      ref={ref}
      className={`w-full border border-[color:var(--ui-border-soft)] bg-[var(--ui-surface-field)] px-3 py-2 text-sm text-text outline-none transition-colors placeholder:text-text-muted/60 focus:border-accent focus:shadow-[0_0_0_2px_rgba(var(--accent-rgb),0.12)] rounded-[var(--ui-radius-lg)] ${className}`}
      {...props}
    />
  )
);

UiInput.displayName = "UiInput";

export const UiTextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = "", ...props }, ref) => (
    <textarea
      ref={ref}
      className={`w-full resize-none border border-[color:var(--ui-border-soft)] bg-[var(--ui-surface-field)] px-3 py-2.5 text-sm text-text outline-none transition-colors placeholder:text-text-muted/60 focus:border-accent focus:shadow-[0_0_0_2px_rgba(var(--accent-rgb),0.12)] rounded-[var(--ui-radius-lg)] ${className}`}
      {...props}
    />
  )
);

UiTextArea.displayName = "UiTextArea";

export function UiSelect({ className = "", children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`inline-flex h-9 w-full items-center justify-between border border-[color:var(--ui-border-soft)] bg-[var(--ui-surface-field)] px-3 text-left text-xs font-medium text-text outline-none transition-colors hover:border-[color:var(--ui-border-strong)] focus:border-accent focus:shadow-[0_0_0_2px_rgba(var(--accent-rgb),0.12)] rounded-[var(--ui-radius-lg)] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function UiPanel({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`border border-[color:var(--ui-border-soft)] bg-[var(--ui-surface-panel)] shadow-[var(--ui-shadow-panel)] rounded-[var(--ui-radius-xl)] ${className}`}
      {...props}
    />
  );
}
