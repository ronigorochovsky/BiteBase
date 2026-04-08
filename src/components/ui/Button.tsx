"use client";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "green" | "purple";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const variantClasses = {
  primary:
    "bg-brand-500 text-white hover:bg-brand-600 disabled:bg-brand-300",
  secondary:
    "bg-white text-gray-700 border border-stone-300 hover:bg-stone-50 disabled:opacity-50",
  ghost:
    "bg-transparent text-gray-600 hover:bg-stone-100 disabled:opacity-50",
  danger:
    "bg-red-500 text-white hover:bg-red-600 disabled:bg-red-300",
  green:
    "bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300",
  purple:
    "bg-purple-600 text-white hover:bg-purple-700 disabled:bg-purple-300",
};

const sizeClasses = {
  sm: "px-3 py-1.5 text-sm rounded-lg",
  md: "px-4 py-2 text-sm rounded-xl",
  lg: "px-6 py-3 text-base rounded-xl",
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-1",
        variantClasses[variant],
        sizeClasses[size],
        (disabled || loading) && "cursor-not-allowed",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
