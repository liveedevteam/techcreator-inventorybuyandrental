/**
 * Rental Asset Service
 * 
 * Handles all rental asset-related business logic including:
 * - Asset CRUD operations
 * - Asset status management
 * - Asset availability tracking
 * - Product validation
 */

import { TRPCError } from "@trpc/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import RentalAsset from "@/lib/db/models/rental-asset";
import Product from "@/lib/db/models/product";
import type {
  CreateRentalAssetInput,
  UpdateRentalAssetInput,
  UpdateAssetStatusInput,
  GetAssetByIdInput,
  ListAssetsInput,
  DeleteAssetInput,
} from "../schemas";
import * as activityLogService from "./activity-log.service";

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Populated product type (when productId is populated with name and sku)
 */
type PopulatedProduct = {
  _id: mongoose.Types.ObjectId;
  name: string;
  sku: string;
};

/**
 * Type guard to check if product is populated
 */
function isPopulatedProduct(
  product: PopulatedProduct | mongoose.Types.ObjectId
): product is PopulatedProduct {
  return typeof product === "object" && "_id" in product && "name" in product;
}

/**
 * Rental Asset Data Transfer Object
 * 
 * Represents a rental asset with product information and current status.
 */
export interface RentalAssetDTO {
  id: string;
  productId: string;
  productName?: string;
  productSku?: string;
  assetCode: string;
  status: "available" | "rented" | "maintenance" | "reserved" | "damaged";
  currentRentalId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create a new rental asset
 * 
 * Validates that the product exists and is of rental type.
 * Ensures asset code uniqueness.
 * 
 * @param userId - ID of user creating the asset
 * @param input - Asset creation data
 * @returns Created asset DTO
 * @throws TRPCError if product not found, wrong stock type, or asset code exists
 */
export async function createRentalAsset(
  userId: string,
  input: CreateRentalAssetInput
): Promise<RentalAssetDTO> {
  await connectToDatabase();

  // Validate product exists and is rental type
  const product = await Product.findById(input.productId);
  if (!product) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "ไม่พบสินค้า",
    });
  }
  if (product.stockType !== "rental") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "สินค้านี้ไม่ใช่ประเภทสต็อกเช่า",
    });
  }

  // Validate asset code uniqueness
  const existingAsset = await RentalAsset.findOne({ assetCode: input.assetCode });
  if (existingAsset) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "รหัสทรัพย์สินนี้มีอยู่ในระบบแล้ว",
    });
  }

  const asset = await RentalAsset.create({
    ...input,
    productId: input.productId,
  });

  // Log activity
  await activityLogService.createActivityLog(
    userId,
    "create",
    "rentalAsset",
    asset._id.toString(),
    `${isPopulatedProduct(product) ? product.name : "Unknown"} - ${asset.assetCode}`
  );

  return {
    id: asset._id.toString(),
    productId: asset.productId.toString(),
    productName: isPopulatedProduct(product) ? product.name : undefined,
    productSku: isPopulatedProduct(product) ? product.sku : undefined,
    assetCode: asset.assetCode,
    status: asset.status,
    currentRentalId: asset.currentRentalId?.toString(),
    notes: asset.notes,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
  };
}

/**
 * Update an existing rental asset
 * 
 * Validates asset code uniqueness if asset code is being updated.
 * 
 * @param userId - ID of user updating the asset
 * @param input - Asset update data
 * @returns Updated asset DTO
 * @throws TRPCError if asset not found or asset code conflict
 */
