import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", size = "md", className = "", children, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center rounded font-medium transition-colors duration-150";

    const variants = {
      default: "bg-surface-tertiary text-text-primary border border-border hover:bg-surface-elevated",
      primary: "bg-accent text-white border border-accent hover:bg-accent-hover",
      ghost: "bg-transparent text-text-primary border border-transparent hover:bg-surface-tertiary",
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
