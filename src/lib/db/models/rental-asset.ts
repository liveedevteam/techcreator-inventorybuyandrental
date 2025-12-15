import mongoose, { Schema, Model } from "mongoose";

export type RentalAssetStatus = "available" | "rented" | "maintenance" | "reserved" | "damaged";

export interface IRentalAsset {
  _id: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  assetCode: string;
  status: RentalAssetStatus;
  currentRentalId?: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

type RentalAssetModel = Model<IRentalAsset>;

const rentalAssetSchema = new Schema<IRentalAsset>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product ID is required"],
    },
    assetCode: {
      type: String,
      required: [true, "Asset code is required"],
      trim: true,
      uppercase: true,
      match: [
        /^[A-Z0-9-_]+$/,
        "Asset code can only contain uppercase letters, numbers, hyphens, and underscores",
      ],
    },
    status: {
      type: String,
      enum: ["available", "rented", "maintenance", "reserved", "damaged"],
      required: [true, "Status is required"],
      default: "available",
    },
    currentRentalId: {
      type: Schema.Types.ObjectId,
      ref: "Rental",
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
    },
  },
  {
    timestamps: true,
  }
);

// Prevent model recompilation during hot reload
const RentalAsset =
  (mongoose.models.RentalAsset as RentalAssetModel) ||
  mongoose.model<IRentalAsset>("RentalAsset", rentalAssetSchema);

export default RentalAsset;
