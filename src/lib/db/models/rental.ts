/**
 * Rental Model
 * 
 * Mongoose model for rental/lease agreements.
 * Tracks customer information, rental period, assets, pricing, and penalties.
 */

import mongoose, { Schema, Model } from "mongoose";

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Rental status values
 * - pending: Rental created but not yet active
 * - active: Rental is currently in use
 * - completed: Rental has been completed and assets returned
 * - cancelled: Rental was cancelled
 */
export type RentalStatus = "pending" | "active" | "completed" | "cancelled";

/**
 * Rental interface representing a rental agreement
 */
export interface IRental {
  _id: mongoose.Types.ObjectId;
  rentalNumber: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  assets: mongoose.Types.ObjectId[];
  startDate: Date;
  endDate: Date;
  expectedReturnDate?: Date;
  actualReturnDate?: Date;
  dailyRate: number;
  totalAmount: number;
  deposit: number;
  penaltyRate?: number;
  penaltyAmount: number;
  status: RentalStatus;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Mongoose Schema Definition
// ============================================================================

type RentalModel = Model<IRental>;

/**
 * Rental schema with validation rules
 * 
 * Fields:
 * - rentalNumber: Unique identifier (format: RENT-YYYYMMDD-NNNN)
 * - customerName: Customer's name (required, 1-200 chars)
 * - customerPhone: Customer's phone number (optional, max 20 chars)
 * - customerEmail: Customer's email (optional, validated format)
 * - customerAddress: Customer's address (optional, max 500 chars)
 * - assets: Array of rental asset IDs (required, at least 1)
 * - startDate: Rental start date (required)
 * - endDate: Rental end date (required)
 * - expectedReturnDate: Expected return date (optional)
 * - actualReturnDate: Actual return date (optional, set when completed)
 * - dailyRate: Daily rental rate (required, >= 0)
 * - totalAmount: Total rental amount (required, >= 0)
 * - deposit: Deposit amount (required, >= 0, default: 0)
 * - penaltyRate: Penalty multiplier for overdue days (optional, default: 1.5)
 * - penaltyAmount: Calculated penalty amount (default: 0)
 * - status: Rental status (required, default: "pending")
 * - notes: Additional notes (optional, max 1000 chars)
 * - createdBy: User who created the rental (required)
 */
const rentalSchema = new Schema<IRental>(
  {
    // ========================================================================
    // Rental Identification
    // ========================================================================
    
    rentalNumber: {
      type: String,
      required: [true, "Rental number is required"],
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
    // Rental Assets
    // ========================================================================
    
    assets: {
      type: [Schema.Types.ObjectId],
      ref: "RentalAsset",
      required: [true, "At least one asset is required"],
      validate: {
        validator: (v: mongoose.Types.ObjectId[]) => v.length > 0,
        message: "At least one asset is required",
      },
    },

    // ========================================================================
    // Rental Period
    // ========================================================================
    
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },
    expectedReturnDate: {
      type: Date,
    },
    actualReturnDate: {
      type: Date,
    },

    // ========================================================================
    // Pricing and Financials
    // ========================================================================
    
    dailyRate: {
      type: Number,
      required: [true, "Daily rate is required"],
      min: [0, "Daily rate cannot be negative"],
    },
    totalAmount: {
      type: Number,
      required: [true, "Total amount is required"],
      min: [0, "Total amount cannot be negative"],
    },
    deposit: {
      type: Number,
      required: [true, "Deposit is required"],
      min: [0, "Deposit cannot be negative"],
      default: 0,
    },
    penaltyRate: {
      type: Number,
      min: [0, "Penalty rate cannot be negative"],
      default: 1.5, // Default to 1.5x daily rate for overdue days
    },
    penaltyAmount: {
      type: Number,
      min: [0, "Penalty amount cannot be negative"],
      default: 0,
    },

    // ========================================================================
    // Status and Metadata
    // ========================================================================
    
    status: {
      type: String,
      enum: ["pending", "active", "completed", "cancelled"],
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

// Prevent model recompilation during hot reload
const Rental =
  (mongoose.models.Rental as RentalModel) ||
  mongoose.model<IRental>("Rental", rentalSchema);

export default Rental;
