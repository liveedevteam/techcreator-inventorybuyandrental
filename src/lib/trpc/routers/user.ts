import { createTRPCRouter, protectedProcedure, adminProcedure } from "../trpc";
import {
  getUserByIdSchema,
  createUserSchema,
  updateUserSchema,
  updateProfileSchema,
  deleteUserSchema,
} from "../schemas";
import * as userService from "../services/user.service";

export const userRouter = createTRPCRouter({
  /**
   * Get all users (admin only)
   */
  list: adminProcedure.query(() => userService.listUsers()),

  /**
   * Get user by ID (admin only)
   */
  getById: adminProcedure
    .input(getUserByIdSchema)
    .query(({ input }) => userService.getUserById(input)),

  /**
   * Create new user (admin only)
   */
  create: adminProcedure
    .input(createUserSchema)
    .mutation(({ input }) => userService.createUser(input)),

  /**
   * Update user (admin only)
   */
  update: adminProcedure
    .input(updateUserSchema)
    .mutation(({ input }) => userService.updateUser(input)),

  /**
   * Delete user (admin only)
   */
  delete: adminProcedure
    .input(deleteUserSchema)
    .mutation(({ input }) => userService.deleteUser(input)),

  /**
   * Update current user's profile
   */
  updateProfile: protectedProcedure
    .input(updateProfileSchema)
    .mutation(({ ctx, input }) =>
      userService.updateProfile(ctx.session.user.id, input)
    ),

  /**
   * Delete current user's account
   */
  deleteAccount: protectedProcedure.mutation(({ ctx }) =>
    userService.deleteAccount(ctx.session.user.id)
  ),

  /**
   * Get total user count (admin only)
   */
  count: adminProcedure.query(() => userService.getUserCount()),
});

