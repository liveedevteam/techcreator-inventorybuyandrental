/**
 * Auth Service
 * 
 * Handles all authentication-related business logic including:
 * - User session management
 * - Password reset functionality
 * - Password change operations
 */

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { connectToDatabase } from "@/lib/db/connect";
import User from "@/lib/db/models/user";
import PasswordResetToken from "@/lib/db/models/password-reset-token";
import type {
  ForgotPasswordInput,
  VerifyResetTokenInput,
  ResetPasswordInput,
  ChangePasswordInput,
} from "../schemas";

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Current User Data Transfer Object
 * 
 * Represents the currently authenticated user's information.
 */
export interface CurrentUserDTO {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}

// ============================================================================
// User Operations
// ============================================================================

/**
 * Get current authenticated user by ID
 * 
 * @param userId - ID of the current user
 * @returns Current user DTO
 * @throws TRPCError if user not found
 */
export async function getCurrentUser(userId: string): Promise<CurrentUserDTO> {
  await connectToDatabase();

  const user = await User.findById(userId);
  if (!user) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "User not found",
    });
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

// ============================================================================
// Password Reset Operations
// ============================================================================

/**
 * Request password reset
 * 
 * Generates a reset token and stores it with expiration time.
 * Always returns success to prevent email enumeration attacks.
 * 
 * @param input - Email address for password reset
 * @returns Success message and token (token only for development)
 * 
 * @example
 * ```typescript
 * const result = await requestPasswordReset({ email: "user@example.com" });
 * // In production, send token via email instead of returning it
 * ```
 */
export async function requestPasswordReset(input: ForgotPasswordInput) {
  await connectToDatabase();

  const user = await User.findOne({ email: input.email.toLowerCase() });

  // Always return success to prevent email enumeration attacks
  if (!user) {
    return {
      success: true,
      message: "If an account exists with this email, a reset link has been generated.",
    };
  }

  // Remove any existing reset tokens for this user
  await PasswordResetToken.deleteMany({ userId: user._id });

  // Generate secure random token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // Token expires in 1 hour

  await PasswordResetToken.create({
    userId: user._id,
    token,
    expiresAt,
  });

  // In a real application, you would send this via email
  // For now, we'll return it (in production, remove this!)
  console.log(`Password reset token for ${input.email}: ${token}`);

  return {
    success: true,
    message: "If an account exists with this email, a reset link has been generated.",
    // NOTE: In production, remove the token from the response and send via email instead
    token, // Only for development/testing
  };
}

/**
 * Verify that a password reset token is valid and not expired
 * 
 * @param input - Reset token to verify
 * @returns Validation result
 * @throws TRPCError if token is invalid or expired
 */
export async function verifyResetToken(input: VerifyResetTokenInput) {
  await connectToDatabase();

  const resetToken = await PasswordResetToken.findOne({
    token: input.token,
    expiresAt: { $gt: new Date() },
  });

  if (!resetToken) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Invalid or expired reset token",
    });
  }

  return { valid: true };
}

/**
 * Reset password using a valid reset token
 * 
 * Validates the token, hashes the new password, updates user password,
 * and deletes the used token.
 * 
 * @param input - Reset token and new password
 * @returns Success message
 * @throws TRPCError if token is invalid or expired
 */
export async function resetPassword(input: ResetPasswordInput) {
  await connectToDatabase();

  // Find valid, non-expired token
  const resetToken = await PasswordResetToken.findOne({
    token: input.token,
    expiresAt: { $gt: new Date() },
  });

  if (!resetToken) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Invalid or expired reset token",
    });
  }

  // Hash the new password with bcrypt
  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(input.password, salt);

  // Update user's password
  await User.findByIdAndUpdate(resetToken.userId, {
    password: hashedPassword,
  });

  // Delete the used token (one-time use)
  await PasswordResetToken.deleteOne({ _id: resetToken._id });

  return {
    success: true,
    message: "Password has been reset successfully",
  };
}

/**
 * Change password for logged-in user
 * 
 * Verifies current password before allowing password change.
 * 
 * @param userId - ID of the current user
 * @param input - Current password and new password
 * @returns Success message
 * @throws TRPCError if user not found or current password incorrect
 */
export async function changePassword(userId: string, input: ChangePasswordInput) {
  await connectToDatabase();

  // Get user with password field (normally excluded)
  const user = await User.findById(userId).select("+password");
  if (!user) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "User not found",
    });
  }

  // Verify current password is correct
  const isValid = await user.comparePassword(input.currentPassword);
  if (!isValid) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Current password is incorrect",
    });
  }

  // Hash and save new password
  const salt = await bcrypt.genSalt(12);
  user.password = await bcrypt.hash(input.newPassword, salt);
  await user.save({ validateBeforeSave: false });

  return {
    success: true,
    message: "Password changed successfully",
  };
}