export async function updateRentalAsset(
  userId: string,
  input: UpdateRentalAssetInput
): Promise<RentalAssetDTO> {
  await connectToDatabase();

  const { id, ...updateData } = input;

  const oldAsset = await RentalAsset.findById(id).populate("productId", "name sku").lean();
  if (!oldAsset) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "ไม่พบทรัพย์สิน",
    });
  }

  // Validate asset code uniqueness if asset code is being updated
  if (updateData.assetCode) {
    const existingAsset = await RentalAsset.findOne({
      assetCode: updateData.assetCode,
      _id: { $ne: id },
    });
    if (existingAsset) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "รหัสทรัพย์สินนี้มีอยู่ในระบบแล้ว",
      });
    }
  }

  const asset = await RentalAsset.findByIdAndUpdate(id, { $set: updateData }, { new: true }).populate(
    "productId",
    "name sku"
  );

  if (!asset) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "ไม่พบทรัพย์สิน",
    });
  }

  const product = asset.productId as PopulatedProduct | mongoose.Types.ObjectId;

  // Log activity
  await activityLogService.createActivityLog(
    userId,
    "update",
    "rentalAsset",
    asset._id.toString(),
    `${product?.name} - ${asset.assetCode}`
  );

  return {
    id: asset._id.toString(),
    productId: asset.productId.toString(),
    productName: product?.name,
    productSku: product?.sku,
    assetCode: asset.assetCode,
    status: asset.status,
    currentRentalId: asset.currentRentalId?.toString(),
    notes: asset.notes,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
  };
}

/**
 * Update asset status
 * 
 * Changes the status of an asset (available, rented, maintenance, etc.).
 * Tracks status changes for activity logging.
 * 
 * @param userId - ID of user updating the status
 * @param input - Status update data (id, status, optional notes)
 * @returns Updated asset DTO
 * @throws TRPCError if asset not found
 */
export async function updateAssetStatus(
  userId: string,
  input: UpdateAssetStatusInput
): Promise<RentalAssetDTO> {
  await connectToDatabase();

  const oldAsset = await RentalAsset.findById(input.id).populate("productId", "name sku").lean();
  if (!oldAsset) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "ไม่พบทรัพย์สิน",
    });
  }

  const asset = await RentalAsset.findByIdAndUpdate(
    input.id,
    {
      $set: {
        status: input.status,
        ...(input.notes && { notes: input.notes }),
      },
    },
    { new: true }
  ).populate("productId", "name sku");

  if (!asset) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "ไม่พบทรัพย์สิน",
    });
  }

  const product = asset.productId as PopulatedProduct | mongoose.Types.ObjectId;

  // Log activity with status change
  const changes: { old?: Record<string, unknown>; new?: Record<string, unknown> } = {
    old: { status: oldAsset.status },
    new: { status: asset.status },
  };

  await activityLogService.createActivityLog(
    userId,
    "update",
    "rentalAsset",
    asset._id.toString(),
    `${product?.name} - ${asset.assetCode}`,
    changes
  );

  return {
    id: asset._id.toString(),
    productId: asset.productId.toString(),
    productName: product?.name,
    productSku: product?.sku,
    assetCode: asset.assetCode,
    status: asset.status,
    currentRentalId: asset.currentRentalId?.toString(),
    notes: asset.notes,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
  };
}

/**
 * Get a single asset by ID
 * 
 * @param input - Asset ID
 * @returns Asset DTO with populated product information
 * @throws TRPCError if asset not found
 */
export async function getAssetById(input: GetAssetByIdInput): Promise<RentalAssetDTO> {
  await connectToDatabase();

  const asset = await RentalAsset.findById(input.id).populate("productId", "name sku");

  if (!asset) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "ไม่พบทรัพย์สิน",
    });
  }

  const product = asset.productId as PopulatedProduct | mongoose.Types.ObjectId;

  return {
    id: asset._id.toString(),
    productId: asset.productId.toString(),
    productName: product?.name,
    productSku: product?.sku,
    assetCode: asset.assetCode,
    status: asset.status,
    currentRentalId: asset.currentRentalId?.toString(),
    notes: asset.notes,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
  };
}

/**
 * List assets with filtering, pagination, and search
 * 
 * Supports filtering by product ID and status, and searching by
 * asset code, product name, or SKU.
 * 
 * @param input - List filters, pagination, and search parameters
 * @returns Object containing assets array and total count
 */
