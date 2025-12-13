/**
 * Rental Service
 * 
 * Handles all rental-related business logic including:
 * - Creating and updating rentals
 * - Managing rental status transitions
 * - Calculating penalties for overdue rentals
 * - Managing rental assets
 */

import { TRPCError } from "@trpc/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import Rental from "@/lib/db/models/rental";
import RentalAsset from "@/lib/db/models/rental-asset";
import type {
  CreateRentalInput,
  UpdateRentalInput,
  UpdateRentalStatusInput,
  GetRentalByIdInput,
  ListRentalsInput,
  CancelRentalInput,
} from "../schemas";
import * as activityLogService from "./activity-log.service";

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Rental Data Transfer Object
 * 
 * Represents a rental with all its associated data including customer info,
 * assets, dates, pricing, and status.
 */
export interface RentalDTO {
  id: string;
  rentalNumber: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  assets: Array<{
    id: string;
    assetCode: string;
    productName?: string;
  }>;
  startDate: Date;
  endDate: Date;
  expectedReturnDate?: Date;
  actualReturnDate?: Date;
  dailyRate: number;
  totalAmount: number;
  deposit: number;
  penaltyRate?: number;
  penaltyAmount: number;
  status: "pending" | "active" | "completed" | "cancelled";
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate unique rental number
 * 
 * Format: RENT-YYYYMMDD-NNNN
 * Example: RENT-20251214-0001
 * 
 * @returns Unique rental number string
 */
async function generateRentalNumber(): Promise<string> {
  await connectToDatabase();

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const date = String(today.getDate()).padStart(2, "0");

  // Find the last rental number for today
  const lastRental = await Rental.findOne({
    rentalNumber: new RegExp(`^RENT-${year}${month}${date}`),
  })
    .sort({ rentalNumber: -1 })
    .lean();

  let sequence = 1;
  if (lastRental) {
    const lastSequence = parseInt(lastRental.rentalNumber.slice(-4), 10);
    sequence = lastSequence + 1;
  }

  return `RENT-${year}${month}${date}-${String(sequence).padStart(4, "0")}`;
}

/**
 * Calculate total rental amount based on rental period and daily rate
 * 
 * @param startDate - Rental start date
 * @param endDate - Rental end date
 * @param dailyRate - Daily rental rate
 * @returns Total amount (days × daily rate)
 */
function calculateTotalAmount(startDate: Date, endDate: Date, dailyRate: number): number {
  // Calculate number of days (inclusive of both start and end dates)
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  return days * dailyRate;
}

/**
 * Calculate penalty amount for overdue rentals
 * 
 * Penalty is calculated as: (overdue days) × (daily rate) × (penalty rate)
 * Default penalty rate is 1.5x the daily rate.
 * 
 * @param endDate - Expected return date (end of rental period)
 * @param actualReturnDate - Actual return date
 * @param dailyRate - Daily rental rate
 * @param penaltyRate - Penalty multiplier (default: 1.5)
 * @returns Penalty amount (0 if not overdue)
 */
function calculatePenalty(
  endDate: Date,
  actualReturnDate: Date,
  dailyRate: number,
  penaltyRate: number = 1.5
): number {
  // No penalty if returned on or before end date
  if (actualReturnDate <= endDate) {
    return 0;
  }

  // Calculate number of overdue days
  const overdueDays = Math.ceil(
    (actualReturnDate.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Calculate penalty: overdue days × daily rate × penalty rate
  return overdueDays * dailyRate * penaltyRate;
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create a new rental
 * 
 * Validates that all assets are available, calculates total amount,
 * generates rental number, and updates asset statuses to "rented".
 * 
 * @param userId - ID of user creating the rental
 * @param input - Rental creation data
 * @returns Created rental DTO
 * @throws TRPCError if assets are not available
 */
export async function createRental(userId: string, input: CreateRentalInput): Promise<RentalDTO> {
  await connectToDatabase();

  // Verify all assets exist and are available
  const assets = await RentalAsset.find({
    _id: { $in: input.assets },
    status: "available",
  });

  if (assets.length !== input.assets.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "ทรัพย์สินบางรายการไม่พร้อมใช้งาน",
    });
  }

  // Calculate total amount
  const totalAmount = calculateTotalAmount(input.startDate, input.endDate, input.dailyRate);

  // Generate rental number
  const rentalNumber = await generateRentalNumber();

  // Create rental
  const rental = await Rental.create({
    ...input,
    assets: input.assets.map((id) => new mongoose.Types.ObjectId(id)),
    rentalNumber,
    totalAmount,
    createdBy: new mongoose.Types.ObjectId(userId),
  });

  // Update asset statuses to "rented" and link to rental
  await RentalAsset.updateMany(
    { _id: { $in: input.assets } },
    {
      $set: {
        status: "rented",
        currentRentalId: rental._id,
      },
    }
  );

  // Populate assets for response
  const populatedRental = await Rental.findById(rental._id)
    .populate({
      path: "assets",
      select: "assetCode productId",
      populate: { path: "productId", select: "name" },
    })
    .lean();

  // Log activity
  await activityLogService.createActivityLog(
    userId,
    "create",
    "rental",
    rental._id.toString(),
    `Rental ${rentalNumber} - ${input.customerName}`
  );

  return {
    id: rental._id.toString(),
    rentalNumber: rental.rentalNumber,
    customerName: rental.customerName,
    customerPhone: rental.customerPhone,
    customerEmail: rental.customerEmail,
    customerAddress: rental.customerAddress,
    assets: (populatedRental?.assets as PopulatedRentalAsset[])?.map((asset) => ({
      id: asset._id.toString(),
      assetCode: asset.assetCode,
      productName: typeof asset.productId === "object" && "_id" in asset.productId && "name" in asset.productId 
        ? asset.productId.name 
        : undefined,
    })) || [],
    startDate: rental.startDate,
    endDate: rental.endDate,
    expectedReturnDate: rental.expectedReturnDate,
    actualReturnDate: rental.actualReturnDate,
    dailyRate: rental.dailyRate,
    totalAmount: rental.totalAmount,
    deposit: rental.deposit,
    penaltyRate: rental.penaltyRate,
    penaltyAmount: rental.penaltyAmount || 0,
    status: rental.status,
    notes: rental.notes,
    createdBy: rental.createdBy.toString(),
    createdAt: rental.createdAt,
    updatedAt: rental.updatedAt,
  };
}

/**
 * Update an existing rental
 * 
 * Handles updates to rental details including:
 * - Recalculating total amount if dates or rate change
 * - Managing asset changes (returning old assets, assigning new ones)
 * 
 * @param userId - ID of user updating the rental
 * @param input - Rental update data
 * @returns Updated rental DTO
 * @throws TRPCError if rental not found or assets unavailable
 */
export async function updateRental(userId: string, input: UpdateRentalInput): Promise<RentalDTO> {
  await connectToDatabase();

  const { id, ...updateData } = input;

  const oldRental = await Rental.findById(id).lean();
  if (!oldRental) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "ไม่พบการเช่า",
    });
  }

  // Recalculate total amount if dates or daily rate changed
  if (updateData.startDate || updateData.endDate || updateData.dailyRate) {
    const startDate = updateData.startDate || oldRental.startDate;
    const endDate = updateData.endDate || oldRental.endDate;
    const dailyRate = updateData.dailyRate || oldRental.dailyRate;
    updateData.totalAmount = calculateTotalAmount(startDate, endDate, dailyRate);
  }

  // Handle asset changes
  if (updateData.assets) {
    // Return old assets
    if (oldRental.assets && oldRental.assets.length > 0) {
      await RentalAsset.updateMany(
        { _id: { $in: oldRental.assets } },
        {
          $set: {
            status: "available",
            currentRentalId: null,
          },
        }
      );
    }

    // Verify new assets are available
    const newAssets = await RentalAsset.find({
      _id: { $in: updateData.assets.map((id: string) => new mongoose.Types.ObjectId(id)) },
      status: "available",
    });

    if (newAssets.length !== updateData.assets.length) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "ทรัพย์สินบางรายการไม่พร้อมใช้งาน",
      });
    }

    // Update new assets
    await RentalAsset.updateMany(
      { _id: { $in: updateData.assets.map((id) => new mongoose.Types.ObjectId(id)) } },
      {
        $set: {
          status: "rented",
          currentRentalId: new mongoose.Types.ObjectId(id),
        },
      }
    );
    
    // Convert asset IDs to ObjectIds for database
    updateData.assets = updateData.assets.map((id: string) => new mongoose.Types.ObjectId(id)) as unknown as typeof updateData.assets;
  }

  const rental = await Rental.findByIdAndUpdate(id, { $set: updateData }, { new: true })
    .populate({
      path: "assets",
      select: "assetCode productId",
      populate: { path: "productId", select: "name" },
    })
    .lean();

  if (!rental) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "ไม่พบการเช่า",
    });
  }

  // Log activity
  await activityLogService.createActivityLog(
    userId,
    "update",
    "rental",
    rental._id.toString(),
    `Rental ${rental.rentalNumber} - ${rental.customerName}`
  );

  return {
    id: rental._id.toString(),
    rentalNumber: rental.rentalNumber,
    customerName: rental.customerName,
    customerPhone: rental.customerPhone,
    customerEmail: rental.customerEmail,
    customerAddress: rental.customerAddress,
    assets: (rental.assets as PopulatedRentalAsset[])?.map((asset) => ({
      id: asset._id.toString(),
      assetCode: asset.assetCode,
      productName: typeof asset.productId === "object" && "_id" in asset.productId && "name" in asset.productId 
        ? asset.productId.name 
        : undefined,
    })) || [],
    startDate: rental.startDate,
    endDate: rental.endDate,
    expectedReturnDate: rental.expectedReturnDate,
    actualReturnDate: rental.actualReturnDate,
    dailyRate: rental.dailyRate,
    totalAmount: rental.totalAmount,
    deposit: rental.deposit,
    penaltyRate: rental.penaltyRate,
    penaltyAmount: rental.penaltyAmount || 0,
    status: rental.status,
    notes: rental.notes,
    createdBy: rental.createdBy.toString(),
    createdAt: rental.createdAt,
    updatedAt: rental.updatedAt,
  };
}

