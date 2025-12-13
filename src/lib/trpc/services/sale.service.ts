/**
 * Sale Service
 * 
 * Handles all sale-related business logic including:
 * - Creating and updating sales
 * - Managing sale status transitions
 * - Deducting stock from BuyStock
 * - Generating bill numbers
 */

import { TRPCError } from "@trpc/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import Sale from "@/lib/db/models/sale";
import BuyStock from "@/lib/db/models/buy-stock";
import Product from "@/lib/db/models/product";
import type {
  CreateSaleInput,
  UpdateSaleInput,
  UpdateSaleStatusInput,
  GetSaleByIdInput,
  ListSalesInput,
  DeleteSaleInput,
} from "../schemas";
import * as activityLogService from "./activity-log.service";

// ============================================================================
// Type Helpers
// ============================================================================

/**
 * Sale item type that can be used for both input and database items
 * (productId can be string or ObjectId)
 */
type SaleItemForStock = Array<{
  productId: string | mongoose.Types.ObjectId;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}>;

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Sale Data Transfer Object
 * 
 * Represents a sale with all its associated data including customer info,
 * items, pricing, and status.
 */
export interface SaleDTO {
  id: string;
  billNumber: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  items: Array<{
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  paymentMethod?: string;
  paymentStatus: "pending" | "paid" | "partial";
  paidAmount: number;
  status: "pending" | "completed" | "cancelled";
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate unique bill number
 * 
 * Format: BILL-YYYYMMDD-NNNN
 * Example: BILL-20251214-0001
 * 
 * @returns Unique bill number string
 */
async function generateBillNumber(): Promise<string> {
  await connectToDatabase();

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const date = String(today.getDate()).padStart(2, "0");

  // Find the last bill number for today
  const lastSale = await Sale.findOne({
    billNumber: new RegExp(`^BILL-${year}${month}${date}`),
  })
    .sort({ billNumber: -1 })
    .lean();

  let sequence = 1;
  if (lastSale) {
    const lastSequence = parseInt(lastSale.billNumber.slice(-4), 10);
    sequence = lastSequence + 1;
  }

  return `BILL-${year}${month}${date}-${String(sequence).padStart(4, "0")}`;
}

/**
 * Verify stock availability for sale items
 * 
 * Validates that products are of "buy" stock type and have sufficient stock.
 * 
 * @param items - Array of sale items to verify
 * @throws TRPCError if any product has insufficient stock or wrong stock type
 */
async function verifyStockAvailability(
  items: SaleItemForStock
): Promise<void> {
  await connectToDatabase();

  for (const item of items) {
    // Verify product exists and is of "buy" stock type
    const product = await Product.findById(item.productId).lean();
    if (!product) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `ไม่พบสินค้า ${item.productName} (SKU: ${item.sku})`,
      });
    }

    if (product.stockType !== "buy") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `สินค้า ${item.productName} (SKU: ${item.sku}) ไม่ใช่ประเภทสต็อกซื้อ ไม่สามารถใช้ในการขายได้`,
      });
    }

    // Verify buy stock exists
    const productId = typeof item.productId === "string" 
      ? item.productId 
      : item.productId.toString();
    const buyStock = await BuyStock.findOne({
      productId: new mongoose.Types.ObjectId(productId),
    }).lean();

    if (!buyStock) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `ไม่พบสต็อกสำหรับสินค้า ${item.productName} (SKU: ${item.sku})`,
      });
    }

    if (buyStock.quantity < item.quantity) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `สต็อกไม่เพียงพอสำหรับสินค้า ${item.productName} (SKU: ${item.sku}). สต็อกคงเหลือ: ${buyStock.quantity}`,
      });
    }
  }
}

/**
 * Deduct stock for completed sale
 * 
 * @param items - Array of sale items
 * @param userId - ID of user performing the operation
 */
async function deductStock(
  items: SaleItemForStock,
  userId: string
): Promise<void> {
  await connectToDatabase();

  for (const item of items) {
    const productId = typeof item.productId === "string" 
      ? item.productId 
      : item.productId.toString();
    const buyStock = await BuyStock.findOne({
      productId: new mongoose.Types.ObjectId(productId),
    });

    if (!buyStock) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `ไม่พบสต็อกสำหรับสินค้า ${item.productName}`,
      });
    }

    // Deduct quantity
    buyStock.quantity -= item.quantity;
    buyStock.lastUpdatedBy = new mongoose.Types.ObjectId(userId);
    await buyStock.save();

    // Log activity
    await activityLogService.createActivityLog(
      userId,
      "update",
      "buyStock",
      buyStock._id.toString(),
      `Buy Stock - ${item.productName}`,
      {
        old: { quantity: buyStock.quantity + item.quantity },
        new: { quantity: buyStock.quantity },
      }
    );
  }
}

