import mongoose, { Schema, Model } from "mongoose";

export interface IBuyStock {
  _id: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  quantity: number;
  minQuantity: number;
  lastUpdatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

type BuyStockModel = Model<IBuyStock>;

const buyStockSchema = new Schema<IBuyStock>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product ID is required"],
      unique: true,
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [0, "Quantity cannot be negative"],
      default: 0,
    },
    minQuantity: {
      type: Number,
      required: [true, "Minimum quantity is required"],
      min: [0, "Minimum quantity cannot be negative"],
      default: 0,
    },
    lastUpdatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Last updated by user is required"],
    },
  },
  {
    timestamps: true,
  }
);

// Prevent model recompilation during hot reload
const BuyStock =
  (mongoose.models.BuyStock as BuyStockModel) ||
  mongoose.model<IBuyStock>("BuyStock", buyStockSchema);

export default BuyStock;
