import mongoose, { Schema, Model } from "mongoose";

export type ActivityAction = "create" | "update" | "delete";
export type ActivityEntityType = "product" | "buyStock" | "rentalAsset" | "rental" | "sale" | "user";

export interface IActivityLog {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId: string;
  entityName: string;
  changes?: {
    old?: Record<string, unknown>;
    new?: Record<string, unknown>;
  };
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

type ActivityLogModel = Model<IActivityLog>;

const activityLogSchema = new Schema<IActivityLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    action: {
      type: String,
      enum: ["create", "update", "delete"],
      required: [true, "Action is required"],
    },
    entityType: {
      type: String,
      enum: ["product", "buyStock", "rentalAsset", "rental", "sale", "user"],
      required: [true, "Entity type is required"],
    },
    entityId: {
      type: String,
      required: [true, "Entity ID is required"],
    },
    entityName: {
      type: String,
      required: [true, "Entity name is required"],
      trim: true,
      maxlength: [200, "Entity name cannot exceed 200 characters"],
    },
    changes: {
      type: Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Prevent model recompilation during hot reload
const ActivityLog =
  (mongoose.models.ActivityLog as ActivityLogModel) ||
  mongoose.model<IActivityLog>("ActivityLog", activityLogSchema);

export default ActivityLog;
