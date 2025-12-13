/**
 * User Router
 * 
 * tRPC router for user management endpoints.
 * Handles user CRUD operations, profile management, and role updates.
 */

import { createTRPCRouter, protectedProcedure, adminProcedure, superAdminProcedure } from "../trpc";
import {
  getUserByIdSchema,
  createUserSchema,
  updateUserSchema,
  updateProfileSchema,
  deleteUserSchema,
} from "../schemas";
import * as userService from "../services/user.service";

export const userRouter = createTRPCRouter({
  // ============================================================================
  // Super Admin-Only Operations
  // ============================================================================
  
  /**
   * Get all users
   * 
   * Requires super admin role. Returns list of all users in the system.
   */
  list: superAdminProcedure.query(() => userService.listUsers()),

  /**
   * Update user role
   * 
   * Requires super admin role. Allows changing user roles including super admin.
   */
  updateRole: superAdminProcedure
    .input(updateUserSchema)
    .mutation(({ input }) => userService.updateUser(input)),

  // ============================================================================
  // Admin-Only Operations
  // ============================================================================
  
  /**
   * Get user by ID
   * 
   * Requires admin role.
   */
  getById: adminProcedure
    .input(getUserByIdSchema)
    .query(({ input }) => userService.getUserById(input)),

  /**
   * Create a new user
   * 
   * Requires admin role. Validates email uniqueness.
   */
  create: adminProcedure
    .input(createUserSchema)
    .mutation(({ input }) => userService.createUser(input)),

  /**
   * Update an existing user
   * 
   * Requires admin role. Validates email uniqueness if email is being updated.
   */
  update: adminProcedure
    .input(updateUserSchema)
    .mutation(({ input }) => userService.updateUser(input)),

  /**
   * Delete a user
   * 
   * Requires admin role. Permanently removes user from the system.
   */
  delete: adminProcedure
    .input(deleteUserSchema)
    .mutation(({ input }) => userService.deleteUser(input)),

  /**
   * Get total user count
   * 
   * Requires admin role. Returns total number of users.
   */
  count: adminProcedure.query(() => userService.getUserCount()),

  // ============================================================================
  // User Self-Service Operations
  // ============================================================================
  
  /**
   * Update current user's own profile
   * 
   * Available to all authenticated users. Users can update their own profile.
   */
  updateProfile: protectedProcedure
    .input(updateProfileSchema)
    .mutation(({ ctx, input }) =>
      userService.updateProfile(ctx.session.user.id, input)
    ),

  /**
   * Delete current user's own account
   * 
   * Available to all authenticated users. Users can delete their own account.
   */
  deleteAccount: protectedProcedure.mutation(({ ctx }) =>
    userService.deleteAccount(ctx.session.user.id)
  ),
});