/**
 * Restore stock for cancelled sale
 * 
 * @param items - Array of sale items
 * @param userId - ID of user performing the operation
 */
async function restoreStock(
  items: SaleItemForStock,
  userId: string
): Promise<void> {
  await connectToDatabase();

  for (const item of items) {
    const productId = typeof item.productId === "string" 
      ? item.productId 
      : item.productId.toString();
    const buyStock = await BuyStock.findOne({
      productId: new mongoose.Types.ObjectId(productId),
    });

    if (buyStock) {
      // Restore quantity
      buyStock.quantity += item.quantity;
      buyStock.lastUpdatedBy = new mongoose.Types.ObjectId(userId);
      await buyStock.save();

      // Log activity
      await activityLogService.createActivityLog(
        userId,
        "update",
        "buyStock",
        buyStock._id.toString(),
        `Buy Stock - ${item.productName}`,
        {
          old: { quantity: buyStock.quantity - item.quantity },
          new: { quantity: buyStock.quantity },
        }
      );
    }
  }
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create a new sale
 * 
 * Validates stock availability, generates bill number, and creates the sale.
 * Stock is NOT deducted until sale status is changed to "completed".
 * 
 * @param userId - ID of user creating the sale
 * @param input - Sale creation data
 * @returns Created sale DTO
 * @throws TRPCError if stock is insufficient
 */
export async function createSale(
  userId: string,
  input: CreateSaleInput
): Promise<SaleDTO> {
  await connectToDatabase();

  // Verify stock availability (only for buy stock type products)
  await verifyStockAvailability(input.items);

  // Generate bill number
  const billNumber = await generateBillNumber();

  // Create sale
  const sale = await Sale.create({
    ...input,
    billNumber,
    items: input.items.map((item) => ({
      ...item,
      productId: new mongoose.Types.ObjectId(item.productId),
    })),
    createdBy: new mongoose.Types.ObjectId(userId),
  });

  // Populate sale for response
  const populatedSale = await Sale.findById(sale._id).lean();

  if (!populatedSale) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "เกิดข้อผิดพลาดในการสร้างการขาย",
    });
  }

  // Log activity
  await activityLogService.createActivityLog(
    userId,
    "create",
    "sale",
    sale._id.toString(),
    `Sale ${billNumber} - ${input.customerName}`
  );

  return {
    id: populatedSale._id.toString(),
    billNumber: populatedSale.billNumber,
    customerName: populatedSale.customerName,
    customerPhone: populatedSale.customerPhone,
    customerEmail: populatedSale.customerEmail,
    customerAddress: populatedSale.customerAddress,
    items: populatedSale.items.map((item) => ({
      productId: item.productId.toString(),
      productName: item.productName,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    })),
    subtotal: populatedSale.subtotal,
    discount: populatedSale.discount,
    tax: populatedSale.tax,
    totalAmount: populatedSale.totalAmount,
    paymentMethod: populatedSale.paymentMethod,
    paymentStatus: populatedSale.paymentStatus,
    paidAmount: populatedSale.paidAmount,
    status: populatedSale.status,
    notes: populatedSale.notes,
    createdBy: populatedSale.createdBy.toString(),
    createdAt: populatedSale.createdAt,
    updatedAt: populatedSale.updatedAt,
  };
}

/**
 * Update an existing sale
 * 
 * Only pending sales can be updated. If sale is completed, stock changes
 * must be handled separately.
 * 
 * @param userId - ID of user updating the sale
 * @param input - Sale update data
 * @returns Updated sale DTO
 * @throws TRPCError if sale not found or cannot be updated
 */
