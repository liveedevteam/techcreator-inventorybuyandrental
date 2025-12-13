import { createTRPCRouter } from "../trpc";
import { authRouter } from "./auth";
import { userRouter } from "./user";

/**
 * Root router for the application
 * Merges all sub-routers
 */
export const appRouter = createTRPCRouter({
  auth: authRouter,
  user: userRouter,
});

// Export type for client
export type AppRouter = typeof appRouter;
