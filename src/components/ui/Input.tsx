import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-xs font-medium text-text-muted">{label}</label>
        )}
        <input
          ref={ref}
          className={`rounded border border-[var(--ui-border-soft)] bg-[var(--ui-surface-field)] px-3 py-2 text-sm text-text-dark outline-none placeholder:text-text-muted focus:border-accent ${error ? "border-danger" : ""} ${className}`}
          {...props}
        />
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";
