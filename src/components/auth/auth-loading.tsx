import * as React from "react";
import { Loader2 } from "lucide-react";
import { AuthLayout, AuthCard } from "./auth-card";
import { CardContent } from "@/components/ui/card";

interface AuthLoadingProps {
  message?: string;
}

/**
 * AuthLoading - Consistent loading state for authentication pages
 */
export function AuthLoading({ message = "Loading..." }: AuthLoadingProps) {
  return (
    <AuthLayout>
      <AuthCard>
        <CardContent className="py-12">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            <p className="text-sidebar-foreground/70">{message}</p>
          </div>
        </CardContent>
      </AuthCard>
    </AuthLayout>
  );
}
