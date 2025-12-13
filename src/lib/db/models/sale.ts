/**
 * Sale Model
 * 
 * Mongoose model for sales transactions.
 * Tracks customer information, sold items, pricing, and generates bills.
 */

import mongoose, { Schema, Model } from "mongoose";

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Sale status values
 * - pending: Sale created but not yet completed
 * - completed: Sale has been completed and stock deducted
 * - cancelled: Sale was cancelled
 */
export type SaleStatus = "pending" | "completed" | "cancelled";

/**
 * Sale item interface for individual products in a sale
 */
export interface ISaleItem {
  productId: mongoose.Types.ObjectId;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

/**
 * Sale interface representing a sales transaction
 */
export interface ISale {
  _id: mongoose.Types.ObjectId;
  billNumber: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  items: ISaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  paymentMethod?: string;
  paymentStatus: "pending" | "paid" | "partial";
  paidAmount: number;
  status: SaleStatus;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Mongoose Schema Definition
// ============================================================================

type SaleModel = Model<ISale>;

/**
 * Sale item schema (embedded document)
 */
const saleItemSchema = new Schema<ISaleItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product ID is required"],
    },
    productName: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    sku: {
      type: String,
      required: [true, "SKU is required"],
      trim: true,
      uppercase: true,
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
    },
    unitPrice: {
      type: Number,
      required: [true, "Unit price is required"],
      min: [0, "Unit price cannot be negative"],
    },
    totalPrice: {
      type: Number,
      required: [true, "Total price is required"],
      min: [0, "Total price cannot be negative"],
    },
  },
  { _id: false }
);

/**
 * Sale schema with validation rules
 * 
 * Fields:
 * - billNumber: Unique bill identifier (format: BILL-YYYYMMDD-NNNN)
 * - customerName: Customer's name (required, 1-200 chars)
 * - customerPhone: Customer's phone number (optional, max 20 chars)
 * - customerEmail: Customer's email (optional, validated format)
 * - customerAddress: Customer's address (optional, max 500 chars)
 * - items: Array of sale items (required, at least 1)
 * - subtotal: Subtotal before discount/tax (required, >= 0)
 * - discount: Discount amount (required, >= 0, default: 0)
 * - tax: Tax amount (required, >= 0, default: 0)
 * - totalAmount: Total amount after discount and tax (required, >= 0)
 * - paymentMethod: Payment method (optional)
 * - paymentStatus: Payment status (required, default: "pending")
 * - paidAmount: Amount paid (required, >= 0, default: 0)
 * - status: Sale status (required, default: "pending")
 * - notes: Additional notes (optional, max 1000 chars)
 * - createdBy: User who created the sale (required)
 */
const saleSchema = new Schema<ISale>(
  {
    // ========================================================================
    // Sale Identification
    // ========================================================================
    
    billNumber: {
      type: String,
      required: [true, "Bill number is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },

    // ========================================================================
    // Customer Information
    // ========================================================================
    
    customerName: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
      minlength: [1, "Customer name must be at least 1 character"],
      maxlength: [200, "Customer name cannot exceed 200 characters"],
    },
    customerPhone: {
      type: String,
      trim: true,
      maxlength: [20, "Phone number cannot exceed 20 characters"],
    },
    customerEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    customerAddress: {
      type: String,
      trim: true,
      maxlength: [500, "Address cannot exceed 500 characters"],
    },

    // ========================================================================
    // Sale Items
    // ========================================================================
    
    items: {
      type: [saleItemSchema],
      required: [true, "At least one item is required"],
      validate: {
        validator: (v: ISaleItem[]) => v.length > 0,
        message: "At least one item is required",
      },
    },

    // ========================================================================
    // Pricing and Financials
    // ========================================================================
    
    subtotal: {
      type: Number,
      required: [true, "Subtotal is required"],
      min: [0, "Subtotal cannot be negative"],
    },
    discount: {
      type: Number,
      required: [true, "Discount is required"],
      min: [0, "Discount cannot be negative"],
      default: 0,
    },
    tax: {
      type: Number,
      required: [true, "Tax is required"],
      min: [0, "Tax cannot be negative"],
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: [true, "Total amount is required"],
      min: [0, "Total amount cannot be negative"],
    },
    paymentMethod: {
      type: String,
      trim: true,
      enum: ["cash", "card", "transfer", "other"],
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "partial"],
      required: [true, "Payment status is required"],
      default: "pending",
    },
    paidAmount: {
      type: Number,
      required: [true, "Paid amount is required"],
      min: [0, "Paid amount cannot be negative"],
      default: 0,
    },

    // ========================================================================
    // Status and Metadata
    // ========================================================================
    
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      required: [true, "Status is required"],
      default: "pending",
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
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

// ========================================================================
// Indexes
// ========================================================================

// Note: billNumber already has unique: true in schema definition
saleSchema.index({ createdAt: -1 });
saleSchema.index({ customerName: 1 });
saleSchema.index({ status: 1 });
saleSchema.index({ paymentStatus: 1 });

// Prevent model recompilation during hot reload
const Sale =
  (mongoose.models.Sale as SaleModel) ||
  mongoose.model<ISale>("Sale", saleSchema);

export default Sale;
