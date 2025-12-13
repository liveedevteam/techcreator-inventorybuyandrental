"use client";

import { useState } from "react";
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
} from "@/components";
import { trpc } from "@/lib/trpc/client";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);

  const forgotPasswordMutation = trpc.auth.forgotPassword.useMutation({
    onSuccess: (data) => {
      setSuccess(true);
      // In development, show the token for testing
      if (data.token) {
        setResetToken(data.token);
      }
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    forgotPasswordMutation.mutate({ email });
  };

  if (success) {
    return (
      <AuthLayout>
        <AuthCard>
          <AuthCardHeader
            icon={CheckCircle}
            iconVariant="success"
            title="Check your email"
            description={
              <>
                If an account exists with{" "}
                <span className="text-white font-medium">{email}</span>, you will
                receive a password reset link.
              </>
            }
          />

          <AuthCardContent className="space-y-4">
            {/* Development only - show reset link */}
            {resetToken && (
              <div className="rounded-lg border border-warning/30 bg-warning/10 p-4">
                <p className="mb-2 text-sm font-medium text-warning">
                  Development Mode - Reset Link:
                </p>
                <Link
                  href={`/reset-password?token=${resetToken}`}
                  className="block break-all text-sm text-blue-400 underline transition-colors hover:text-blue-300"
                >
                  /reset-password?token={resetToken}
                </Link>
              </div>
            )}
          </AuthCardContent>

          <AuthCardFooter>
            <Link href="/login" className="w-full">
              <Button
                variant="outline"
                className="w-full border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to sign in
              </Button>
            </Link>
          </AuthCardFooter>
        </AuthCard>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <AuthCard>
        <AuthCardHeader
          icon={Mail}
          title="Forgot password?"
          description="Enter your email address and we'll send you a link to reset your password."
        />

        <form onSubmit={handleSubmit}>
          <AuthCardContent className="space-y-4">
            {error && <AuthAlert variant="error">{error}</AuthAlert>}

            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="flex items-center gap-2 text-sidebar-foreground"
              >
                <Mail className="h-4 w-4 text-blue-400" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-sidebar-border bg-sidebar-accent/50 text-white placeholder:text-sidebar-foreground/50 focus:border-primary focus:ring-primary"
              />
            </div>
          </AuthCardContent>

          <AuthCardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={forgotPasswordMutation.isPending}
            >
              {forgotPasswordMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send reset link"
              )}
            </Button>

            <Link
              href="/login"
              className="flex items-center justify-center text-sm text-sidebar-foreground/70 transition-colors hover:text-sidebar-foreground"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to sign in
            </Link>
          </AuthCardFooter>
        </form>
      </AuthCard>
    </AuthLayout>
  );
}
