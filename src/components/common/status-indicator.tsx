import * as React from "react";
import { cn } from "@/lib/utils";

type Status = "online" | "offline" | "maintenance" | "busy";

interface StatusIndicatorProps {
  status: Status;
  label?: string;
  showLabel?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const statusColors: Record<Status, string> = {
  online: "bg-success",
  offline: "bg-error",
  maintenance: "bg-warning",
  busy: "bg-warning",
};

const statusLabels: Record<Status, string> = {
  online: "Online",
  offline: "Offline",
  maintenance: "Maintenance",
  busy: "Busy",
};

const sizeClasses = {
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
  lg: "h-3 w-3",
};

export function StatusIndicator({
  status,
  label,
  showLabel = true,
  className,
  size = "md",
}: StatusIndicatorProps) {
  const displayLabel = label || statusLabels[status];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        className={cn(
          "shrink-0 rounded-full",
          statusColors[status],
          sizeClasses[size],
          status === "online" && "animate-pulse"
        )}
        aria-hidden="true"
      />
      {showLabel && (
        <span
          className={cn(
            "text-sm",
            status === "online" && "text-success",
            status === "offline" && "text-error",
            status === "maintenance" && "text-warning",
            status === "busy" && "text-warning"
          )}
        >
          {displayLabel}
        </span>
      )}
    </div>
  );
}

