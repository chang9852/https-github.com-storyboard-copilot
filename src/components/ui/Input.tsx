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
          <label className="text-xs font-medium text-text-secondary">{label}</label>
        )}
        <input
          ref={ref}
          className={`px-3 py-2 rounded text-sm bg-surface-secondary text-text-primary border border-border outline-none focus:border-accent ${error ? "border-danger" : ""} ${className}`}
          {...props}
        />
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";
