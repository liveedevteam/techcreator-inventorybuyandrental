"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import type { LucideIcon } from "lucide-react";

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectFieldProps {
  label?: string;
  labelIcon?: LucideIcon;
  placeholder?: string;
  helperText?: string;
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  error?: string;
  className?: string;
  id?: string;
}

export function SelectField({
  label,
  labelIcon: LabelIcon,
  placeholder = "Select an option...",
  helperText,
  options,
  value,
  onChange,
  disabled = false,
  error,
  className,
  id,
}: SelectFieldProps) {
  const selectId = id || React.useId();

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label
          htmlFor={selectId}
          className="flex items-center gap-2 text-sm font-medium text-primary"
        >
          {LabelIcon && <LabelIcon className="h-4 w-4" />}
          {label}
        </Label>
      )}

      <div className="relative">
        <select
          id={selectId}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          className={cn(
            "w-full appearance-none rounded-lg border bg-background px-3 py-2.5 pr-10 text-sm transition-colors",
            "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
            error
              ? "border-error focus:border-error focus:ring-error/20"
              : "border-input hover:border-primary/50",
            disabled && "cursor-not-allowed opacity-50",
            !value && "text-muted-foreground"
          )}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>

      {(helperText || error) && (
        <p
          className={cn(
            "text-xs",
            error ? "text-error" : "text-muted-foreground"
          )}
        >
          {error || helperText}
        </p>
      )}
    </div>
  );
}

