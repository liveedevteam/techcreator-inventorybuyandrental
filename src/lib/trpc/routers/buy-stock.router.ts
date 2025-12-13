/**
 * Buy Stock Router
 * 
 * tRPC router for buy stock management endpoints.
 * Handles stock quantity updates, adjustments, and low stock detection.
 */

import { createTRPCRouter, protectedProcedure, adminProcedure } from "../trpc";
import {
  updateBuyStockSchema,
  adjustQuantitySchema,
  getBuyStockByProductSchema,
  listBuyStockSchema,
} from "../schemas";
import * as buyStockService from "../services/buy-stock.service";

export const buyStockRouter = createTRPCRouter({
  // ============================================================================
  // Admin-Only Mutations
  // ============================================================================
  
  /**
   * Update or create buy stock
   * 
   * Requires admin role. Creates stock entry if it doesn't exist, or updates existing stock.
   * Validates that product is of buy type.
   */
  update: adminProcedure
    .input(updateBuyStockSchema)
    .mutation(({ ctx, input }) => buyStockService.updateBuyStock(ctx.session.user.id, input)),

  /**
   * Adjust stock quantity by delta amount
   * 
   * Requires admin role. Adds or subtracts from current quantity.
   * Useful for tracking stock movements (sales, returns, adjustments).
   * Prevents negative quantities.
   */
  adjustQuantity: adminProcedure
    .input(adjustQuantitySchema)
    .mutation(({ ctx, input }) => buyStockService.adjustQuantity(ctx.session.user.id, input)),

  // ============================================================================
  // Protected Queries (All Authenticated Users)
  // ============================================================================
  
  /**
   * Get stock information for a specific product
   * 
   * Available to all authenticated users.
   */
  getByProduct: protectedProcedure
    .input(getBuyStockByProductSchema)
    .query(({ input }) => buyStockService.getBuyStockByProduct(input)),

  /**
   * List buy stock with filtering, pagination, and search
   * 
   * Available to all authenticated users.
   * Supports filtering by low stock status and searching by product name or SKU.
   */
  list: protectedProcedure
    .input(listBuyStockSchema)
    .query(({ input }) => buyStockService.listBuyStock(input)),

  /**
   * Get all items with low stock (quantity <= minQuantity)
   * 
   * Available to all authenticated users.
   * Returns products where current quantity is at or below minimum threshold.
   */
  checkLowStock: protectedProcedure.query(() => buyStockService.checkLowStock()),
});
