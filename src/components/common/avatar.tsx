import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface AvatarProps {
  src?: string | null;
  fallback: string;
  alt?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  xs: "h-6 w-6 text-xs",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
};

const imageSizes = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

export function Avatar({
  src,
  fallback,
  alt = "Avatar",
  size = "md",
  className,
}: AvatarProps) {
  const [imageError, setImageError] = React.useState(false);

  if (src && !imageError) {
    return (
      <div
        className={cn(
          "relative shrink-0 overflow-hidden rounded-full bg-muted",
          sizeClasses[size],
          className
        )}
      >
        <Image
          src={src}
          alt={alt}
          width={imageSizes[size]}
          height={imageSizes[size]}
          className="h-full w-full object-cover"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-sidebar-accent font-medium text-sidebar-foreground",
        sizeClasses[size],
        className
      )}
    >
      {fallback}
    </div>
  );
}

