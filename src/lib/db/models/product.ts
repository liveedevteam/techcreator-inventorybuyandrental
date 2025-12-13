/**
 * Product Model
 * 
 * Mongoose model for products in the system.
 * Supports both buy and rental stock types.
 */

import mongoose, { Schema, Model } from "mongoose";

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Stock type values
 * - buy: Product for purchase (managed via BuyStock)
 * - rental: Product for rental (managed via RentalAsset)
 */
export type StockType = "buy" | "rental";

/**
 * Product interface representing a product in the catalog
 */
export interface IProduct {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  sku: string;
  category?: string;
  price?: number;
  unit?: string;
  images?: string[];
  stockType: StockType;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Mongoose Schema Definition
// ============================================================================

type ProductModel = Model<IProduct>;

/**
 * Product schema with validation rules
 * 
 * Fields:
 * - name: Product name (required, 1-200 chars)
 * - description: Product description (optional, max 2000 chars)
 * - sku: Stock Keeping Unit (required, unique, uppercase, alphanumeric with hyphens/underscores)
 * - category: Product category (optional, max 100 chars)
 * - price: Product price (optional, >= 0)
 * - unit: Unit of measurement (optional, max 20 chars)
 * - images: Array of image URLs (optional, default: [])
 * - stockType: Type of stock management (required: "buy" or "rental")
 * - createdBy: User who created the product (required)
 */
const productSchema = new Schema<IProduct>(
  {
    // ========================================================================
    // Product Information
    // ========================================================================
    
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      minlength: [1, "Product name must be at least 1 character"],
      maxlength: [200, "Product name cannot exceed 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    sku: {
      type: String,
      required: [true, "SKU is required"],
      unique: true,
      trim: true,
      uppercase: true,
      match: [/^[A-Z0-9-_]+$/, "SKU can only contain uppercase letters, numbers, hyphens, and underscores"],
    },
    category: {
      type: String,
      trim: true,
      maxlength: [100, "Category cannot exceed 100 characters"],
    },
    price: {
      type: Number,
      min: [0, "Price cannot be negative"],
    },
    unit: {
      type: String,
      trim: true,
      maxlength: [20, "Unit cannot exceed 20 characters"],
    },
    images: {
      type: [String],
      default: [],
    },

    // ========================================================================
    // Stock Management
    // ========================================================================
    
    stockType: {
      type: String,
      enum: ["buy", "rental"],
      required: [true, "Stock type is required"],
    },

    // ========================================================================
    // Audit Fields
    // ========================================================================
    
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Created by user is required"],
    },
  },
  {
    timestamps: true,
  }
);

// Prevent model recompilation during hot reload
const Product =
  (mongoose.models.Product as ProductModel) ||
  mongoose.model<IProduct>("Product", productSchema);

export default Product;
