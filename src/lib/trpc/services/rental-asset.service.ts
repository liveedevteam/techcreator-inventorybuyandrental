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
 * Populated product type (when productId is populated with name, sku, and rental rates)
 */
type PopulatedProduct = {
  _id: mongoose.Types.ObjectId;
  name: string;
  sku: string;
  dailyRentalRate?: number;
  monthlyRentalRate?: number;
  insuranceFee?: number;
  replacementPrice?: number;
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
  dailyRentalRate?: number;
  monthlyRentalRate?: number;
  insuranceFee?: number;
  replacementPrice?: number;
  assetCode: string;
  status: "available" | "rented" | "maintenance" | "reserved" | "damaged";
  currentRentalId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Grouped Rental Asset Data Transfer Object
 *
 * Represents a group of rental assets with the same asset code and product,
 * with aggregated counts by status.
 */
export interface GroupedRentalAssetDTO {
  id: string; // First asset's ID or base asset code
  productId: string;
  productName?: string;
  productSku?: string;
  dailyRentalRate?: number;
  monthlyRentalRate?: number;
  insuranceFee?: number;
  replacementPrice?: number;
  assetCode: string; // Base code (no sub-codes)
  totalCount: number;
  statusCounts: {
    available: number;
    rented: number;
    maintenance: number;
    reserved: number;
    damaged: number;
  };
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

  const quantity = input.quantity || 1;
  const baseAssetCode = input.assetCode.toUpperCase();
  const productObjectId = new mongoose.Types.ObjectId(input.productId);

  // Check if asset code already exists for the same product
  // Allow same asset code for different products, but not for same product
  const existingAsset = await RentalAsset.findOne({
    assetCode: baseAssetCode,
    productId: productObjectId,
  });
  if (existingAsset) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "รหัสทรัพย์สินนี้มีอยู่ในระบบแล้วสำหรับสินค้านี้",
    });
  }

  // Create multiple assets with the same base asset code
  const assetsToCreate = [];
  for (let i = 0; i < quantity; i++) {
    assetsToCreate.push({
      productId: productObjectId,
      assetCode: baseAssetCode, // Same code for all units
      status: input.status,
      notes: input.notes,
    });
  }

  const createdAssets = await RentalAsset.insertMany(assetsToCreate);

  // Log activity for each asset
  const productName = product.name || "Unknown";
  for (const asset of createdAssets) {
    await activityLogService.createActivityLog(
      userId,
      "create",
      "rentalAsset",
      asset._id.toString(),
      `${productName} - ${asset.assetCode}`
    );
  }

  // Return the first created asset (for backward compatibility)
  const firstAsset = createdAssets[0];
  return {
    id: firstAsset._id.toString(),
    productId: product._id.toString(),
    productName: product.name,
    productSku: product.sku,
    dailyRentalRate: product.dailyRentalRate,
    monthlyRentalRate: product.monthlyRentalRate,
    insuranceFee: product.insuranceFee,
    replacementPrice: product.replacementPrice,
    assetCode: firstAsset.assetCode,
    status: firstAsset.status,
    currentRentalId: firstAsset.currentRentalId?.toString(),
    notes: firstAsset.notes,
    createdAt: firstAsset.createdAt,
    updatedAt: firstAsset.updatedAt,
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

  const oldAsset = await RentalAsset.findById(id);
  if (!oldAsset) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "ไม่พบทรัพย์สิน",
    });
  }

  // Validate asset code uniqueness if asset code is being updated
  // Check uniqueness per product (same code allowed for different products)
  if (updateData.assetCode) {
    const existingAsset = await RentalAsset.findOne({
      assetCode: updateData.assetCode,
      productId: oldAsset.productId, // Same product
      _id: { $ne: id },
    });
    if (existingAsset) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "รหัสทรัพย์สินนี้มีอยู่ในระบบแล้วสำหรับสินค้านี้",
      });
    }
  }

  const asset = await RentalAsset.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true }
  ).populate("productId", "name sku");

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
    `${isPopulatedProduct(product) ? product.name : "Unknown"} - ${asset.assetCode}`
  );

  return {
    id: asset._id.toString(),
    productId: (isPopulatedProduct(product) ? product._id : asset.productId).toString(),
    productName: isPopulatedProduct(product) ? product.name : undefined,
    productSku: isPopulatedProduct(product) ? product.sku : undefined,
    dailyRentalRate: isPopulatedProduct(product) ? product.dailyRentalRate : undefined,
    monthlyRentalRate: isPopulatedProduct(product) ? product.monthlyRentalRate : undefined,
    insuranceFee: isPopulatedProduct(product) ? product.insuranceFee : undefined,
    replacementPrice: isPopulatedProduct(product) ? product.replacementPrice : undefined,
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
  )
    .populate("productId", "name sku")
    .lean();

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
    `${isPopulatedProduct(product) ? product.name : "Unknown"} - ${asset.assetCode}`,
    changes
  );

  return {
    id: asset._id.toString(),
    productId: (isPopulatedProduct(product) ? product._id : asset.productId).toString(),
    productName: isPopulatedProduct(product) ? product.name : undefined,
    productSku: isPopulatedProduct(product) ? product.sku : undefined,
    dailyRentalRate: isPopulatedProduct(product) ? product.dailyRentalRate : undefined,
    monthlyRentalRate: isPopulatedProduct(product) ? product.monthlyRentalRate : undefined,
    insuranceFee: isPopulatedProduct(product) ? product.insuranceFee : undefined,
    replacementPrice: isPopulatedProduct(product) ? product.replacementPrice : undefined,
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

  const asset = await RentalAsset.findById(input.id).populate(
    "productId",
    "name sku dailyRentalRate monthlyRentalRate"
  );

  if (!asset) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "ไม่พบทรัพย์สิน",
    });
  }

  const product = asset.productId as PopulatedProduct | mongoose.Types.ObjectId;

  return {
    id: asset._id.toString(),
    productId: (isPopulatedProduct(product) ? product._id : asset.productId).toString(),
    productName: isPopulatedProduct(product) ? product.name : undefined,
    productSku: isPopulatedProduct(product) ? product.sku : undefined,
    dailyRentalRate: isPopulatedProduct(product) ? product.dailyRentalRate : undefined,
    monthlyRentalRate: isPopulatedProduct(product) ? product.monthlyRentalRate : undefined,
    insuranceFee: isPopulatedProduct(product) ? product.insuranceFee : undefined,
    replacementPrice: isPopulatedProduct(product) ? product.replacementPrice : undefined,
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
 * Groups assets by assetCode + productId and returns aggregated counts.
 *
 * @param input - List filters, pagination, and search parameters
 * @returns Object containing grouped assets array and total count
 */
export async function listAssets(
  input: ListAssetsInput
): Promise<{ assets: GroupedRentalAssetDTO[]; total: number }> {
  await connectToDatabase();

  // ========================================================================
  // Build Query Filters
  // ========================================================================

  const query: Record<string, unknown> = {};

  // Filter by product ID
  if (input.productId) {
    query.productId = input.productId;
  }

  // Note: We don't filter by status here because we want to group all statuses
  // Status filtering will be applied after grouping

  // ========================================================================
  // Execute Query (fetch all matching assets, no pagination yet)
  // ========================================================================

  let assets = await RentalAsset.find(query)
    .populate(
      "productId",
      "name sku dailyRentalRate monthlyRentalRate insuranceFee replacementPrice"
    )
    .sort({ createdAt: -1 });

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

  // ========================================================================
  // Group Assets by assetCode + productId
  // ========================================================================

  const groupedMap = new Map<
    string,
    {
      assets: typeof assets;
      product: PopulatedProduct | mongoose.Types.ObjectId;
    }
  >();

  for (const asset of assets) {
    const product = asset.productId as PopulatedProduct | mongoose.Types.ObjectId;
    const productId = (isPopulatedProduct(product) ? product._id : asset.productId).toString();
    const groupKey = `${asset.assetCode}_${productId}`;

    if (!groupedMap.has(groupKey)) {
      groupedMap.set(groupKey, {
        assets: [],
        product,
      });
    }

    groupedMap.get(groupKey)!.assets.push(asset);
  }

  // ========================================================================
  // Convert Groups to GroupedRentalAssetDTO
  // ========================================================================

  const groupedAssets: GroupedRentalAssetDTO[] = [];

  for (const [groupKey, group] of groupedMap.entries()) {
    const firstAsset = group.assets[0];
    const product = group.product as PopulatedProduct | mongoose.Types.ObjectId;

    // Calculate status counts
    const statusCounts = {
      available: 0,
      rented: 0,
      maintenance: 0,
      reserved: 0,
      damaged: 0,
    };

    for (const asset of group.assets) {
      statusCounts[asset.status as keyof typeof statusCounts]++;
    }

    // Apply status filter if specified
    if (input.status && statusCounts[input.status] === 0) {
      continue;
    }

    groupedAssets.push({
      id: firstAsset._id.toString(),
      productId: (isPopulatedProduct(product) ? product._id : firstAsset.productId).toString(),
      productName: isPopulatedProduct(product) ? product.name : undefined,
      productSku: isPopulatedProduct(product) ? product.sku : undefined,
      dailyRentalRate: isPopulatedProduct(product) ? product.dailyRentalRate : undefined,
      monthlyRentalRate: isPopulatedProduct(product) ? product.monthlyRentalRate : undefined,
      insuranceFee: isPopulatedProduct(product) ? product.insuranceFee : undefined,
      replacementPrice: isPopulatedProduct(product) ? product.replacementPrice : undefined,
      assetCode: firstAsset.assetCode,
      totalCount: group.assets.length,
      statusCounts,
      notes: firstAsset.notes,
      createdAt: firstAsset.createdAt,
      updatedAt: firstAsset.updatedAt,
    });
  }

  // ========================================================================
  // Apply Pagination to Grouped Results
  // ========================================================================

  const total = groupedAssets.length;
  const skip = (input.page - 1) * input.limit;
  const paginatedAssets = groupedAssets.slice(skip, skip + input.limit);

  return {
    assets: paginatedAssets,
    total,
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
    .populate(
      "productId",
      "name sku dailyRentalRate monthlyRentalRate insuranceFee replacementPrice"
    )
    .sort({ assetCode: 1 });

  return assets.map((asset) => {
    const product = asset.productId as PopulatedProduct | mongoose.Types.ObjectId;
    return {
      id: asset._id.toString(),
      productId: (isPopulatedProduct(product) ? product._id : asset.productId).toString(),
      productName: isPopulatedProduct(product) ? product.name : undefined,
      productSku: isPopulatedProduct(product) ? product.sku : undefined,
      dailyRentalRate: isPopulatedProduct(product) ? product.dailyRentalRate : undefined,
      monthlyRentalRate: isPopulatedProduct(product) ? product.monthlyRentalRate : undefined,
      insuranceFee: isPopulatedProduct(product) ? product.insuranceFee : undefined,
      replacementPrice: isPopulatedProduct(product) ? product.replacementPrice : undefined,
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
 * Get grouped available assets for rental selection
 *
 * Groups available assets by assetCode + productId and includes all individual asset IDs
 * in each group. Used for rental creation to show grouped assets while still allowing
 * selection of individual assets.
 *
 * @returns Array of grouped available assets with individual asset IDs
 */
export interface GroupedAvailableAssetDTO {
  assetCode: string;
  productId: string;
  productName?: string;
  productSku?: string;
  dailyRentalRate?: number;
  monthlyRentalRate?: number;
  insuranceFee?: number;
  replacementPrice?: number;
  availableCount: number;
  assetIds: string[]; // All individual asset IDs in this group
}

export async function getAvailableGroupedAssets(): Promise<GroupedAvailableAssetDTO[]> {
  await connectToDatabase();

  const assets = await RentalAsset.find({ status: "available" })
    .populate(
      "productId",
      "name sku dailyRentalRate monthlyRentalRate insuranceFee replacementPrice"
    )
    .sort({ assetCode: 1 });

  // Group by assetCode + productId
  const groupedMap = new Map<
    string,
    {
      assets: typeof assets;
      product: PopulatedProduct | mongoose.Types.ObjectId;
    }
  >();

  for (const asset of assets) {
    const product = asset.productId as PopulatedProduct | mongoose.Types.ObjectId;
    const productId = (isPopulatedProduct(product) ? product._id : asset.productId).toString();
    const groupKey = `${asset.assetCode}_${productId}`;

    if (!groupedMap.has(groupKey)) {
      groupedMap.set(groupKey, {
        assets: [],
        product,
      });
    }

    groupedMap.get(groupKey)!.assets.push(asset);
  }

  // Convert to DTOs
  const groupedAssets: GroupedAvailableAssetDTO[] = [];

  for (const [groupKey, group] of groupedMap.entries()) {
    const firstAsset = group.assets[0];
    const product = group.product as PopulatedProduct | mongoose.Types.ObjectId;

    groupedAssets.push({
      assetCode: firstAsset.assetCode,
      productId: (isPopulatedProduct(product) ? product._id : firstAsset.productId).toString(),
      productName: isPopulatedProduct(product) ? product.name : undefined,
      productSku: isPopulatedProduct(product) ? product.sku : undefined,
      dailyRentalRate: isPopulatedProduct(product) ? product.dailyRentalRate : undefined,
      monthlyRentalRate: isPopulatedProduct(product) ? product.monthlyRentalRate : undefined,
      insuranceFee: isPopulatedProduct(product) ? product.insuranceFee : undefined,
      replacementPrice: isPopulatedProduct(product) ? product.replacementPrice : undefined,
      availableCount: group.assets.length,
      assetIds: group.assets.map((asset) => asset._id.toString()),
    });
  }

  return groupedAssets;
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
  const assetName = `${isPopulatedProduct(product) ? product.name : "Unknown"} - ${asset.assetCode}`;

  await RentalAsset.findByIdAndDelete(input.id);

  // Log activity
  await activityLogService.createActivityLog(userId, "delete", "rentalAsset", input.id, assetName);

  return { success: true };
}
