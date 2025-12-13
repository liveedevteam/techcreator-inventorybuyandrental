"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  AuthAlert,
  BrandSection,
  MobileHeader,
} from "@/components";
import { StatusIndicator } from "@/components/common/status-indicator";
import {
  Calendar,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  Loader2,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Main Content */}
      <div className="flex flex-1">
        {/* Left Panel - Brand Section (Hidden on mobile) */}
        <BrandSection className="hidden lg:flex lg:w-1/2 xl:w-[45%] flex-col justify-between bg-gradient-to-br from-sidebar via-[#1a3a5c] to-[#2d5a7b] p-8 xl:p-12" />

        {/* Right Panel - Login Form */}
        <div className="flex flex-1 flex-col bg-background lg:w-1/2 xl:w-[55%]">
          {/* Mobile Header */}
          <MobileHeader className="flex items-center justify-center gap-3 bg-sidebar p-4 lg:hidden" />

          {/* Form Container */}
          <div className="flex flex-1 items-center justify-center p-6 lg:p-8 xl:p-12">
            <div className="w-full max-w-md space-y-6">
              {/* Header */}
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground lg:text-3xl">
                  Sign In
                </h1>
                <p className="text-muted-foreground">
                  Enter your credentials to access your account
                </p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && <AuthAlert variant="error">{error}</AuthAlert>}

                {/* Email Field */}
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="flex items-center gap-2 text-sm font-medium text-primary"
                  >
                    <Mail className="h-4 w-4" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@loopsevent.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="flex items-center gap-2 text-sm font-medium text-primary"
                  >
                    <Lock className="h-4 w-4" />
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-muted-foreground">
                      Remember me
                    </span>
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
                  >
                    Forgot Password?
                  </Link>
                </div>

                {/* Sign In Button */}
                <Button
                  type="submit"
                  className="h-11 w-full gap-2"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      OR
                    </span>
                  </div>
                </div>

                {/* Social Login Buttons */}
                

                {/* Contact Admin */}
                <p className="text-center text-sm text-muted-foreground">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="mailto:admin@loopsevent.com"
                    className="font-medium text-primary transition-colors hover:text-primary/80"
                  >
                    Contact Administrator
                  </Link>
                </p>
              </form>

              {/* Secure Login Info */}
              <Card className="border-border bg-muted/30">
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Shield className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-foreground">
                      Secure Login
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Your connection is encrypted and secure. We never store
                      your password in plain text.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="flex flex-col items-center justify-between gap-4 border-t border-border bg-background px-6 py-4 text-sm text-muted-foreground sm:flex-row">
        <div>© {new Date().getFullYear()} Loops Event Manager. All rights reserved.</div>
        <nav className="flex items-center gap-4">
          <Link href="/privacy" className="transition-colors hover:text-foreground">
            Privacy Policy
          </Link>
          <span className="text-border">•</span>
          <Link href="/terms" className="transition-colors hover:text-foreground">
            Terms of Service
          </Link>
          <span className="text-border">•</span>
          <Link href="/support" className="transition-colors hover:text-foreground">
            Support
          </Link>
        </nav>
        <StatusIndicator status="online" label="System Online" />
      </footer>
    </div>
  );
}
