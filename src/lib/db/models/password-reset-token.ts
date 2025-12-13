import mongoose, { Schema, Model } from "mongoose";
import crypto from "crypto";

export interface IPasswordResetToken {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

const passwordResetTokenSchema = new Schema<IPasswordResetToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    },
  },
  {
    timestamps: true,
  }
);

// Index for auto-expiration (TTL index)
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to generate a secure token
passwordResetTokenSchema.statics.generateToken = function (): string {
  return crypto.randomBytes(32).toString("hex");
};

interface PasswordResetTokenModel extends Model<IPasswordResetToken> {
  generateToken(): string;
}

const PasswordResetToken =
  (mongoose.models.PasswordResetToken as PasswordResetTokenModel) ||
  mongoose.model<IPasswordResetToken, PasswordResetTokenModel>(
    "PasswordResetToken",
    passwordResetTokenSchema
  );

export default PasswordResetToken;

