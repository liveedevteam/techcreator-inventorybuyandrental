"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/common/badge";
import type { LucideIcon } from "lucide-react";

interface NavItemProps {
  href: string;
  icon: LucideIcon;
  children: React.ReactNode;
  badge?: number | string;
  exact?: boolean;
  className?: string;
  onClick?: () => void;
}

export function NavItem({
  href,
  icon: Icon,
  children,
  badge,
  exact = false,
  className,
  onClick,
}: NavItemProps) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
        isActive
          ? "bg-sidebar-accent text-white"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
        className
      )}
    >
      <Icon
        className={cn(
          "h-5 w-5 shrink-0 transition-colors",
          isActive
            ? "text-blue-400"
            : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/70"
        )}
      />
      <span className="flex-1 truncate">{children}</span>
      {badge !== undefined && (
        <Badge
          variant={typeof badge === "number" ? "notification" : "default"}
          className="ml-auto"
        >
          {badge}
        </Badge>
      )}
    </Link>
  );
}

