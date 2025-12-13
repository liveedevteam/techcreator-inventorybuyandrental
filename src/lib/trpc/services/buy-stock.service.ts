/**
 * Buy Stock Service
 * 
 * Handles all buy stock-related business logic including:
 * - Stock quantity management
 * - Stock adjustments with reasons
 * - Low stock detection
 * - Product validation
 */

import { TRPCError } from "@trpc/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import BuyStock from "@/lib/db/models/buy-stock";
import Product from "@/lib/db/models/product";
import type {
  UpdateBuyStockInput,
  AdjustQuantityInput,
  GetBuyStockByProductInput,
  ListBuyStockInput,
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
 * Buy Stock Data Transfer Object
 * 
 * Represents stock information for a product with quantity tracking.
 */
export interface BuyStockDTO {
  id: string;
  productId: string;
  productName?: string;
  productSku?: string;
  quantity: number;
  minQuantity: number;
  lastUpdatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Update or create buy stock
 * 
 * Creates stock entry if it doesn't exist, or updates existing stock.
 * Validates that product exists and is of buy type.
 * Uses upsert to create if not found.
 * 
 * @param userId - ID of user updating the stock
 * @param input - Stock update data (productId, quantity, minQuantity)
 * @returns Updated or created stock DTO
 * @throws TRPCError if product not found or wrong stock type
 */
export async function updateBuyStock(
  userId: string,
  input: UpdateBuyStockInput
): Promise<BuyStockDTO> {
  await connectToDatabase();

  // Validate product exists and is buy type
  const product = await Product.findById(input.productId);
  if (!product) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "ไม่พบสินค้า",
    });
  }
  if (product.stockType !== "buy") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "สินค้านี้ไม่ใช่ประเภทสต็อกซื้อ",
    });
  }

  // Get old stock for change tracking
  const oldStock = await BuyStock.findOne({ productId: input.productId }).lean();
  
  // Update or create stock entry
  const buyStock = await BuyStock.findOneAndUpdate(
    { productId: input.productId },
    {
      $set: {
        quantity: input.quantity,
        minQuantity: input.minQuantity,
        lastUpdatedBy: new mongoose.Types.ObjectId(userId),
      },
    },
    { new: true, upsert: true }
  );

  // Log activity (update if existed, create if new)
  if (oldStock) {
    const changes: { old?: Record<string, unknown>; new?: Record<string, unknown> } = {
      old: { quantity: oldStock.quantity, minQuantity: oldStock.minQuantity },
      new: { quantity: buyStock.quantity, minQuantity: buyStock.minQuantity },
    };
    await activityLogService.createActivityLog(
      userId,
      "update",
      "buyStock",
      buyStock._id.toString(),
      `${product.name} (${product.sku})`,
      changes
    );
  } else {
    await activityLogService.createActivityLog(
      userId,
      "create",
      "buyStock",
      buyStock._id.toString(),
      `${product.name} (${product.sku})`
    );
  }

  return {
    id: buyStock._id.toString(),
    productId: buyStock.productId.toString(),
    productName: product.name,
    productSku: product.sku,
    quantity: buyStock.quantity,
    minQuantity: buyStock.minQuantity,
    lastUpdatedBy: buyStock.lastUpdatedBy.toString(),
    createdAt: buyStock.createdAt,
    updatedAt: buyStock.updatedAt,
  };
}

/**
 * Adjust stock quantity by a delta amount
 * 
 * Adds or subtracts from current quantity. Useful for tracking
 * stock movements (sales, returns, adjustments).
 * Prevents negative quantities.
 * 
 * @param userId - ID of user making the adjustment
 * @param input - Adjustment data (productId, adjustment amount, optional reason)
 * @returns Updated stock DTO
 * @throws TRPCError if product/stock not found, wrong stock type, or would result in negative quantity
 */
export async function adjustQuantity(
  userId: string,
  input: AdjustQuantityInput
): Promise<BuyStockDTO> {
  await connectToDatabase();

  // Validate product exists and is buy type
  const product = await Product.findById(input.productId);
  if (!product) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "ไม่พบสินค้า",
    });
  }
  if (product.stockType !== "buy") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "สินค้านี้ไม่ใช่ประเภทสต็อกซื้อ",
    });
  }

  const buyStock = await BuyStock.findOne({ productId: input.productId });
  if (!buyStock) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "ไม่พบสต็อกสินค้า",
    });
  }

  // Calculate new quantity
  const oldQuantity = buyStock.quantity;
  const newQuantity = oldQuantity + input.adjustment;

  // Prevent negative quantities
  if (newQuantity < 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "จำนวนสต็อกไม่สามารถเป็นค่าลบได้",
    });
  }

  buyStock.quantity = newQuantity;
  buyStock.lastUpdatedBy = new mongoose.Types.ObjectId(userId);
  await buyStock.save();

  // Log activity
  const changes: { old?: Record<string, unknown>; new?: Record<string, unknown> } = {
    old: { quantity: oldQuantity },
    new: { quantity: newQuantity },
  };
  if (input.reason) {
    changes.new = { ...changes.new, reason: input.reason };
  }

  await activityLogService.createActivityLog(
    userId,
    "update",
    "buyStock",
    buyStock._id.toString(),
    `${product.name} (${product.sku})`,
    changes
  );

  return {
    id: buyStock._id.toString(),
    productId: buyStock.productId.toString(),
    productName: product.name,
    productSku: product.sku,
    quantity: buyStock.quantity,
    minQuantity: buyStock.minQuantity,
    lastUpdatedBy: buyStock.lastUpdatedBy.toString(),
    createdAt: buyStock.createdAt,
    updatedAt: buyStock.updatedAt,
  };
}

