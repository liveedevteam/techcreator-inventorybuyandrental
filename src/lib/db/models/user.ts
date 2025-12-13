/**
 * User Model
 * 
 * Mongoose model for user accounts.
 * Handles authentication, password hashing, and role-based access control.
 */

import mongoose, { Schema, Model, Document } from "mongoose";
import bcrypt from "bcryptjs";

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * User role values
 * - user: Regular user (default)
 * - admin: Administrator with elevated permissions
 * - super_admin: Super administrator with full system access
 */
export type UserRole = "admin" | "super_admin" | "user";

/**
 * User interface representing a user account
 */
export interface IUser {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// ============================================================================
// Mongoose Schema Definition
// ============================================================================

type UserModel = Model<IUser, object, IUserMethods>;

/**
 * User schema with validation rules and password hashing
 * 
 * Fields:
 * - name: User's full name (required, 2-50 chars)
 * - email: User's email address (required, unique, validated format)
 * - password: Hashed password (required, min 6 chars, excluded from queries by default)
 * - role: User role for access control (default: "user")
 * 
 * Methods:
 * - comparePassword: Compares candidate password with stored hash
 */
const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    password: {
      // Password is excluded from queries by default for security
      // Use .select("+password") to include it when needed
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    role: {
      type: String,
      enum: ["admin", "super_admin", "user"],
      default: "user",
    },
  },
  {
    timestamps: true,
  }
);

// ============================================================================
// Middleware: Password Hashing
// ============================================================================

/**
 * Pre-save hook: Hash password before saving to database
 * 
 * Only hashes if password has been modified to avoid re-hashing on every save.
 * Uses bcrypt with salt rounds of 12.
 */
userSchema.pre("save", async function (this: IUser & Document) {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// ============================================================================
// Instance Methods
// ============================================================================

/**
 * Compare candidate password with stored hash
 * 
 * @param candidatePassword - Plain text password to verify
 * @returns True if password matches, false otherwise
 */
userSchema.methods.comparePassword = async function (
  this: IUser & Document,
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Prevent model recompilation during hot reload
const User =
  (mongoose.models.User as UserModel) ||
  mongoose.model<IUser, UserModel>("User", userSchema);

export default User;
