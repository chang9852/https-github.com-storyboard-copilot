import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", size = "md", className = "", children, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center rounded font-medium transition-colors duration-150";

    const variants = {
      default: "border border-[var(--ui-border-soft)] bg-[var(--ui-surface-field)] text-text-dark hover:bg-[var(--ui-glass-bg-hover)]",
      primary: "bg-accent text-white border border-accent hover:bg-accent-hover",
      ghost: "border border-transparent bg-transparent text-text-dark hover:bg-[var(--ui-surface-field)]",
      danger: "bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20",
    };

    const sizes = {
      sm: "px-2 py-1 text-xs gap-1",
      md: "px-3 py-1.5 text-sm gap-1.5",
      lg: "px-4 py-2 text-base gap-2",
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