/**
 * Get stock information for a specific product
 * 
 * @param input - Product ID
 * @returns Stock DTO or null if no stock entry exists
 */
export async function getBuyStockByProduct(
  input: GetBuyStockByProductInput
): Promise<BuyStockDTO | null> {
  await connectToDatabase();

  const buyStock = await BuyStock.findOne({ productId: input.productId }).populate(
    "productId",
    "name sku"
  );

  if (!buyStock) {
    return null;
  }

  const product = buyStock.productId as PopulatedProduct | mongoose.Types.ObjectId;

  return {
    id: buyStock._id.toString(),
    productId: (isPopulatedProduct(product) ? product._id : buyStock.productId).toString(),
    productName: isPopulatedProduct(product) ? product.name : undefined,
    productSku: isPopulatedProduct(product) ? product.sku : undefined,
    quantity: buyStock.quantity,
    minQuantity: buyStock.minQuantity,
    lastUpdatedBy: buyStock.lastUpdatedBy.toString(),
    createdAt: buyStock.createdAt,
    updatedAt: buyStock.updatedAt,
  };
}

/**
 * List buy stock with filtering, pagination, and search
 * 
 * Supports filtering by low stock status and searching by product name or SKU.
 * 
 * @param input - List filters, pagination, and search parameters
 * @returns Object containing stocks array and total count
 */
export async function listBuyStock(
  input: ListBuyStockInput
): Promise<{ stocks: BuyStockDTO[]; total: number }> {
  await connectToDatabase();

  // ========================================================================
  // Build Query Filters
  // ========================================================================
  
  const query: Record<string, unknown> = {};

  // Filter for low stock items (quantity <= minQuantity)
  if (input.lowStockOnly) {
    query.$expr = { $lte: ["$quantity", "$minQuantity"] };
  }

  // ========================================================================
  // Execute Query with Pagination
  // ========================================================================
  
  const skip = (input.page - 1) * input.limit;
  const total = await BuyStock.countDocuments(query);

  let stocks = await BuyStock.find(query)
    .populate("productId", "name sku")
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(input.limit);

  // ========================================================================
  // Apply Search Filter (client-side for flexibility)
  // ========================================================================
  
  if (input.search) {
    stocks = stocks.filter((stock) => {
      const product = stock.productId as PopulatedProduct | mongoose.Types.ObjectId;
      const searchLower = input.search!.toLowerCase();
      if (isPopulatedProduct(product)) {
        return (
          product.name.toLowerCase().includes(searchLower) ||
          product.sku.toLowerCase().includes(searchLower)
        );
      }
      return false;
    });
  }

  return {
    stocks: stocks.map((stock) => {
      const product = stock.productId as PopulatedProduct | mongoose.Types.ObjectId;
      return {
        id: stock._id.toString(),
        productId: (isPopulatedProduct(product) ? product._id : stock.productId).toString(),
        productName: isPopulatedProduct(product) ? product.name : undefined,
        productSku: isPopulatedProduct(product) ? product.sku : undefined,
        quantity: stock.quantity,
        minQuantity: stock.minQuantity,
        lastUpdatedBy: stock.lastUpdatedBy.toString(),
        createdAt: stock.createdAt,
        updatedAt: stock.updatedAt,
      };
    }),
    total: input.search ? stocks.length : total,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get all items with low stock (quantity <= minQuantity)
 * 
 * Returns all products where current quantity is at or below minimum threshold.
 * Sorted by quantity (lowest first) for prioritization.
 * 
 * @returns Array of low stock DTOs
 */
export async function checkLowStock(): Promise<BuyStockDTO[]> {
  await connectToDatabase();

  const stocks = await BuyStock.find({
    $expr: { $lte: ["$quantity", "$minQuantity"] },
  })
    .populate("productId", "name sku")
    .sort({ quantity: 1 });

  return stocks.map((stock) => {
    const product = stock.productId as PopulatedProduct | mongoose.Types.ObjectId;
    return {
      id: stock._id.toString(),
      productId: (isPopulatedProduct(product) ? product._id : stock.productId).toString(),
      productName: isPopulatedProduct(product) ? product.name : undefined,
      productSku: isPopulatedProduct(product) ? product.sku : undefined,
      quantity: stock.quantity,
      minQuantity: stock.minQuantity,
      lastUpdatedBy: stock.lastUpdatedBy.toString(),
      createdAt: stock.createdAt,
      updatedAt: stock.updatedAt,
    };
  });
}
