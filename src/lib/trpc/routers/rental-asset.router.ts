/**
 * Rental Asset Router
 * 
 * tRPC router for rental asset management endpoints.
 * Handles asset CRUD operations, status management, and availability queries.
 */

import { createTRPCRouter, protectedProcedure, adminProcedure } from "../trpc";
import {
  createRentalAssetSchema,
  updateRentalAssetSchema,
  updateAssetStatusSchema,
  getAssetByIdSchema,
  listAssetsSchema,
  deleteAssetSchema,
} from "../schemas";
import * as rentalAssetService from "../services/rental-asset.service";

export const rentalAssetRouter = createTRPCRouter({
  // ============================================================================
  // Admin-Only Mutations
  // ============================================================================
  
  /**
   * Create a new rental asset
   * 
   * Requires admin role. Validates product type and asset code uniqueness.
   */
  create: adminProcedure
    .input(createRentalAssetSchema)
    .mutation(({ ctx, input }) =>
      rentalAssetService.createRentalAsset(ctx.session.user.id, input)
    ),

  /**
   * Update an existing rental asset
   * 
   * Requires admin role. Validates asset code uniqueness if code is being updated.
   */
  update: adminProcedure
    .input(updateRentalAssetSchema)
    .mutation(({ ctx, input }) =>
      rentalAssetService.updateRentalAsset(ctx.session.user.id, input)
    ),

  /**
   * Update asset status
   * 
   * Requires admin role. Changes asset status (available, rented, maintenance, etc.).
   */
  updateStatus: adminProcedure
    .input(updateAssetStatusSchema)
    .mutation(({ ctx, input }) =>
      rentalAssetService.updateAssetStatus(ctx.session.user.id, input)
    ),

  /**
   * Delete a rental asset
   * 
   * Requires admin role. Prevents deletion of assets that are currently rented.
   */
  delete: adminProcedure
    .input(deleteAssetSchema)
    .mutation(({ ctx, input }) => rentalAssetService.deleteAsset(ctx.session.user.id, input)),

  // ============================================================================
  // Protected Queries (All Authenticated Users)
  // ============================================================================
  
  /**
   * Get a single asset by ID
   * 
   * Available to all authenticated users.
   */
  getById: protectedProcedure
    .input(getAssetByIdSchema)
    .query(({ input }) => rentalAssetService.getAssetById(input)),

  /**
   * List assets with filtering, pagination, and search
   * 
   * Available to all authenticated users.
   * Supports filtering by product ID and status, and searching by asset code, product name, or SKU.
   */
  list: protectedProcedure
    .input(listAssetsSchema)
    .query(({ input }) => rentalAssetService.listAssets(input)),

  /**
   * Get all available assets (not currently rented)
   * 
   * Available to all authenticated users.
   * Returns assets with status "available", sorted by asset code.
   * Used for rental creation to show only available assets.
   */
  getAvailable: protectedProcedure.query(() => {
    return rentalAssetService.getAvailableAssets();
  }),
});
