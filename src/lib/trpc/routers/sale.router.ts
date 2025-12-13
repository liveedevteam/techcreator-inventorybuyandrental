/**
 * Sale Router
 * 
 * tRPC router for sale management endpoints.
 * Handles sale CRUD operations, status updates, and bill generation.
 */

import { createTRPCRouter, protectedProcedure, adminProcedure } from "../trpc";
import {
  createSaleSchema,
  updateSaleSchema,
  updateSaleStatusSchema,
  getSaleByIdSchema,
  listSalesSchema,
  deleteSaleSchema,
} from "../schemas";
import * as saleService from "../services/sale.service";

export const saleRouter = createTRPCRouter({
  // ============================================================================
  // Admin-Only Mutations
  // ============================================================================
  
  /**
   * Create a new sale
   * 
   * Requires admin role. Validates stock availability and generates bill number.
   */
  create: adminProcedure
    .input(createSaleSchema)
    .mutation(({ ctx, input }) => saleService.createSale(ctx.session.user.id, input)),

  /**
   * Update an existing sale
   * 
   * Requires admin role. Only pending sales can be updated.
   */
  update: adminProcedure
    .input(updateSaleSchema)
    .mutation(({ ctx, input }) => saleService.updateSale(ctx.session.user.id, input)),

  /**
   * Update sale status
   * 
   * Requires admin role. Handles stock deduction when completing sale.
   * Supports changing status to: pending, completed, cancelled.
   */
  updateStatus: adminProcedure
    .input(updateSaleStatusSchema)
    .mutation(({ ctx, input }) => saleService.updateSaleStatus(ctx.session.user.id, input)),

  /**
   * Delete a sale
   * 
   * Requires admin role. Only pending sales can be deleted.
   */
  delete: adminProcedure
    .input(deleteSaleSchema)
    .mutation(({ ctx, input }) => saleService.deleteSale(ctx.session.user.id, input)),

  // ============================================================================
  // Protected Queries (All Authenticated Users)
  // ============================================================================
  
  /**
   * Get a single sale by ID
   * 
   * Available to all authenticated users. Used for bill generation.
   */
  getById: protectedProcedure
    .input(getSaleByIdSchema)
    .query(({ input }) => saleService.getSaleById(input)),

  /**
   * List sales with filtering and pagination
   * 
   * Available to all authenticated users.
   * Supports filtering by status, payment status, customer name, date range, and search.
   */
  list: protectedProcedure
    .input(listSalesSchema)
    .query(({ input }) => saleService.listSales(input)),
});