export async function listAssets(
  input: ListAssetsInput
): Promise<{ assets: RentalAssetDTO[]; total: number }> {
  await connectToDatabase();

  // ========================================================================
  // Build Query Filters
  // ========================================================================
  
  const query: Record<string, unknown> = {};

  // Filter by product ID
  if (input.productId) {
    query.productId = input.productId;
  }

  // Filter by status
  if (input.status) {
    query.status = input.status;
  }

  // ========================================================================
  // Execute Query with Pagination
  // ========================================================================
  
  const skip = (input.page - 1) * input.limit;
  const total = await RentalAsset.countDocuments(query);

  let assets = await RentalAsset.find(query)
    .populate("productId", "name sku")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(input.limit);

  // ========================================================================
  // Apply Search Filter (client-side for flexibility)
  // ========================================================================
  
  if (input.search) {
    assets = assets.filter((asset) => {
      const product = asset.productId as PopulatedProduct | mongoose.Types.ObjectId;
      const searchLower = input.search!.toLowerCase();
      if (isPopulatedProduct(product)) {
        return (
          asset.assetCode.toLowerCase().includes(searchLower) ||
          product.name.toLowerCase().includes(searchLower) ||
          product.sku.toLowerCase().includes(searchLower)
        );
      }
      return asset.assetCode.toLowerCase().includes(searchLower);
    });
  }

  return {
    assets: assets.map((asset) => {
      const product = asset.productId as PopulatedProduct | mongoose.Types.ObjectId;
      return {
        id: asset._id.toString(),
        productId: asset.productId.toString(),
        productName: product?.name,
        productSku: product?.sku,
        assetCode: asset.assetCode,
        status: asset.status,
        currentRentalId: asset.currentRentalId?.toString(),
        notes: asset.notes,
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt,
      };
    }),
    total: input.search ? assets.length : total,
  };
}

/**
 * Get all available assets (not currently rented)
 * 
 * Returns assets with status "available", optionally filtered by product ID.
 * Used for rental creation to show only available assets.
 * 
 * @param productId - Optional product ID to filter by
 * @returns Array of available asset DTOs, sorted by asset code
 */
export async function getAvailableAssets(productId?: string): Promise<RentalAssetDTO[]> {
  await connectToDatabase();

  const query: Record<string, unknown> = { status: "available" };
  if (productId) {
    query.productId = productId;
  }

  const assets = await RentalAsset.find(query)
    .populate("productId", "name sku")
    .sort({ assetCode: 1 });

  return assets.map((asset) => {
    const product = asset.productId as PopulatedProduct | mongoose.Types.ObjectId;
    return {
      id: asset._id.toString(),
      productId: asset.productId.toString(),
      productName: product?.name,
      productSku: product?.sku,
      assetCode: asset.assetCode,
      status: asset.status,
      currentRentalId: asset.currentRentalId?.toString(),
      notes: asset.notes,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
    };
  });
}

/**
 * Delete a rental asset
 * 
 * Permanently removes an asset from the system.
 * Prevents deletion of assets that are currently rented.
 * 
 * @param userId - ID of user deleting the asset
 * @param input - Asset ID to delete
 * @returns Success status
 * @throws TRPCError if asset not found or currently rented
 */
export async function deleteAsset(
  userId: string,
  input: DeleteAssetInput
): Promise<{ success: boolean }> {
  await connectToDatabase();

  const asset = await RentalAsset.findById(input.id).populate("productId", "name sku");
  if (!asset) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "ไม่พบทรัพย์สิน",
    });
  }

  // Prevent deletion of assets that are currently rented
  if (asset.status === "rented" || asset.currentRentalId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "ไม่สามารถลบทรัพย์สินที่กำลังถูกเช่าอยู่ได้",
    });
  }

  const product = asset.productId as PopulatedProduct | mongoose.Types.ObjectId;
  const assetName = `${product?.name} - ${asset.assetCode}`;

  await RentalAsset.findByIdAndDelete(input.id);

  // Log activity
  await activityLogService.createActivityLog(userId, "delete", "rentalAsset", input.id, assetName);

  return { success: true };
}
