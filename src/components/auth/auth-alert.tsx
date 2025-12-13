import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

interface AuthAlertProps {
  variant?: "error" | "info" | "warning" | "success";
  children: React.ReactNode;
  className?: string;
}

/**
 * AuthAlert - Consistent alert component for authentication pages
 */
export function AuthAlert({
  variant = "error",
  children,
  className,
}: AuthAlertProps) {
  const variantClasses = {
    error: "border-error/30 bg-error/10 text-error",
    info: "border-blue-200 bg-blue-50 text-blue-700",
    warning: "border-warning/30 bg-warning/10 text-warning",
    success: "border-success/30 bg-success/10 text-success",
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border p-3 text-sm",
        variantClasses[variant],
        className
      )}
    >
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
