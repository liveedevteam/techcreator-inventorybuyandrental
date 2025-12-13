import "server-only";

import { headers } from "next/headers";
import { cache } from "react";

import { createCallerFactory, createTRPCContext } from "./trpc";
import { appRouter } from "./routers";

/**
 * Create a server-side caller for tRPC
 * This allows you to call tRPC procedures directly in Server Components
 */
const createContext = cache(async () => {
  const heads = new Headers(await headers());
  heads.set("x-trpc-source", "rsc");

  return createTRPCContext({
    headers: heads,
  });
});

const createCaller = createCallerFactory(appRouter);

export const api = createCaller(createContext);


