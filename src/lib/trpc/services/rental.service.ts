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
    quantity: number;
    insuranceFee?: number;
    replacementPrice?: number;
  }>;
  startDate: Date;
  endDate: Date;
  expectedReturnDate?: Date;
  actualReturnDate?: Date;
  dailyRate: number;
  totalAmount: number;
  deposit: number;
  shippingCost: number;
  penaltyRate?: number;
  penaltyAmount: number;
  status: "pending" | "active" | "completed" | "cancelled";
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Populated rental asset type (when assets are populated with product info)
 */
type PopulatedRentalAsset = {
  _id: mongoose.Types.ObjectId;
  assetCode: string;
  productId:
    | {
        _id: mongoose.Types.ObjectId;
        name: string;
      }
    | mongoose.Types.ObjectId;
};

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
 * Safely extract an assetId string from unknown input.
 */
function extractAssetIdString(assetId: unknown): string {
  if (typeof assetId === "string") {
    return assetId;
  }
  if (assetId && typeof assetId === "object" && "_id" in assetId && assetId._id) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - guarded by checks above
    return String(assetId._id);
  }
  return "";
}

function isPopulatedAsset(value: unknown): value is PopulatedRentalAsset {
  return typeof value === "object" && value !== null && "_id" in value && "assetCode" in value;
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

  // Debug: Log the input to see what we're receiving
  console.log("createRental input.assets type:", typeof input.assets);
  console.log("createRental input.assets isArray:", Array.isArray(input.assets));
  console.log("createRental input.assets value:", JSON.stringify(input.assets, null, 2));

  // Validate and normalize assets array
  // Handle case where assets might be stringified or malformed
  let assetsArray: Array<{ assetId: string; quantity: number }> = [];

  if (typeof input.assets === "string") {
    try {
      const parsed = JSON.parse(input.assets);
      assetsArray = Array.isArray(parsed) ? parsed : [];
    } catch {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid assets format: cannot parse as JSON",
      });
    }
  } else if (Array.isArray(input.assets)) {
    // Deep clone to ensure we have a plain array
    assetsArray = JSON.parse(JSON.stringify(input.assets));
  } else {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Assets must be an array, received: ${typeof input.assets}`,
    });
  }

  console.log(
    "createRental assetsArray after normalization:",
    JSON.stringify(assetsArray, null, 2)
  );

  if (assetsArray.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "ต้องเลือกทรัพย์สินอย่างน้อย 1 รายการ",
    });
  }

  if (assetsArray.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "ต้องเลือกทรัพย์สินอย่างน้อย 1 รายการ",
    });
  }

  // Extract unique asset IDs and verify all assets exist and are available
  const assetIds = assetsArray
    .map((a) => {
      // Ensure assetId is a string
      if (typeof a.assetId !== "string") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid asset ID format",
        });
      }
      return a.assetId;
    })
    .filter((id) => mongoose.Types.ObjectId.isValid(id));

  const uniqueAssetIds = [...new Set(assetIds)];

  if (uniqueAssetIds.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "ไม่มี asset ID ที่ถูกต้อง",
    });
  }

  const assets = await RentalAsset.find({
    _id: { $in: uniqueAssetIds.map((id) => new mongoose.Types.ObjectId(id)) },
    status: "available",
  });

  if (assets.length !== uniqueAssetIds.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "ทรัพย์สินบางรายการไม่พร้อมใช้งาน",
    });
  }

  // Calculate total amount
  const totalAmount = calculateTotalAmount(input.startDate, input.endDate, input.dailyRate);

  // Generate rental number
  const rentalNumber = await generateRentalNumber();

  // Prepare assets array with proper ObjectId conversion
  // Ensure each item is a plain object, not a Mongoose document or string
  const rentalAssets = assetsArray.map((a, index) => {
    // Handle if item is already a string (shouldn't happen, but defensive)
    if (typeof a === "string") {
      try {
        a = JSON.parse(a);
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Asset at index ${index} is invalid: cannot parse as JSON`,
        });
      }
    }

    // Ensure we have a proper object with assetId and quantity
    if (typeof a !== "object" || a === null || Array.isArray(a)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Invalid asset format at index ${index}: expected object, got ${typeof a}`,
      });
    }

    // Extract assetId and quantity, handling various formats
    const { assetId, quantity } = a as { assetId: unknown; quantity?: unknown };

    if (!assetId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Asset at index ${index} is missing assetId`,
      });
    }

    const assetIdString = String(assetId);
    if (!mongoose.Types.ObjectId.isValid(assetIdString)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Invalid asset ID at index ${index}: ${assetIdString}`,
      });
    }

    const quantityNumber =
      typeof quantity === "number"
        ? quantity
        : typeof quantity === "string"
          ? parseInt(quantity, 10)
          : 1;

    if (isNaN(quantityNumber) || quantityNumber < 1) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Invalid quantity at index ${index}: ${quantity}`,
      });
    }

    // Return plain object (not Mongoose document) - ensure it's a plain object
    return {
      assetId: new mongoose.Types.ObjectId(assetIdString),
      quantity: quantityNumber,
    } as { assetId: mongoose.Types.ObjectId; quantity: number };
  });

  // Ensure rentalAssets is a proper array of plain objects
  if (!Array.isArray(rentalAssets) || rentalAssets.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid assets array format",
    });
  }

  // Verify rentalAssets structure one more time
  for (const asset of rentalAssets) {
    if (!asset || typeof asset !== "object" || !asset.assetId || !asset.quantity) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Invalid asset structure: ${JSON.stringify(asset)}`,
      });
    }
    if (!(asset.assetId instanceof mongoose.Types.ObjectId)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Asset ID must be ObjectId, got: ${typeof asset.assetId}`,
      });
    }
  }

  // Create rental - use same pattern as sale service
  // Ensure all data is properly formatted before passing to Mongoose
  const rentalData = {
    customerName: input.customerName,
    customerPhone: input.customerPhone || undefined,
    customerEmail: input.customerEmail || undefined,
    customerAddress: input.customerAddress || undefined,
    assets: rentalAssets, // This should be an array of { assetId: ObjectId, quantity: number }
    startDate: new Date(input.startDate),
    endDate: new Date(input.endDate),
    expectedReturnDate: input.expectedReturnDate ? new Date(input.expectedReturnDate) : undefined,
    dailyRate: Number(input.dailyRate),
    deposit: Number(input.deposit || 0),
    shippingCost: Number(input.shippingCost || 0),
    notes: input.notes || undefined,
    rentalNumber,
    totalAmount: Number(totalAmount),
    createdBy: new mongoose.Types.ObjectId(userId),
  };

  // Double-check assets is an array before creating
  if (!Array.isArray(rentalData.assets)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Assets must be an array, got: ${typeof rentalData.assets}`,
    });
  }

  // Final validation: ensure each asset has the correct structure
  console.log(
    "createRental rentalData.assets before create:",
    JSON.stringify(rentalData.assets, null, 2)
  );
  console.log("createRental rentalData.assets[0]:", JSON.stringify(rentalData.assets[0], null, 2));
  console.log(
    "createRental rentalData.assets[0].assetId instanceof ObjectId:",
    rentalData.assets[0]?.assetId instanceof mongoose.Types.ObjectId
  );

  // Try creating with explicit validation
  let rental;
  try {
    rental = await Rental.create(rentalData);
    console.log("createRental success, rental._id:", rental._id.toString());
  } catch (error: unknown) {
    console.error("createRental error:", error);
    if (error instanceof Error) {
      console.error("createRental error message:", error.message);
      console.error("createRental error name:", error.name);
    }
    console.error("createRental rentalData.assets:", JSON.stringify(rentalData.assets, null, 2));

    // If it's a validation error, provide more details
    if (error instanceof Error && error.name === "ValidationError") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Validation failed: ${error.message}`,
      });
    }

    throw error;
  }

  // Update asset statuses to "rented" and link to rental
  await RentalAsset.updateMany(
    { _id: { $in: uniqueAssetIds.map((id) => new mongoose.Types.ObjectId(id)) } },
    {
      $set: {
        status: "rented",
        currentRentalId: rental._id,
      },
    }
  );

  // Populate assets for response
  const populatedRental = await Rental.findById(rental._id.toString())
    .populate({
      path: "assets.assetId",
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
    assets:
      (
        populatedRental?.assets as unknown as Array<{
          assetId: PopulatedRentalAsset | mongoose.Types.ObjectId;
          quantity: number;
        }>
      )?.map((item) => {
        if (!isPopulatedAsset(item.assetId)) {
          return {
            id: extractAssetIdString(item.assetId),
            assetCode: "",
            productName: undefined,
            quantity: item.quantity,
          };
        }
        const asset = item.assetId;
        return {
          id: asset._id.toString(),
          assetCode: asset.assetCode || "",
          productName:
            typeof asset.productId === "object" &&
            asset.productId !== null &&
            "_id" in asset.productId &&
            "name" in asset.productId
              ? asset.productId.name
              : undefined,
          quantity: item.quantity,
        };
      }) || [],
    startDate: rental.startDate,
    endDate: rental.endDate,
    expectedReturnDate: rental.expectedReturnDate,
    actualReturnDate: rental.actualReturnDate,
    dailyRate: rental.dailyRate,
    totalAmount: rental.totalAmount,
    deposit: rental.deposit,
    shippingCost: rental.shippingCost ?? 0,
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

  // Create a mutable update object with totalAmount property
  const updateObj: Record<string, unknown> = { ...updateData };

  // Recalculate total amount if dates or daily rate changed
  if (updateData.startDate || updateData.endDate || updateData.dailyRate) {
    const startDate = updateData.startDate || oldRental.startDate;
    const endDate = updateData.endDate || oldRental.endDate;
    const dailyRate = updateData.dailyRate || oldRental.dailyRate;
    updateObj.totalAmount = calculateTotalAmount(startDate, endDate, dailyRate);
  }

  // Handle asset changes
  if (updateData.assets) {
    // Return old assets
    if (oldRental.assets && oldRental.assets.length > 0) {
      const oldAssetIds = (oldRental.assets as Array<{ assetId: mongoose.Types.ObjectId }>).map(
        (a) => a.assetId
      );
      await RentalAsset.updateMany(
        { _id: { $in: oldAssetIds } },
        {
          $set: {
            status: "available",
            currentRentalId: null,
          },
        }
      );
    }

    // Verify new assets are available
    const assetIdsRaw = (updateData.assets as Array<string | { assetId: string }>).map((v) =>
      typeof v === "string" ? v : v.assetId
    );
    const assetObjectIds = assetIdsRaw.map((id) => new mongoose.Types.ObjectId(id));

    const newAssets = await RentalAsset.find({
      _id: { $in: assetObjectIds },
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
      { _id: { $in: assetObjectIds } },
      {
        $set: {
          status: "rented",
          currentRentalId: new mongoose.Types.ObjectId(id),
        },
      }
    );

    // Convert asset IDs to ObjectIds for database
    updateObj.assets = assetObjectIds;
  }

  const rental = await Rental.findByIdAndUpdate(id, { $set: updateObj }, { new: true })
    .populate({
      path: "assets.assetId",
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
    assets:
      (
        rental.assets as unknown as Array<{
          assetId: PopulatedRentalAsset | mongoose.Types.ObjectId;
          quantity: number;
        }>
      )?.map((item) => {
        if (!isPopulatedAsset(item.assetId)) {
          return {
            id: extractAssetIdString(item.assetId),
            assetCode: "",
            productName: undefined,
            quantity: item.quantity,
          };
        }
        const asset = item.assetId;
        return {
          id: asset._id.toString(),
          assetCode: asset.assetCode || "",
          productName:
            typeof asset.productId === "object" &&
            asset.productId !== null &&
            "_id" in asset.productId &&
            "name" in asset.productId
              ? asset.productId.name
              : undefined,
          quantity: item.quantity,
        };
      }) || [],
    startDate: rental.startDate,
    endDate: rental.endDate,
    expectedReturnDate: rental.expectedReturnDate,
    actualReturnDate: rental.actualReturnDate,
    dailyRate: rental.dailyRate,
    totalAmount: rental.totalAmount,
    deposit: rental.deposit,
    shippingCost: rental.shippingCost ?? 0,
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
      const oldAssetIds = (oldRental.assets as Array<{ assetId: mongoose.Types.ObjectId }>).map(
        (a) => a.assetId
      );
      await RentalAsset.updateMany(
        { _id: { $in: oldAssetIds } },
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
      const oldAssetIds = (oldRental.assets as Array<{ assetId: mongoose.Types.ObjectId }>).map(
        (a) => a.assetId
      );
      await RentalAsset.updateMany(
        { _id: { $in: oldAssetIds } },
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
      path: "assets.assetId",
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
    assets:
      (
        rental.assets as unknown as Array<{
          assetId: PopulatedRentalAsset | mongoose.Types.ObjectId;
          quantity: number;
        }>
      )?.map((item) => {
        if (!isPopulatedAsset(item.assetId)) {
          return {
            id: extractAssetIdString(item.assetId),
            assetCode: "",
            productName: undefined,
            quantity: item.quantity,
          };
        }
        const asset = item.assetId;
        return {
          id: asset._id.toString(),
          assetCode: asset.assetCode || "",
          productName:
            typeof asset.productId === "object" &&
            asset.productId !== null &&
            "_id" in asset.productId &&
            "name" in asset.productId
              ? asset.productId.name
              : undefined,
          quantity: item.quantity,
        };
      }) || [],
    startDate: rental.startDate,
    endDate: rental.endDate,
    expectedReturnDate: rental.expectedReturnDate,
    actualReturnDate: rental.actualReturnDate,
    dailyRate: rental.dailyRate,
    totalAmount: rental.totalAmount,
    deposit: rental.deposit,
    shippingCost: rental.shippingCost ?? 0,
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
      path: "assets.assetId",
      select: "assetCode productId",
      populate: { path: "productId", select: "name insuranceFee replacementPrice" },
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
    assets:
      (
        rental.assets as unknown as Array<{
          assetId: PopulatedRentalAsset | mongoose.Types.ObjectId;
          quantity: number;
        }>
      )?.map((item) => {
        if (!isPopulatedAsset(item.assetId)) {
          return {
            id: extractAssetIdString(item.assetId),
            assetCode: "",
            productName: undefined,
            quantity: item.quantity,
            insuranceFee: undefined,
            replacementPrice: undefined,
          };
        }
        const asset = item.assetId;
        const product = asset.productId;
        const isPopulatedProduct =
          typeof product === "object" && product !== null && "_id" in product && "name" in product;
        return {
          id: asset._id.toString(),
          assetCode: asset.assetCode || "",
          productName: isPopulatedProduct ? product.name : undefined,
          insuranceFee:
            isPopulatedProduct && "insuranceFee" in product
              ? (product.insuranceFee as number | undefined)
              : undefined,
          replacementPrice:
            isPopulatedProduct && "replacementPrice" in product
              ? (product.replacementPrice as number | undefined)
              : undefined,
          quantity: item.quantity,
        };
      }) || [],
    startDate: rental.startDate,
    endDate: rental.endDate,
    expectedReturnDate: rental.expectedReturnDate,
    actualReturnDate: rental.actualReturnDate,
    dailyRate: rental.dailyRate,
    totalAmount: rental.totalAmount,
    deposit: rental.deposit,
    shippingCost: rental.shippingCost ?? 0,
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
    const orConditions: Array<Record<string, unknown>> = [];
    if (input.startDate) {
      orConditions.push({ startDate: { $gte: input.startDate } });
    }
    if (input.endDate) {
      orConditions.push({ endDate: { $lte: input.endDate } });
    }
    query.$or = orConditions;
  }

  // ========================================================================
  // Execute Query with Pagination
  // ========================================================================

  const skip = (input.page - 1) * input.limit;
  const total = await Rental.countDocuments(query);

  let rentals = await Rental.find(query)
    .populate({
      path: "assets.assetId",
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
        assets:
          (
            rental.assets as unknown as Array<{
              assetId: PopulatedRentalAsset | mongoose.Types.ObjectId;
              quantity: number;
            }>
          )?.map((item) => {
            if (!isPopulatedAsset(item.assetId)) {
              return {
                id: extractAssetIdString(item.assetId),
                assetCode: "",
                productName: undefined,
                quantity: item.quantity || 1,
              };
            }
            const asset = item.assetId;
            return {
              id: asset._id.toString(),
              assetCode: asset.assetCode || "",
              productName:
                typeof asset.productId === "object" &&
                asset.productId !== null &&
                "_id" in asset.productId &&
                "name" in asset.productId
                  ? asset.productId.name
                  : undefined,
              quantity: item.quantity || 1,
            };
          }) || [],
        startDate: rental.startDate,
        endDate: rental.endDate,
        expectedReturnDate: rental.expectedReturnDate,
        actualReturnDate: rental.actualReturnDate,
        dailyRate: rental.dailyRate,
        totalAmount: rental.totalAmount,
        deposit: rental.deposit,
        shippingCost: rental.shippingCost ?? 0,
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
export async function cancelRental(userId: string, input: CancelRentalInput): Promise<RentalDTO> {
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
    const assetIds = (
      rental.assets as Array<{ assetId: mongoose.Types.ObjectId; quantity: number }>
    ).map((a) => a.assetId);
    await RentalAsset.updateMany(
      { _id: { $in: assetIds } },
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

  const updatedRental = await Rental.findByIdAndUpdate(
    input.id,
    { $set: updateData },
    { new: true }
  )
    .populate({
      path: "assets.assetId",
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
    assets:
      (
        updatedRental.assets as unknown as Array<{
          assetId: PopulatedRentalAsset | mongoose.Types.ObjectId;
          quantity?: number;
        }>
      )?.map((item) => {
        if (!isPopulatedAsset(item.assetId)) {
          return {
            id: extractAssetIdString(item.assetId),
            assetCode: "",
            productName: undefined,
            quantity: item.quantity || 1,
          };
        }
        const asset = item.assetId;
        return {
          id: asset._id.toString(),
          assetCode: asset.assetCode || "",
          productName:
            typeof asset.productId === "object" &&
            asset.productId !== null &&
            "_id" in asset.productId &&
            "name" in asset.productId
              ? asset.productId.name
              : undefined,
          quantity: item.quantity || 1,
        };
      }) || [],
    startDate: updatedRental.startDate,
    endDate: updatedRental.endDate,
    expectedReturnDate: updatedRental.expectedReturnDate,
    actualReturnDate: updatedRental.actualReturnDate,
    dailyRate: updatedRental.dailyRate,
    totalAmount: updatedRental.totalAmount,
    deposit: updatedRental.deposit,
    shippingCost: updatedRental.shippingCost ?? 0,
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
