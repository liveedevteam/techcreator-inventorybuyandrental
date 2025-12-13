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

/**
 * User Service
 * Handles all user-related business logic
 */

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get all users (admin only)
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
 * Get user by ID
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
 * Create new user (admin only)
 */
export async function createUser(input: CreateUserInput): Promise<UserDTO> {
  await connectToDatabase();

  // Check if email already exists
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
 * Update user (admin only)
 */
export async function updateUser(input: UpdateUserInput): Promise<UserDTO> {
  await connectToDatabase();

  const { id, ...updateData } = input;

  // Check if email already exists (if updating email)
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
 * Update current user's profile
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
 * Delete user (admin only)
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
 * Delete current user's account
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

/**
 * Get total user count
 */
export async function getUserCount(): Promise<number> {
  await connectToDatabase();
  return User.countDocuments();
}