/**
 * Update rental status
 * 
 * Handles status transitions with appropriate business logic:
 * - "completed": Calculates penalty if overdue, returns assets to available
 * - "cancelled": Returns assets to available
 * - "active": Assets already set to rented (no change needed)
 * 
 * @param userId - ID of user updating the status
 * @param input - Status update data (id, status, optional actualReturnDate, penaltyRate, notes)
 * @returns Updated rental DTO
 * @throws TRPCError if rental not found
 */
export async function updateRentalStatus(
  userId: string,
  input: UpdateRentalStatusInput
): Promise<RentalDTO> {
  await connectToDatabase();

  const oldRental = await Rental.findById(input.id).lean();
  if (!oldRental) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "ไม่พบการเช่า",
    });
  }

  // Prepare update data
  const updateData: Record<string, unknown> = {
    status: input.status,
  };
  if (input.notes) {
    updateData.notes = input.notes;
  }

  // ========================================================================
  // Handle Status-Specific Logic
  // ========================================================================
  
  // When completing rental: calculate penalty and return assets
  if (input.status === "completed") {
    const actualReturnDate = input.actualReturnDate || new Date();
    updateData.actualReturnDate = actualReturnDate;

    // Calculate penalty if overdue
    const penaltyRate = input.penaltyRate || oldRental.penaltyRate || 1.5;
    const penaltyAmount = calculatePenalty(
      oldRental.endDate,
      actualReturnDate,
      oldRental.dailyRate,
      penaltyRate
    );

    updateData.penaltyAmount = penaltyAmount;
    updateData.penaltyRate = penaltyRate;

    // Return all assets to available status
    if (oldRental.assets && oldRental.assets.length > 0) {
      await RentalAsset.updateMany(
        { _id: { $in: oldRental.assets } },
        {
          $set: {
            status: "available",
            currentRentalId: null,
          },
        }
      );
    }
  } 
  // When cancelling rental: return assets to available
  else if (input.status === "cancelled") {
    if (oldRental.assets && oldRental.assets.length > 0) {
      await RentalAsset.updateMany(
        { _id: { $in: oldRental.assets } },
        {
          $set: {
            status: "available",
            currentRentalId: null,
          },
        }
      );
    }
  } 
  // When activating rental: assets already set to rented during creation
  else if (input.status === "active" && oldRental.status === "pending") {
    // No action needed - assets already marked as rented
  }

  const rental = await Rental.findByIdAndUpdate(input.id, { $set: updateData }, { new: true })
    .populate({
      path: "assets",
      select: "assetCode productId",
      populate: { path: "productId", select: "name" },
    })
    .lean();

  if (!rental) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "ไม่พบการเช่า",
    });
  }

  // Log activity
  const changes: { old?: Record<string, unknown>; new?: Record<string, unknown> } = {
    old: { status: oldRental.status },
    new: { status: rental.status },
  };

  await activityLogService.createActivityLog(
    userId,
    "update",
    "rental",
    rental._id.toString(),
    `Rental ${rental.rentalNumber} - ${rental.customerName}`,
    changes
  );

  return {
    id: rental._id.toString(),
    rentalNumber: rental.rentalNumber,
    customerName: rental.customerName,
    customerPhone: rental.customerPhone,
    customerEmail: rental.customerEmail,
    customerAddress: rental.customerAddress,
    assets: (rental.assets as PopulatedRentalAsset[])?.map((asset) => ({
      id: asset._id.toString(),
      assetCode: asset.assetCode,
      productName: typeof asset.productId === "object" && "_id" in asset.productId && "name" in asset.productId 
        ? asset.productId.name 
        : undefined,
    })) || [],
    startDate: rental.startDate,
    endDate: rental.endDate,
    expectedReturnDate: rental.expectedReturnDate,
    actualReturnDate: rental.actualReturnDate,
    dailyRate: rental.dailyRate,
    totalAmount: rental.totalAmount,
    deposit: rental.deposit,
    penaltyRate: rental.penaltyRate,
    penaltyAmount: rental.penaltyAmount || 0,
    status: rental.status,
    notes: rental.notes,
    createdBy: rental.createdBy.toString(),
    createdAt: rental.createdAt,
    updatedAt: rental.updatedAt,
  };
}

