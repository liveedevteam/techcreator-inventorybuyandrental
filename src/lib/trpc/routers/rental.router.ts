/**
 * Rental Router
 * 
 * tRPC router for rental management endpoints.
 * Handles rental CRUD operations, status updates, and queries.
 */

import { createTRPCRouter, protectedProcedure, adminProcedure } from "../trpc";
import {
  createRentalSchema,
  updateRentalSchema,
  updateRentalStatusSchema,
  getRentalByIdSchema,
  listRentalsSchema,
  cancelRentalSchema,
} from "../schemas";
import * as rentalService from "../services/rental.service";

export const rentalRouter = createTRPCRouter({
  // ============================================================================
  // Admin-Only Mutations
  // ============================================================================
  
  /**
   * Create a new rental
   * 
   * Requires admin role. Validates assets availability and calculates total amount.
   */
  create: adminProcedure
    .input(createRentalSchema)
    .mutation(({ ctx, input }) => rentalService.createRental(ctx.session.user.id, input)),

  /**
   * Update an existing rental
   * 
   * Requires admin role. Handles asset changes and recalculates total amount.
   */
  update: adminProcedure
    .input(updateRentalSchema)
    .mutation(({ ctx, input }) => rentalService.updateRental(ctx.session.user.id, input)),

  /**
   * Update rental status
   * 
   * Requires admin role. Handles status transitions and penalty calculation.
   * Supports changing status to: pending, active, completed, cancelled.
   */
  updateStatus: adminProcedure
    .input(updateRentalStatusSchema)
    .mutation(({ ctx, input }) => rentalService.updateRentalStatus(ctx.session.user.id, input)),

  /**
   * Cancel a rental
   * 
   * Requires admin role. Returns assets to available and marks rental as cancelled.
   */
  cancel: adminProcedure
    .input(cancelRentalSchema)
    .mutation(({ ctx, input }) => rentalService.cancelRental(ctx.session.user.id, input)),

  /**
   * Complete a rental
   * 
   * Requires admin role. Shortcut for updating status to "completed".
   */
  complete: adminProcedure
    .input(getRentalByIdSchema)
    .mutation(({ ctx, input }) =>
      rentalService.completeRental(input.id, ctx.session.user.id)
    ),

  // ============================================================================
  // Protected Queries (All Authenticated Users)
  // ============================================================================
  
  /**
   * Get a single rental by ID
   * 
   * Available to all authenticated users.
   */
  getById: protectedProcedure
    .input(getRentalByIdSchema)
    .query(({ input }) => rentalService.getRentalById(input)),

  /**
   * List rentals with filtering and pagination
   * 
   * Available to all authenticated users.
   * Supports filtering by status, customer email, date range, and search.
   */
  list: protectedProcedure
    .input(listRentalsSchema)
    .query(({ input }) => rentalService.listRentals(input)),
});
