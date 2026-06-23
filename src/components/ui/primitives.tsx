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
    return "bg-[#111315] text-white hover:bg-black font-medium shadow-md transition-all";
  }
  if (variant === "ghost") {
    return "bg-transparent text-text hover:bg-[var(--ui-surface-field)]";
  }
  if (variant === "danger") {
    return "bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20";
  }
  return "border border-[var(--ui-border-soft)] bg-[var(--ui-surface-field)] text-text shadow-sm hover:bg-[var(--ui-glass-bg-hover)]";
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
      className={`inline-flex h-9 items-center gap-2 border border-[var(--ui-border-soft)] bg-[var(--ui-surface-field)] px-3 text-xs font-medium transition-colors ${
        active
          ? "border-accent/30 bg-accent/15 text-accent"
          : "text-text hover:bg-[var(--ui-glass-bg-hover)]"
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
      className={`w-full border border-[var(--ui-border-soft)] bg-[var(--ui-surface-field)] px-3 py-2 text-sm text-text outline-none transition-colors placeholder:text-text-muted/60 focus:border-accent focus:shadow-[0_0_0_2px_rgba(var(--accent-rgb),0.12)] rounded-[var(--ui-radius-lg)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] ${className}`}
      {...props}
    />
  )
);

UiInput.displayName = "UiInput";

export const UiTextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = "", ...props }, ref) => (
    <textarea
      ref={ref}
      className={`w-full resize-none border border-[var(--ui-border-soft)] bg-[var(--ui-surface-field)] px-3 py-2.5 text-sm text-text outline-none transition-colors placeholder:text-text-muted/60 focus:border-accent focus:shadow-[0_0_0_2px_rgba(var(--accent-rgb),0.12)] rounded-[var(--ui-radius-lg)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] ${className}`}
      {...props}
    />
  )
);

UiTextArea.displayName = "UiTextArea";

export function UiSelect({ className = "", children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`inline-flex h-9 w-full items-center justify-between border border-[var(--ui-border-soft)] bg-[var(--ui-surface-field)] px-3 text-left text-xs font-medium text-text outline-none transition-colors hover:border-[color:var(--ui-border-strong)] focus:border-accent focus:shadow-[0_0_0_2px_rgba(var(--accent-rgb),0.12)] rounded-[var(--ui-radius-lg)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function UiPanel({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`border border-[color:var(--ui-border-soft)] bg-[var(--ui-surface-panel)] shadow-[var(--ui-shadow-panel)] rounded-[var(--ui-radius-xl)] backdrop-blur-[20px] backdrop-saturate-120 ${className}`}
      style={{ boxShadow: "var(--ui-shadow-panel), inset 0 1px 1px var(--ui-border-soft)" }}
      {...props}
    />
  );
}