/**
 * Get a single rental by ID
 * 
 * @param input - Rental ID
 * @returns Rental DTO with populated assets
 * @throws TRPCError if rental not found
 */
export async function getRentalById(input: GetRentalByIdInput): Promise<RentalDTO> {
  await connectToDatabase();

  const rental = await Rental.findById(input.id)
    .populate({
      path: "assets",
      select: "assetCode productId",
      populate: { path: "productId", select: "name" },
    })
    .lean();

  if (!rental) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "ไม่พบการเช่า",
    });
  }

  return {
    id: rental._id.toString(),
    rentalNumber: rental.rentalNumber,
    customerName: rental.customerName,
    customerPhone: rental.customerPhone,
    customerEmail: rental.customerEmail,
    customerAddress: rental.customerAddress,
    assets: (rental.assets as PopulatedRentalAsset[])?.map((asset) => ({
      id: asset._id.toString(),
      assetCode: asset.assetCode,
      productName: typeof asset.productId === "object" && "_id" in asset.productId && "name" in asset.productId 
        ? asset.productId.name 
        : undefined,
    })) || [],
    startDate: rental.startDate,
    endDate: rental.endDate,
    expectedReturnDate: rental.expectedReturnDate,
    actualReturnDate: rental.actualReturnDate,
    dailyRate: rental.dailyRate,
    totalAmount: rental.totalAmount,
    deposit: rental.deposit,
    penaltyRate: rental.penaltyRate,
    penaltyAmount: rental.penaltyAmount || 0,
    status: rental.status,
    notes: rental.notes,
    createdBy: rental.createdBy.toString(),
    createdAt: rental.createdAt,
    updatedAt: rental.updatedAt,
  };
}

