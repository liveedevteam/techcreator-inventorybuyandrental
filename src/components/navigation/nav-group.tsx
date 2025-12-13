"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavGroupProps {
  label?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  className?: string;
}

export function NavGroup({
  label,
  children,
  collapsible = false,
  defaultOpen = true,
  className,
}: NavGroupProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  if (!collapsible) {
    return (
      <div className={cn("space-y-1", className)}>
        {label && (
          <div className="px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              {label}
            </span>
          </div>
        )}
        {children}
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-sidebar-accent/30"
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            {label}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-sidebar-foreground/50 transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </button>
      )}
      {isOpen && <div className="space-y-1">{children}</div>}
    </div>
  );
}

