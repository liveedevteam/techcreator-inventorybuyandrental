"use client";

import * as React from "react";
import { Upload, FileIcon, X, Folder } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface FileInputProps {
  label?: string;
  accept?: string;
  maxSize?: string;
  helperText?: string;
  placeholder?: string;
  onChange?: (file: File | null) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function FileInput({
  label,
  accept,
  maxSize,
  helperText,
  placeholder = "Choose file...",
  onChange,
  onError,
  disabled = false,
  className,
  id,
}: FileInputProps) {
  const inputId = id || React.useId();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const handleFileChange = (selectedFile: File | null) => {
    if (selectedFile && maxSize) {
      const maxBytes = parseMaxSize(maxSize);
      if (selectedFile.size > maxBytes) {
        onError?.(`File size exceeds ${maxSize}`);
        return;
      }
    }
    setFile(selectedFile);
    onChange?.(selectedFile);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    handleFileChange(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (accept) {
        const acceptedTypes = accept.split(",").map((t) => t.trim());
        const fileExtension = `.${droppedFile.name.split(".").pop()}`;
        if (
          !acceptedTypes.some(
            (type) =>
              droppedFile.type.match(type.replace("*", ".*")) ||
              fileExtension === type
          )
        ) {
          onError?.("File type not accepted");
          return;
        }
      }
      handleFileChange(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const clearFile = () => {
    setFile(null);
    onChange?.(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label
          htmlFor={inputId}
          className="flex items-center gap-2 text-sm font-medium text-primary"
        >
          <FileIcon className="h-4 w-4" />
          {label}
        </Label>
      )}

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "relative flex items-center gap-3 rounded-lg border bg-background px-3 py-2 transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-input hover:border-primary/50",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          disabled={disabled}
          className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />

        <div className="flex flex-1 items-center gap-2 text-sm">
          {file ? (
            <>
              <FileIcon className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate text-foreground">{file.name}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  clearFile();
                }}
                className="ml-auto shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <span className="text-muted-foreground">{placeholder}</span>
              <Folder className="ml-auto h-4 w-4 shrink-0 text-primary" />
            </>
          )}
        </div>
      </div>

      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}

function parseMaxSize(maxSize: string): number {
  const units: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
  };

  const match = maxSize.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)$/i);
  if (!match) return Infinity;

  const [, value, unit] = match;
  return parseFloat(value) * (units[unit.toUpperCase()] || 1);
}

