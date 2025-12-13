import { z } from "zod";

/**
 * User Validation Schemas
 */

export const userRoleSchema = z.enum(["admin", "user"]);

export const getUserByIdSchema = z.object({
  id: z.string().min(1, "User ID is required"),
});

export const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name cannot exceed 50 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: userRoleSchema.default("user"),
});

export const updateUserSchema = z.object({
  id: z.string().min(1, "User ID is required"),
  name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name cannot exceed 50 characters").optional(),
  email: z.string().email("Please enter a valid email").optional(),
  role: userRoleSchema.optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name cannot exceed 50 characters").optional(),
});

export const deleteUserSchema = z.object({
  id: z.string().min(1, "User ID is required"),
});

// Type exports
export type UserRole = z.infer<typeof userRoleSchema>;
export type GetUserByIdInput = z.infer<typeof getUserByIdSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type DeleteUserInput = z.infer<typeof deleteUserSchema>;

