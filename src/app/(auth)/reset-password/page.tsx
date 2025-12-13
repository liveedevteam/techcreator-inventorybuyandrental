"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Button,
  Input,
  Label,
  AuthLayout,
  AuthCard,
  AuthCardHeader,
  AuthCardContent,
  AuthCardFooter,
  AuthAlert,
  AuthLoading,
} from "@/components";
import { trpc } from "@/lib/trpc/client";
import { KeyRound, CheckCircle, XCircle, Loader2, Lock } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const { data: tokenValid, isLoading: isVerifying, error: verifyError } = 
    trpc.auth.verifyResetToken.useQuery(
      { token: token || "" },
      { enabled: !!token, retry: false }
    );

  const resetPasswordMutation = trpc.auth.resetPassword.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!token) {
      setError("Invalid reset token");
      return;
    }

    resetPasswordMutation.mutate({ token, password });
  };

  // No token provided
  if (!token) {
    return (
      <AuthLayout>
        <AuthCard>
          <AuthCardHeader
            icon={XCircle}
            iconVariant="error"
            title="Invalid Link"
            description="This password reset link is invalid or has expired."
          />
          <AuthCardFooter>
            <Link href="/forgot-password" className="w-full">
              <Button className="w-full">Request new reset link</Button>
            </Link>
          </AuthCardFooter>
        </AuthCard>
      </AuthLayout>
    );
  }

  // Verifying token
  if (isVerifying) {
    return <AuthLoading message="Verifying reset link..." />;
  }

  // Invalid or expired token
  if (verifyError || !tokenValid) {
    return (
      <AuthLayout>
        <AuthCard>
          <AuthCardHeader
            icon={XCircle}
            iconVariant="error"
            title="Link Expired"
            description="This password reset link has expired or is invalid. Please request a new one."
          />
          <AuthCardFooter>
            <Link href="/forgot-password" className="w-full">
              <Button className="w-full">Request new reset link</Button>
            </Link>
          </AuthCardFooter>
        </AuthCard>
      </AuthLayout>
    );
  }

  // Success state
  if (success) {
    return (
      <AuthLayout>
        <AuthCard>
          <AuthCardHeader
            icon={CheckCircle}
            iconVariant="success"
            title="Password Reset!"
            description="Your password has been reset successfully. Redirecting to login..."
          />
          <AuthCardFooter>
            <Link href="/login" className="w-full">
              <Button className="w-full">Go to login</Button>
            </Link>
          </AuthCardFooter>
        </AuthCard>
      </AuthLayout>
    );
  }

  // Reset password form
  return (
    <AuthLayout>
      <AuthCard>
        <AuthCardHeader
          icon={KeyRound}
          title="Reset your password"
          description="Enter your new password below."
        />

        <form onSubmit={handleSubmit}>
          <AuthCardContent className="space-y-4">
            {error && <AuthAlert variant="error">{error}</AuthAlert>}

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="flex items-center gap-2 text-sidebar-foreground"
              >
                <Lock className="h-4 w-4 text-blue-400" />
                New Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="border-sidebar-border bg-sidebar-accent/50 text-white placeholder:text-sidebar-foreground/50 focus:border-primary focus:ring-primary"
              />
              <p className="text-xs text-sidebar-foreground/50">
                Must be at least 6 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="confirmPassword"
                className="flex items-center gap-2 text-sidebar-foreground"
              >
                <Lock className="h-4 w-4 text-blue-400" />
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="border-sidebar-border bg-sidebar-accent/50 text-white placeholder:text-sidebar-foreground/50 focus:border-primary focus:ring-primary"
              />
            </div>
          </AuthCardContent>

          <AuthCardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Reset password"
              )}
            </Button>
          </AuthCardFooter>
        </form>
      </AuthCard>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
