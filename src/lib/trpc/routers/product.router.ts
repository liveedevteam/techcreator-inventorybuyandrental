/**
 * Product Router
 * 
 * tRPC router for product management endpoints.
 * Handles product CRUD operations and queries.
 */

import { createTRPCRouter, protectedProcedure, adminProcedure } from "../trpc";
import {
  createProductSchema,
  updateProductSchema,
  getProductByIdSchema,
  listProductsSchema,
  deleteProductSchema,
} from "../schemas";
import * as productService from "../services/product.service";

export const productRouter = createTRPCRouter({
  // ============================================================================
  // Admin-Only Mutations
  // ============================================================================
  
  /**
   * Create a new product
   * 
   * Requires admin role. Validates SKU uniqueness.
   */
  create: adminProcedure
    .input(createProductSchema)
    .mutation(({ ctx, input }) => productService.createProduct(ctx.session.user.id, input)),

  /**
   * Update an existing product
   * 
   * Requires admin role. Validates SKU uniqueness if SKU is being updated.
   */
  update: adminProcedure
    .input(updateProductSchema)
    .mutation(({ ctx, input }) => productService.updateProduct(ctx.session.user.id, input)),

  /**
   * Delete a product
   * 
   * Requires admin role. Permanently removes product from the system.
   */
  delete: adminProcedure
    .input(deleteProductSchema)
    .mutation(({ ctx, input }) => productService.deleteProduct(ctx.session.user.id, input)),

  // ============================================================================
  // Protected Queries (All Authenticated Users)
  // ============================================================================
  
  /**
   * Get a single product by ID
   * 
   * Available to all authenticated users.
   */
  getById: protectedProcedure
    .input(getProductByIdSchema)
    .query(({ input }) => productService.getProductById(input)),

  /**
   * List products with filtering, pagination, and search
   * 
   * Available to all authenticated users.
   * Supports filtering by stock type and category, and searching by name, SKU, or description.
   */
  list: protectedProcedure
    .input(listProductsSchema)
    .query(({ input }) => productService.listProducts(input)),
});