export async function updateSale(
  userId: string,
  input: UpdateSaleInput
): Promise<SaleDTO> {
  await connectToDatabase();

  const { id, ...updateData } = input;

  const oldSale = await Sale.findById(id).lean();
  if (!oldSale) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "ไม่พบการขาย",
    });
  }

  // Only allow updates to pending sales
  if (oldSale.status !== "pending") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "ไม่สามารถแก้ไขการขายที่เสร็จสิ้นหรือยกเลิกแล้ว",
    });
  }

  // If items are being updated, verify stock availability
  if (updateData.items) {
    await verifyStockAvailability(updateData.items);
    updateData.items = updateData.items.map((item) => ({
      ...item,
      productId: new mongoose.Types.ObjectId(item.productId),
    })) as unknown as typeof updateData.items;
  }

  // Recalculate totals if items, discount, or tax changed
  if (updateData.items || updateData.discount !== undefined || updateData.tax !== undefined) {
    const items = updateData.items || oldSale.items;
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const discount = updateData.discount !== undefined ? updateData.discount : oldSale.discount;
    const tax = updateData.tax !== undefined ? updateData.tax : oldSale.tax;
    const totalAmount = subtotal - discount + tax;

    updateData.subtotal = subtotal;
    updateData.totalAmount = totalAmount;
  }

  const sale = await Sale.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true }
  ).lean();

  if (!sale) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "เกิดข้อผิดพลาดในการอัปเดตการขาย",
    });
  }

  // Log activity
  await activityLogService.createActivityLog(
    userId,
    "update",
    "sale",
    sale._id.toString(),
    `Sale ${sale.billNumber} - ${sale.customerName}`
  );

  return {
    id: sale._id.toString(),
    billNumber: sale.billNumber,
    customerName: sale.customerName,
    customerPhone: sale.customerPhone,
    customerEmail: sale.customerEmail,
    customerAddress: sale.customerAddress,
    items: sale.items.map((item) => ({
      productId: item.productId.toString(),
      productName: item.productName,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    })),
    subtotal: sale.subtotal,
    discount: sale.discount,
    tax: sale.tax,
    totalAmount: sale.totalAmount,
    paymentMethod: sale.paymentMethod,
    paymentStatus: sale.paymentStatus,
    paidAmount: sale.paidAmount,
    status: sale.status,
    notes: sale.notes,
    createdBy: sale.createdBy.toString(),
    createdAt: sale.createdAt,
    updatedAt: sale.updatedAt,
  };
}

/**
 * Update sale status
 * 
 * When status changes to "completed", stock is deducted.
 * When status changes from "completed" to "cancelled", stock is restored.
 * 
 * @param userId - ID of user updating the status
 * @param input - Status update data
 * @returns Updated sale DTO
 * @throws TRPCError if sale not found or invalid status transition
 */
export async function updateSaleStatus(
  userId: string,
  input: UpdateSaleStatusInput
): Promise<SaleDTO> {
  await connectToDatabase();

  const sale = await Sale.findById(input.id).lean();
  if (!sale) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "ไม่พบการขาย",
    });
  }

  // Handle status transitions
  if (input.status === "completed" && sale.status !== "completed") {
    // Deduct stock when completing sale
    await verifyStockAvailability(sale.items as SaleItemForStock);
    await deductStock(sale.items as SaleItemForStock, userId);
  } else if (
    input.status === "cancelled" &&
    sale.status === "completed"
  ) {
    // Restore stock when cancelling completed sale
    await restoreStock(sale.items as SaleItemForStock, userId);
  }

  // Update sale status
  const updatedSale = await Sale.findByIdAndUpdate(
    input.id,
    {
      $set: {
        status: input.status,
        ...(input.notes && { notes: input.notes }),
      },
    },
    { new: true }
  ).lean();

  if (!updatedSale) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "เกิดข้อผิดพลาดในการอัปเดตสถานะ",
    });
  }

  // Log activity
  await activityLogService.createActivityLog(
    userId,
    "update",
    "sale",
    updatedSale._id.toString(),
    `Sale ${updatedSale.billNumber} - ${updatedSale.customerName}`,
    {
      old: { status: sale.status },
      new: { status: input.status },
    }
  );

  return {
    id: updatedSale._id.toString(),
    billNumber: updatedSale.billNumber,
    customerName: updatedSale.customerName,
    customerPhone: updatedSale.customerPhone,
    customerEmail: updatedSale.customerEmail,
    customerAddress: updatedSale.customerAddress,
    items: updatedSale.items.map((item) => ({
      productId: item.productId.toString(),
      productName: item.productName,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    })),
    subtotal: updatedSale.subtotal,
    discount: updatedSale.discount,
    tax: updatedSale.tax,
    totalAmount: updatedSale.totalAmount,
    paymentMethod: updatedSale.paymentMethod,
    paymentStatus: updatedSale.paymentStatus,
    paidAmount: updatedSale.paidAmount,
    status: updatedSale.status,
    notes: updatedSale.notes,
    createdBy: updatedSale.createdBy.toString(),
    createdAt: updatedSale.createdAt,
    updatedAt: updatedSale.updatedAt,
  };
}

/**
 * Get a single sale by ID
 * 
 * @param input - Sale ID
 * @returns Sale DTO
 * @throws TRPCError if sale not found
 */
