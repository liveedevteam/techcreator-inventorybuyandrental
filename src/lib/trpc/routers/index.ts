import { createTRPCRouter } from "../trpc";
import { authRouter } from "./auth";
import { userRouter } from "./user";
import { productRouter } from "./product.router";
import { buyStockRouter } from "./buy-stock.router";
import { rentalAssetRouter } from "./rental-asset.router";
import { rentalRouter } from "./rental.router";
import { saleRouter } from "./sale.router";
import { activityLogRouter } from "./activity-log.router";

/**
 * Root router for the application
 * Merges all sub-routers
 */
export const appRouter = createTRPCRouter({
  auth: authRouter,
  user: userRouter,
  product: productRouter,
  buyStock: buyStockRouter,
  rentalAsset: rentalAssetRouter,
  rental: rentalRouter,
  sale: saleRouter,
  activityLog: activityLogRouter,
});

// Export type for client
export type AppRouter = typeof appRouter;
