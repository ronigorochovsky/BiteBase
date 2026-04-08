import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "orange" | "green" | "blue" | "gray";
  className?: string;
  style?: React.CSSProperties;
}

const variantClasses = {
  orange: "bg-orange-100 text-orange-800",
  green: "bg-emerald-100 text-emerald-800",
  blue: "bg-blue-100 text-blue-800",
  gray: "bg-stone-100 text-stone-700",
};

export function Badge({
  children,
  variant,
  className,
  style,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-block px-2.5 py-0.5 rounded-full text-xs font-medium",
        variant ? variantClasses[variant] : (!style ? "bg-stone-100 text-stone-700" : ""),
        className
      )}
      style={style}
    >
      {children}
    </span>
  );
}
