/**
 * Auth Router
 * 
 * tRPC router for authentication endpoints.
 * Handles session management, password reset, and password changes.
 */

import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";
import {
  forgotPasswordSchema,
  verifyResetTokenSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "../schemas";
import * as authService from "../services/auth.service";

export const authRouter = createTRPCRouter({
  // ============================================================================
  // Public Endpoints
  // ============================================================================
  
  /**
   * Get current session
   * 
   * Available to all users (public). Returns current session or null if not authenticated.
   */
  getSession: publicProcedure.query(({ ctx }) => ctx.session),

  /**
   * Request password reset
   * 
   * Available to all users (public). Generates a reset token.
   * Always returns success to prevent email enumeration attacks.
   */
  forgotPassword: publicProcedure
    .input(forgotPasswordSchema)
    .mutation(({ input }) => authService.requestPasswordReset(input)),

  /**
   * Verify reset token is valid
   * 
   * Available to all users (public). Checks if token exists and hasn't expired.
   */
  verifyResetToken: publicProcedure
    .input(verifyResetTokenSchema)
    .query(({ input }) => authService.verifyResetToken(input)),

  /**
   * Reset password using token
   * 
   * Available to all users (public). Validates token and updates password.
   */
  resetPassword: publicProcedure
    .input(resetPasswordSchema)
    .mutation(({ input }) => authService.resetPassword(input)),

  // ============================================================================
  // Protected Endpoints
  // ============================================================================
  
  /**
   * Get current authenticated user
   * 
   * Available to all authenticated users. Returns current user's information.
   */
  me: protectedProcedure.query(({ ctx }) => authService.getCurrentUser(ctx.session.user.id)),

  /**
   * Change password for logged-in user
   * 
   * Available to all authenticated users. Verifies current password before allowing change.
   */
  changePassword: protectedProcedure
    .input(changePasswordSchema)
    .mutation(({ ctx, input }) => authService.changePassword(ctx.session.user.id, input)),
});
