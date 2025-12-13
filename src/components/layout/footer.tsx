import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { StatusIndicator } from "@/components/common/status-indicator";

interface FooterLink {
  label: string;
  href: string;
}

interface FooterProps {
  className?: string;
  version?: string;
  status?: "online" | "offline" | "maintenance";
  statusLabel?: string;
  copyright?: string;
  links?: FooterLink[];
}

export function Footer({
  className,
  version,
  status = "online",
  statusLabel,
  copyright = `© ${new Date().getFullYear()} Loops Event Manager. All rights reserved.`,
  links = [],
}: FooterProps) {
  const defaultStatusLabel =
    status === "online"
      ? "System Online"
      : status === "offline"
        ? "System Offline"
        : "Maintenance Mode";

  return (
    <footer
      className={cn(
        "flex flex-col items-center justify-between gap-4 border-t border-border bg-background px-6 py-4 text-sm text-muted-foreground sm:flex-row",
        className
      )}
    >
      {/* Copyright */}
      <div className="text-center sm:text-left">{copyright}</div>

      {/* Links */}
      {links.length > 0 && (
        <nav className="flex items-center gap-4">
          {links.map((link, index) => (
            <React.Fragment key={link.href}>
              {index > 0 && <span className="text-border">•</span>}
              <Link
                href={link.href}
                className="transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Version & Status */}
      <div className="flex items-center gap-4">
        {version && <span>Version {version}</span>}
        <StatusIndicator
          status={status}
          label={statusLabel || defaultStatusLabel}
        />
      </div>
    </footer>
  );
}

