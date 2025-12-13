import * as React from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type StatCardVariant = "blue" | "teal" | "indigo" | "navy";

interface StatCardProps {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  variant?: StatCardVariant;
  className?: string;
  valueClassName?: string;
}

const variantClasses: Record<StatCardVariant, string> = {
  blue: "gradient-blue",
  teal: "gradient-teal",
  indigo: "gradient-indigo",
  navy: "gradient-navy",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  variant = "blue",
  className,
  valueClassName,
}: StatCardProps) {
  const formattedValue =
    typeof value === "number" ? value.toLocaleString() : value;

  return (
    <div
      className={cn(
        "relative flex flex-col justify-between overflow-hidden rounded-xl p-5 text-white shadow-md",
        variantClasses[variant],
        className
      )}
    >
      <div className="space-y-2">
        <p className="text-sm font-medium text-white/80">{label}</p>
        <p
          className={cn(
            "text-3xl font-bold tracking-tight",
            valueClassName
          )}
        >
          {formattedValue}
        </p>
      </div>
      {Icon && (
        <div className="absolute right-4 top-4 opacity-30">
          <Icon className="h-12 w-12" />
        </div>
      )}
    </div>
  );
}

interface StatCardGridProps {
  children: React.ReactNode;
  className?: string;
  columns?: 1 | 2 | 3 | 4;
}

export function StatCardGrid({
  children,
  className,
  columns = 3,
}: StatCardGridProps) {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-4", gridCols[columns], className)}>
      {children}
    </div>
  );
}

