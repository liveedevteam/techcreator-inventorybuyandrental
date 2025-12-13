import * as React from "react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";

interface IconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children">,
    Omit<VariantProps<typeof buttonVariants>, "size"> {
  icon: LucideIcon;
  size?: "sm" | "md" | "lg";
  "aria-label"?: string;
}

const sizeMap = {
  sm: "icon-sm" as const,
  md: "icon" as const,
  lg: "icon-lg" as const,
};

const iconSizeMap = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export function IconButton({
  icon: Icon,
  size = "md",
  variant = "ghost",
  className,
  ...props
}: IconButtonProps) {
  return (
    <Button
      variant={variant}
      size={sizeMap[size]}
      className={cn("shrink-0", className)}
      {...props}
    >
      <Icon className={iconSizeMap[size]} />
    </Button>
  );
}