export async function getSaleById(
  input: GetSaleByIdInput
): Promise<SaleDTO> {
  await connectToDatabase();

  const sale = await Sale.findById(input.id).lean();

  if (!sale) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "ไม่พบการขาย",
    });
  }

  return {
    id: sale._id.toString(),
    billNumber: sale.billNumber,
    customerName: sale.customerName,
    customerPhone: sale.customerPhone,
    customerEmail: sale.customerEmail,
    customerAddress: sale.customerAddress,
    items: sale.items.map((item) => ({
      productId: item.productId.toString(),
      productName: item.productName,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    })),
    subtotal: sale.subtotal,
    discount: sale.discount,
    tax: sale.tax,
    totalAmount: sale.totalAmount,
    paymentMethod: sale.paymentMethod,
    paymentStatus: sale.paymentStatus,
    paidAmount: sale.paidAmount,
    status: sale.status,
    notes: sale.notes,
    createdBy: sale.createdBy.toString(),
    createdAt: sale.createdAt,
    updatedAt: sale.updatedAt,
  };
}

/**
 * List sales with filtering and pagination
 * 
 * Supports filtering by status, payment status, customer name, and date range.
 * 
 * @param input - List filters and pagination parameters
 * @returns Object containing sales array and total count
 */
export async function listSales(
  input: ListSalesInput
): Promise<{ sales: SaleDTO[]; total: number }> {
  await connectToDatabase();

  // ========================================================================
  // Build Query Filters
  // ========================================================================
  
  const query: Record<string, unknown> = {};

  // Filter by status
  if (input.status) {
    query.status = input.status;
  }

  // Filter by payment status
  if (input.paymentStatus) {
    query.paymentStatus = input.paymentStatus;
  }

  // Filter by customer name
  if (input.customerName) {
    query.customerName = { $regex: input.customerName, $options: "i" };
  }

  // Filter by date range
  if (input.startDate || input.endDate) {
    const dateFilter: Record<string, Date> = {};
    if (input.startDate) {
      dateFilter.$gte = input.startDate;
    }
    if (input.endDate) {
      dateFilter.$lte = input.endDate;
    }
    query.createdAt = dateFilter;
  }

  // Search by bill number or customer name
  if (input.search) {
    query.$or = [
      { billNumber: { $regex: input.search, $options: "i" } },
      { customerName: { $regex: input.search, $options: "i" } },
    ];
  }

  // ========================================================================
  // Execute Query with Pagination
  // ========================================================================
  
  const skip = (input.page - 1) * input.limit;
  const total = await Sale.countDocuments(query);

  const sales = await Sale.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(input.limit)
    .lean();

  return {
    sales: sales.map((sale) => ({
      id: sale._id.toString(),
      billNumber: sale.billNumber,
      customerName: sale.customerName,
      customerPhone: sale.customerPhone,
      customerEmail: sale.customerEmail,
      customerAddress: sale.customerAddress,
      items: sale.items.map((item) => ({
        productId: item.productId.toString(),
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
      subtotal: sale.subtotal,
      discount: sale.discount,
      tax: sale.tax,
      totalAmount: sale.totalAmount,
      paymentMethod: sale.paymentMethod,
      paymentStatus: sale.paymentStatus,
      paidAmount: sale.paidAmount,
      status: sale.status,
      notes: sale.notes,
      createdBy: sale.createdBy.toString(),
      createdAt: sale.createdAt,
      updatedAt: sale.updatedAt,
    })),
    total,
  };
}

/**
 * Delete a sale
 * 
 * Only pending sales can be deleted. Completed sales must be cancelled instead.
 * 
 * @param userId - ID of user deleting the sale
 * @param input - Sale ID
 * @throws TRPCError if sale not found or cannot be deleted
 */
export async function deleteSale(
  userId: string,
  input: DeleteSaleInput
): Promise<void> {
  await connectToDatabase();

  const sale = await Sale.findById(input.id).lean();
  if (!sale) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "ไม่พบการขาย",
    });
  }

  // Only allow deletion of pending sales
  if (sale.status !== "pending") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "ไม่สามารถลบการขายที่เสร็จสิ้นหรือยกเลิกแล้ว กรุณายกเลิกการขายแทน",
    });
  }

  await Sale.findByIdAndDelete(input.id);

  // Log activity
  await activityLogService.createActivityLog(
    userId,
    "delete",
    "sale",
    input.id,
    `Sale ${sale.billNumber} - ${sale.customerName}`
  );
}
