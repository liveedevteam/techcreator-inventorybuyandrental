import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";
import {
  forgotPasswordSchema,
  verifyResetTokenSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "../schemas";
import * as authService from "../services/auth.service";

export const authRouter = createTRPCRouter({
  /**
   * Get current session
   */
  getSession: publicProcedure.query(({ ctx }) => ctx.session),

  /**
   * Get current user (protected)
   */
  me: protectedProcedure.query(({ ctx }) => authService.getCurrentUser(ctx.session.user.id)),

  /**
   * Request password reset - generates a reset token
   */
  forgotPassword: publicProcedure
    .input(forgotPasswordSchema)
    .mutation(({ input }) => authService.requestPasswordReset(input)),

  /**
   * Verify reset token is valid
   */
  verifyResetToken: publicProcedure
    .input(verifyResetTokenSchema)
    .query(({ input }) => authService.verifyResetToken(input)),

  /**
   * Reset password using token
   */
  resetPassword: publicProcedure
    .input(resetPasswordSchema)
    .mutation(({ input }) => authService.resetPassword(input)),

  /**
   * Change password (for logged-in users)
   */
  changePassword: protectedProcedure
    .input(changePasswordSchema)
    .mutation(({ ctx, input }) => authService.changePassword(ctx.session.user.id, input)),
});
