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

/**
 * Auth Service
 * Handles all authentication-related business logic
 */

export interface CurrentUserDTO {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}

/**
 * Get current user by ID
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

/**
 * Request password reset
 */
export async function requestPasswordReset(input: ForgotPasswordInput) {
  await connectToDatabase();

  const user = await User.findOne({ email: input.email.toLowerCase() });

  // Always return success to prevent email enumeration
  if (!user) {
    return {
      success: true,
      message: "If an account exists with this email, a reset link has been generated.",
    };
  }

  // Delete any existing tokens for this user
  await PasswordResetToken.deleteMany({ userId: user._id });

  // Generate new token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

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
 * Verify reset token is valid
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
 * Reset password using token
 */
export async function resetPassword(input: ResetPasswordInput) {
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

  // Hash the new password
  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(input.password, salt);

  // Update the user's password
  await User.findByIdAndUpdate(resetToken.userId, {
    password: hashedPassword,
  });

  // Delete the used token
  await PasswordResetToken.deleteOne({ _id: resetToken._id });

  return {
    success: true,
    message: "Password has been reset successfully",
  };
}

/**
 * Change password for logged-in user
 */
export async function changePassword(userId: string, input: ChangePasswordInput) {
  await connectToDatabase();

  const user = await User.findById(userId).select("+password");
  if (!user) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "User not found",
    });
  }

  // Verify current password
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