/**
 * List rentals with filtering, pagination, and search
 * 
 * Features:
 * - Filter by status, customer email, date range
 * - Search by rental number, customer name, email, or phone
 * - Pagination support
 * - Dynamic penalty calculation for overdue active rentals
 * 
 * @param input - List filters, pagination, and search parameters
 * @returns Object containing rentals array and total count
 */
export async function listRentals(
  input: ListRentalsInput
): Promise<{ rentals: RentalDTO[]; total: number }> {
  await connectToDatabase();

  // ========================================================================
  // Build Query Filters
  // ========================================================================
  
  const query: Record<string, unknown> = {};

  // Filter by status
  if (input.status) {
    query.status = input.status;
  }

  // Filter by customer email
  if (input.customerEmail) {
    query.customerEmail = input.customerEmail;
  }

  // Filter by date range (rentals that start or end within range)
  if (input.startDate || input.endDate) {
    query.$or = [];
    if (input.startDate) {
      query.$or.push({ startDate: { $gte: input.startDate } });
    }
    if (input.endDate) {
      query.$or.push({ endDate: { $lte: input.endDate } });
    }
  }

  // ========================================================================
  // Execute Query with Pagination
  // ========================================================================
  
  const skip = (input.page - 1) * input.limit;
  const total = await Rental.countDocuments(query);

  let rentals = await Rental.find(query)
    .populate({
      path: "assets",
      select: "assetCode productId",
      populate: { path: "productId", select: "name" },
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(input.limit)
    .lean();

  // ========================================================================
  // Apply Search Filter (client-side for flexibility)
  // ========================================================================
  
  if (input.search) {
    const searchLower = input.search.toLowerCase();
    rentals = rentals.filter((rental) => {
      return (
        rental.rentalNumber.toLowerCase().includes(searchLower) ||
        rental.customerName.toLowerCase().includes(searchLower) ||
        rental.customerEmail?.toLowerCase().includes(searchLower) ||
        rental.customerPhone?.toLowerCase().includes(searchLower)
      );
    });
  }

  // ========================================================================
  // Transform Results and Calculate Dynamic Penalties
  // ========================================================================
  
  return {
    rentals: rentals.map((rental) => {
      // Start with stored penalty amount (for completed rentals)
      let penaltyAmount = rental.penaltyAmount || 0;
      
      // Calculate penalty dynamically for active rentals that are overdue
      if (rental.status === "active") {
        const today = new Date();
        const endDate = new Date(rental.endDate);
        
        // Normalize times to midnight for accurate date comparison
        today.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);
        
        // Calculate penalty if rental is overdue
        if (today > endDate) {
          const penaltyRate = rental.penaltyRate || 1.5;
          penaltyAmount = calculatePenalty(
            new Date(rental.endDate),
            today,
            rental.dailyRate,
            penaltyRate
          );
        }
      }

      return {
        id: rental._id.toString(),
        rentalNumber: rental.rentalNumber,
        customerName: rental.customerName,
        customerPhone: rental.customerPhone,
        customerEmail: rental.customerEmail,
        customerAddress: rental.customerAddress,
        assets: (rental.assets as PopulatedRentalAsset[])?.map((asset) => ({
          id: asset._id.toString(),
          assetCode: asset.assetCode,
          productName: typeof asset.productId === "object" && "_id" in asset.productId && "name" in asset.productId 
            ? asset.productId.name 
            : undefined,
        })) || [],
        startDate: rental.startDate,
        endDate: rental.endDate,
        expectedReturnDate: rental.expectedReturnDate,
        actualReturnDate: rental.actualReturnDate,
        dailyRate: rental.dailyRate,
        totalAmount: rental.totalAmount,
        deposit: rental.deposit,
        penaltyRate: rental.penaltyRate,
        penaltyAmount: penaltyAmount,
        status: rental.status,
        notes: rental.notes,
        createdBy: rental.createdBy.toString(),
        createdAt: rental.createdAt,
        updatedAt: rental.updatedAt,
      };
    }),
    total: input.search ? rentals.length : total,
  };
}

/**
 * Cancel a rental
 * 
 * Returns all assets to available status and updates rental status to "cancelled".
 * Optionally stores cancellation reason in notes.
 * 
 * @param userId - ID of user cancelling the rental
 * @param input - Cancellation data (id, optional reason)
 * @returns Updated rental DTO
 * @throws TRPCError if rental not found or already cancelled
 */
export async function cancelRental(
  userId: string,
  input: CancelRentalInput
): Promise<RentalDTO> {
  await connectToDatabase();

  const rental = await Rental.findById(input.id).lean();
  if (!rental) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "ไม่พบการเช่า",
    });
  }

  if (rental.status === "cancelled") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "การเช่านี้ถูกยกเลิกแล้ว",
    });
  }

  // Return assets to available
  if (rental.assets && rental.assets.length > 0) {
    await RentalAsset.updateMany(
      { _id: { $in: rental.assets } },
      {
        $set: {
          status: "available",
          currentRentalId: null,
        },
      }
    );
  }

  const updateData: Record<string, unknown> = {
    status: "cancelled",
  };
  if (input.reason) {
    updateData.notes = input.reason;
  }

  const updatedRental = await Rental.findByIdAndUpdate(input.id, { $set: updateData }, { new: true })
    .populate({
      path: "assets",
      select: "assetCode productId",
      populate: { path: "productId", select: "name" },
    })
    .lean();

  if (!updatedRental) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "ไม่พบการเช่า",
    });
  }

  // Log activity
  const changes: { old?: Record<string, unknown>; new?: Record<string, unknown> } = {
    old: { status: rental.status },
    new: { status: "cancelled" },
  };
  if (input.reason) {
    changes.new = { ...changes.new, reason: input.reason };
  }

  await activityLogService.createActivityLog(
    userId,
    "update",
    "rental",
    updatedRental._id.toString(),
    `Rental ${updatedRental.rentalNumber} - ${updatedRental.customerName}`,
    changes
  );

  return {
    id: updatedRental._id.toString(),
    rentalNumber: updatedRental.rentalNumber,
    customerName: updatedRental.customerName,
    customerPhone: updatedRental.customerPhone,
    customerEmail: updatedRental.customerEmail,
    customerAddress: updatedRental.customerAddress,
    assets: (updatedRental.assets as PopulatedRentalAsset[])?.map((asset) => ({
      id: asset._id.toString(),
      assetCode: asset.assetCode,
      productName: typeof asset.productId === "object" && "_id" in asset.productId && "name" in asset.productId 
        ? asset.productId.name 
        : undefined,
    })) || [],
    startDate: updatedRental.startDate,
    endDate: updatedRental.endDate,
    expectedReturnDate: updatedRental.expectedReturnDate,
    actualReturnDate: updatedRental.actualReturnDate,
    dailyRate: updatedRental.dailyRate,
    totalAmount: updatedRental.totalAmount,
    deposit: updatedRental.deposit,
    penaltyRate: updatedRental.penaltyRate,
    penaltyAmount: updatedRental.penaltyAmount || 0,
    status: updatedRental.status,
    notes: updatedRental.notes,
    createdBy: updatedRental.createdBy.toString(),
    createdAt: updatedRental.createdAt,
    updatedAt: updatedRental.updatedAt,
  };
}

/**
 * Complete a rental (convenience function)
 * 
 * Shortcut for updating rental status to "completed".
 * 
 * @param rentalId - ID of rental to complete
 * @param userId - ID of user completing the rental
 * @returns Updated rental DTO
 */
export async function completeRental(rentalId: string, userId: string): Promise<RentalDTO> {
  return updateRentalStatus(userId, { id: rentalId, status: "completed" });
}
