/**
 * Product Service
 *
 * Handles all product-related business logic including:
 * - Product CRUD operations
 * - SKU validation and uniqueness
 * - Product search and filtering
 */

import { TRPCError } from "@trpc/server";
import { connectToDatabase } from "@/lib/db/connect";
import Product from "@/lib/db/models/product";
import type {
  CreateProductInput,
  UpdateProductInput,
  GetProductByIdInput,
  ListProductsInput,
  DeleteProductInput,
} from "../schemas";
import * as activityLogService from "./activity-log.service";

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Product Data Transfer Object
 *
 * Represents a product with all its details.
 */
export interface ProductDTO {
  id: string;
  name: string;
  description?: string;
  sku: string;
  category?: string;
  price?: number;
  unit?: string;
  images?: string[];
  stockType: "buy" | "rental";
  dailyRentalRate?: number;
  monthlyRentalRate?: number;
  insuranceFee?: number;
  replacementPrice?: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create a new product
 *
 * Validates SKU uniqueness before creating product.
 * Automatically logs the creation activity.
 *
 * @param userId - ID of user creating the product
 * @param input - Product creation data
 * @returns Created product DTO
 * @throws TRPCError if SKU already exists
 */
export async function createProduct(
  userId: string,
  input: CreateProductInput
): Promise<ProductDTO> {
  await connectToDatabase();

  // Validate SKU uniqueness
  const existingProduct = await Product.findOne({ sku: input.sku });
  if (existingProduct) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "SKU นี้มีอยู่ในระบบแล้ว",
    });
  }

  const product = await Product.create({
    ...input,
    createdBy: userId,
  });

  // Log activity
  await activityLogService.createActivityLog(
    userId,
    "create",
    "product",
    product._id.toString(),
    product.name
  );

  return {
    id: product._id.toString(),
    name: product.name,
    description: product.description,
    sku: product.sku,
    category: product.category,
    price: product.price,
    unit: product.unit,
    images: product.images,
    stockType: product.stockType,
    dailyRentalRate: product.dailyRentalRate,
    monthlyRentalRate: product.monthlyRentalRate,
    insuranceFee: product.insuranceFee,
    replacementPrice: product.replacementPrice,
    createdBy: product.createdBy.toString(),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

/**
 * Update an existing product
 *
 * Validates SKU uniqueness if SKU is being updated.
 * Tracks changes for activity logging.
 *
 * @param userId - ID of user updating the product
 * @param input - Product update data
 * @returns Updated product DTO
 * @throws TRPCError if product not found or SKU conflict
 */
export async function updateProduct(
  userId: string,
  input: UpdateProductInput
): Promise<ProductDTO> {
  await connectToDatabase();

  const { id, ...updateData } = input;

  // Validate SKU uniqueness if SKU is being updated
  if (updateData.sku) {
    const existingProduct = await Product.findOne({ sku: updateData.sku, _id: { $ne: id } });
    if (existingProduct) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "SKU นี้มีอยู่ในระบบแล้ว",
      });
    }
  }

  const oldProduct = await Product.findById(id).lean();
  if (!oldProduct) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "ไม่พบสินค้า",
    });
  }

  const product = await Product.findByIdAndUpdate(id, { $set: updateData }, { new: true });

  if (!product) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "ไม่พบสินค้า",
    });
  }

  // Track changes for activity logging
  const changes: { old?: Record<string, unknown>; new?: Record<string, unknown> } = {};
  if (updateData.name && oldProduct.name !== product.name) {
    changes.old = { ...changes.old, name: oldProduct.name };
    changes.new = { ...changes.new, name: product.name };
  }
  if (updateData.sku && oldProduct.sku !== product.sku) {
    changes.old = { ...changes.old, sku: oldProduct.sku };
    changes.new = { ...changes.new, sku: product.sku };
  }

  await activityLogService.createActivityLog(
    userId,
    "update",
    "product",
    product._id.toString(),
    product.name,
    Object.keys(changes).length > 0 ? changes : undefined
  );

  return {
    id: product._id.toString(),
    name: product.name,
    description: product.description,
    sku: product.sku,
    category: product.category,
    price: product.price,
    unit: product.unit,
    images: product.images,
    stockType: product.stockType,
    dailyRentalRate: product.dailyRentalRate,
    monthlyRentalRate: product.monthlyRentalRate,
    insuranceFee: product.insuranceFee,
    replacementPrice: product.replacementPrice,
    createdBy: product.createdBy.toString(),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

/**
 * Get a single product by ID
 *
 * @param input - Product ID
 * @returns Product DTO
 * @throws TRPCError if product not found
 */
export async function getProductById(input: GetProductByIdInput): Promise<ProductDTO> {
  await connectToDatabase();

  const product = await Product.findById(input.id);
  if (!product) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "ไม่พบสินค้า",
    });
  }

  return {
    id: product._id.toString(),
    name: product.name,
    description: product.description,
    sku: product.sku,
    category: product.category,
    price: product.price,
    unit: product.unit,
    images: product.images,
    stockType: product.stockType,
    dailyRentalRate: product.dailyRentalRate,
    monthlyRentalRate: product.monthlyRentalRate,
    insuranceFee: product.insuranceFee,
    replacementPrice: product.replacementPrice,
    createdBy: product.createdBy.toString(),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

/**
 * List products with filtering, pagination, and search
 *
 * Supports filtering by stock type and category, and searching by
 * name, SKU, or description.
 *
 * @param input - List filters, pagination, and search parameters
 * @returns Object containing products array and total count
 */
export async function listProducts(
  input: ListProductsInput
): Promise<{ products: ProductDTO[]; total: number }> {
  await connectToDatabase();

  // ========================================================================
  // Build Query Filters
  // ========================================================================

  const query: Record<string, unknown> = {};

  // Filter by stock type (buy or rental)
  if (input.stockType) {
    query.stockType = input.stockType;
  }

  // Filter by category
  if (input.category) {
    query.category = input.category;
  }

  // Search by name, SKU, or description (case-insensitive)
  if (input.search) {
    query.$or = [
      { name: { $regex: input.search, $options: "i" } },
      { sku: { $regex: input.search, $options: "i" } },
      { description: { $regex: input.search, $options: "i" } },
    ];
  }

  // ========================================================================
  // Execute Query with Pagination
  // ========================================================================

  const skip = (input.page - 1) * input.limit;
  const total = await Product.countDocuments(query);

  const products = await Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(input.limit);

  return {
    products: products.map((product) => ({
      id: product._id.toString(),
      name: product.name,
      description: product.description,
      sku: product.sku,
      category: product.category,
      price: product.price,
      unit: product.unit,
      images: product.images,
      stockType: product.stockType,
      dailyRentalRate: product.dailyRentalRate,
      monthlyRentalRate: product.monthlyRentalRate,
      createdBy: product.createdBy.toString(),
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    })),
    total,
  };
}

/**
 * Delete a product
 *
 * Permanently removes a product from the system.
 * Logs the deletion activity.
 *
 * @param userId - ID of user deleting the product
 * @param input - Product ID to delete
 * @returns Success status
 * @throws TRPCError if product not found
 */
export async function deleteProduct(
  userId: string,
  input: DeleteProductInput
): Promise<{ success: boolean }> {
  await connectToDatabase();

  const product = await Product.findById(input.id);
  if (!product) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "ไม่พบสินค้า",
    });
  }

  const productName = product.name;
  await Product.findByIdAndDelete(input.id);

  // Log activity
  await activityLogService.createActivityLog(userId, "delete", "product", input.id, productName);

  return { success: true };
}
