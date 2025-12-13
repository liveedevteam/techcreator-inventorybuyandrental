/**
 * User Service
 * 
 * Handles all user-related business logic including:
 * - User CRUD operations
 * - Profile management
 * - User authentication data
 */

import { TRPCError } from "@trpc/server";
import { connectToDatabase } from "@/lib/db/connect";
import User from "@/lib/db/models/user";
import type {
  GetUserByIdInput,
  CreateUserInput,
  UpdateUserInput,
  UpdateProfileInput,
  DeleteUserInput,
} from "../schemas";
import type { UserRole } from "@/lib/db/models/user";

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * User Data Transfer Object
 * 
 * Represents a user without sensitive password information.
 */
export interface UserDTO {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Get all users (admin only)
 * 
 * Returns list of all users sorted by creation date (newest first).
 * Password field is excluded from results.
 * 
 * @returns Array of user DTOs
 */
export async function listUsers(): Promise<UserDTO[]> {
  await connectToDatabase();

  const users = await User.find().select("-password").sort({ createdAt: -1 });

  return users.map((user) => ({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }));
}

/**
 * Get a single user by ID
 * 
 * @param input - User ID
 * @returns User DTO
 * @throws TRPCError if user not found
 */
export async function getUserById(input: GetUserByIdInput): Promise<UserDTO> {
  await connectToDatabase();

  const user = await User.findById(input.id).select("-password");
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
    updatedAt: user.updatedAt,
  };
}

/**
 * Create a new user (admin only)
 * 
 * Validates email uniqueness before creating user.
 * Password is automatically hashed by the User model.
 * 
 * @param input - User creation data (name, email, password, role)
 * @returns Created user DTO
 * @throws TRPCError if email already exists
 */
export async function createUser(input: CreateUserInput): Promise<UserDTO> {
  await connectToDatabase();

  // Validate email uniqueness
  const existingUser = await User.findOne({ email: input.email });
  if (existingUser) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "A user with this email already exists",
    });
  }

  const user = await User.create({
    name: input.name,
    email: input.email,
    password: input.password,
    role: input.role,
  });

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * Update an existing user (admin only)
 * 
 * Validates email uniqueness if email is being updated.
 * Only provided fields are updated.
 * 
 * @param input - User update data (id and optional fields to update)
 * @returns Updated user DTO
 * @throws TRPCError if user not found or email conflict
 */
export async function updateUser(input: UpdateUserInput): Promise<UserDTO> {
  await connectToDatabase();

  const { id, ...updateData } = input;

  // Validate email uniqueness if email is being updated
  if (updateData.email) {
    const existingUser = await User.findOne({ email: updateData.email, _id: { $ne: id } });
    if (existingUser) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "A user with this email already exists",
      });
    }
  }

  const user = await User.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true }
  ).select("-password");

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
    updatedAt: user.updatedAt,
  };
}

/**
 * Update current user's own profile
 * 
 * Allows users to update their own profile information.
 * Does not include timestamps in response.
 * 
 * @param userId - ID of the current user
 * @param input - Profile update data
 * @returns Updated user DTO (without timestamps)
 * @throws TRPCError if user not found
 */
export async function updateProfile(
  userId: string,
  input: UpdateProfileInput
): Promise<Omit<UserDTO, "createdAt" | "updatedAt">> {
  await connectToDatabase();

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: input },
    { new: true }
  ).select("-password");

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
  };
}

/**
 * Delete a user (admin only)
 * 
 * Permanently removes a user from the system.
 * 
 * @param input - User ID to delete
 * @returns Success status
 * @throws TRPCError if user not found
 */
export async function deleteUser(input: DeleteUserInput): Promise<{ success: boolean }> {
  await connectToDatabase();

  const result = await User.findByIdAndDelete(input.id);
  if (!result) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "User not found",
    });
  }

  return { success: true };
}

/**
 * Delete current user's own account
 * 
 * Allows users to delete their own account.
 * 
 * @param userId - ID of the current user
 * @returns Success status
 * @throws TRPCError if user not found
 */
export async function deleteAccount(userId: string): Promise<{ success: boolean }> {
  await connectToDatabase();

  const result = await User.findByIdAndDelete(userId);
  if (!result) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "User not found",
    });
  }

  return { success: true };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get total number of users in the system
 * 
 * @returns Total user count
 */
export async function getUserCount(): Promise<number> {
  await connectToDatabase();
  return User.countDocuments();
}

