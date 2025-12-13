import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground",
        notification:
          "min-w-[1.25rem] rounded-full bg-blue-600 px-1.5 py-0.5 text-xs text-white",
        status: "rounded-full px-2.5 py-0.5 text-xs",
        outline:
          "rounded-full border border-border bg-transparent px-2.5 py-0.5 text-xs text-muted-foreground",
      },
      color: {
        default: "",
        success: "bg-success/15 text-success",
        warning: "bg-warning/15 text-warning",
        error: "bg-error/15 text-error",
        blue: "bg-blue-600/15 text-blue-600",
      },
    },
    defaultVariants: {
      variant: "default",
      color: "default",
    },
  }
);

interface BadgeProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'color'>,
    VariantProps<typeof badgeVariants> {}

export function Badge({
  className,
  variant,
  color,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant, color }), className)}
      {...props}
    />
  );
}

