"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface SidebarProps {
  children: React.ReactNode;
  className?: string;
}

export function Sidebar({ children, className }: SidebarProps) {
  return (
    <div className={cn("flex h-full flex-col", className)}>{children}</div>
  );
}

interface SidebarHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function SidebarHeader({ children, className }: SidebarHeaderProps) {
  return (
    <div className={cn("flex items-center gap-3 px-4 py-5", className)}>
      {children}
    </div>
  );
}

interface SidebarBrandProps {
  icon?: LucideIcon;
  iconClassName?: string;
  title: string;
  subtitle?: string;
  href?: string;
  className?: string;
}

export function SidebarBrand({
  icon: Icon,
  iconClassName,
  title,
  subtitle,
  href = "/",
  className,
}: SidebarBrandProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-4 py-5 transition-opacity hover:opacity-90",
        className
      )}
    >
      {Icon && (
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-accent">
          <Icon className={cn("h-6 w-6 text-blue-400", iconClassName)} />
        </div>
      )}
      <div className="flex flex-col">
        <span className="text-lg font-bold leading-tight text-white">
          {title}
        </span>
        {subtitle && (
          <span className="text-sm text-sidebar-foreground/70">{subtitle}</span>
        )}
      </div>
    </Link>
  );
}

interface SidebarNavProps {
  children: React.ReactNode;
  className?: string;
}

export function SidebarNav({ children, className }: SidebarNavProps) {
  return (
    <nav className={cn("flex-1 space-y-1 px-3 py-4", className)}>
      {children}
    </nav>
  );
}

interface SidebarFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function SidebarFooter({ children, className }: SidebarFooterProps) {
  return (
    <div
      className={cn("mt-auto border-t border-sidebar-border p-4", className)}
    >
      {children}
    </div>
  );
}

