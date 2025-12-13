import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

interface AuthCardProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * AuthCard - Consistent card component for authentication pages
 * Provides the card styling with sidebar theme colors
 */
export function AuthCard({ children, className }: AuthCardProps) {
  return (
    <Card
      className={cn(
        "relative w-full max-w-md border-sidebar-border bg-sidebar/80 backdrop-blur-xl shadow-2xl",
        className
      )}
    >
      {children}
    </Card>
  );
}

interface AuthLayoutProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * AuthLayout - Consistent layout wrapper for authentication pages
 * Includes gradient background and decorative elements
 */
export function AuthLayout({ children, className }: AuthLayoutProps) {
  return (
    <div
      className={cn(
        "min-h-screen flex items-center justify-center bg-gradient-to-br from-sidebar via-navy-800 to-sidebar p-4",
        className
      )}
    >
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-blue-400/10 blur-3xl" />
      </div>

      {children}
    </div>
  );
}

interface AuthCardHeaderProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: React.ReactNode;
  iconVariant?: "default" | "success" | "error" | "warning";
  className?: string;
}

/**
 * AuthCardHeader - Consistent header for auth cards with icon, title, and description
 */
export function AuthCardHeader({
  icon: Icon,
  title,
  description,
  iconVariant = "default",
  className,
}: AuthCardHeaderProps) {
  const iconBgClasses = {
    default: "bg-sidebar-accent",
    success: "bg-success/20",
    error: "bg-error/20",
    warning: "bg-warning/20",
  };

  const iconColorClasses = {
    default: "text-blue-400",
    success: "text-success",
    error: "text-error",
    warning: "text-warning",
  };

  return (
    <CardHeader className={cn("space-y-4 text-center pb-2", className)}>
      <div className="flex justify-center">
        <div
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg",
            iconBgClasses[iconVariant]
          )}
        >
          <Icon className={cn("h-8 w-8", iconColorClasses[iconVariant])} />
        </div>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-sidebar-foreground/70">{description}</p>
        )}
      </div>
    </CardHeader>
  );
}

export { CardContent as AuthCardContent, CardFooter as AuthCardFooter };
