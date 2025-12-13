"use client";

import * as React from "react";
import Link from "next/link";
import { LogOut, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/common/avatar";

interface UserMenuProps {
  name: string;
  email?: string;
  role?: string;
  avatarSrc?: string;
  avatarFallback?: string;
  onLogout?: () => void;
  profileHref?: string;
  className?: string;
}

export function UserMenu({
  name,
  email,
  role,
  avatarSrc,
  avatarFallback,
  onLogout,
  profileHref,
  className,
}: UserMenuProps) {
  const fallback =
    avatarFallback ||
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const content = (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg p-2 transition-colors",
        profileHref && "hover:bg-sidebar-accent/50",
        className
      )}
    >
      <Avatar src={avatarSrc} fallback={fallback} size="md" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-white">{name}</span>
        <span className="truncate text-xs text-sidebar-foreground/70">
          {role || email}
        </span>
      </div>
      {profileHref && (
        <ChevronRight className="h-4 w-4 shrink-0 text-sidebar-foreground/50" />
      )}
      {onLogout && !profileHref && (
        <button
          type="button"
          onClick={onLogout}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-white"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  if (profileHref) {
    return <Link href={profileHref}>{content}</Link>;
  }

  return content;
}

