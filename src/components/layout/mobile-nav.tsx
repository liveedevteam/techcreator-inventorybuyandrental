"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppShell } from "./app-shell";
import { Badge } from "@/components/common/badge";
import type { LucideIcon } from "lucide-react";

interface MobileNavProps {
  className?: string;
  brandIcon?: LucideIcon;
  brandTitle?: string;
  brandHref?: string;
  notificationCount?: number;
  onNotificationClick?: () => void;
}

export function MobileNav({
  className,
  brandIcon: BrandIcon,
  brandTitle = "Loops",
  brandHref = "/",
  notificationCount,
  onNotificationClick,
}: MobileNavProps) {
  const { setSidebarOpen, isMobile } = useAppShell();

  if (!isMobile) return null;

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 items-center justify-between border-b border-sidebar-border bg-sidebar px-4 lg:hidden",
        className
      )}
    >
      {/* Menu Button */}
      <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
        aria-label="Open menu"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Brand */}
      <Link
        href={brandHref}
        className="flex items-center gap-2 text-sidebar-foreground"
      >
        {BrandIcon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-accent">
            <BrandIcon className="h-5 w-5 text-blue-400" />
          </div>
        )}
        <span className="text-lg font-bold">{brandTitle}</span>
      </Link>

      {/* Notifications */}
      <button
        type="button"
        onClick={onNotificationClick}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
        aria-label="Notifications"
      >
        <Bell className="h-6 w-6" />
        {notificationCount !== undefined && notificationCount > 0 && (
          <Badge
            variant="notification"
            className="absolute -right-1 -top-1 min-w-[1.25rem] px-1.5"
          >
            {notificationCount > 99 ? "99+" : notificationCount}
          </Badge>
        )}
      </button>
    </header>
  );
}

