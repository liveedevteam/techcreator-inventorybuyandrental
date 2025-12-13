# Next.js + tRPC + Mongoose Boilerplate

A production-ready boilerplate for building full-stack applications with Next.js 16, tRPC v11, and Mongoose v9.

## Features

- **Next.js 16** with App Router and React 19
- **tRPC v11** for type-safe end-to-end APIs
- **Mongoose v9** with MongoDB
- **NextAuth v5** (beta) for authentication
- **Role-based access control** (admin/user roles)
- **TailwindCSS v4** + **shadcn/ui** components
- **Zod v4** for validation
- **Docker support** (full stack containerization)
- **Database migrations** with migrate-mongo
- **TypeScript 5** with strict mode

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 (strict) |
| API | tRPC v11 + React Query |
| Database | MongoDB + Mongoose v9 |
| Auth | NextAuth v5 (JWT strategy) |
| Validation | Zod v4 |
| UI | TailwindCSS v4 + shadcn/ui |
| Forms | react-hook-form |

## Prerequisites

- Node.js 18+ (recommended: 20+)
- MongoDB instance (local or MongoDB Atlas)
- npm or yarn

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd nextjs-trpc-mongoose-boilerplate
npm install
```

### 2. Environment Setup

Create a `.env.local` file in the project root:

```env
# MongoDB Connection String
MONGODB_URI=mongodb://localhost:27017/boilerplate

# NextAuth Secret (generate with: openssl rand -base64 32)
AUTH_SECRET=your-secret-key-here

# Trust host for production deployments
AUTH_TRUST_HOST=true
```

### 3. Run Database Migrations

```bash
npm run migrate:up
```

### 4. Seed Admin User

```bash
npm run seed:user
```

Default credentials:
- **Email:** `admin@example.com`
- **Password:** `admin123`

> ⚠️ **Important:** Change the default password immediately after first login!

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Docker Setup

### Development with Docker

Start MongoDB and the app:

```bash
# Start all services
npm run docker:dev

# Or with admin UI (mongo-express on port 8081)
docker-compose --profile admin up -d
```

### Production Build

```bash
docker-compose up -d
```

The app will be available at `http://localhost:3000`.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run seed:user` | Create initial admin user |
| `npm run change-password <email> <password>` | Change user password |
| `npm run migrate:create <name>` | Create a new migration |
| `npm run migrate:up` | Apply pending migrations |
| `npm run migrate:down` | Rollback last migration |
| `npm run migrate:status` | Check migration status |
| `npm run docker:dev` | Start Docker containers |
| `npm run docker:down` | Stop Docker containers |

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth route group (login, etc.)
│   ├── (dashboard)/       # Protected dashboard routes
│   ├── api/               # API routes
│   │   ├── auth/          # NextAuth handlers
│   │   └── trpc/          # tRPC HTTP handler
│   ├── globals.css        # Global styles
│   └── layout.tsx         # Root layout
├── components/
│   ├── ui/                # shadcn/ui base components
│   ├── layout/            # Layout components
│   ├── navigation/        # Navigation components
│   ├── page/              # Page-level components
│   └── common/            # Shared utility components
├── lib/
│   ├── auth.ts            # NextAuth configuration
│   ├── db/
│   │   ├── connect.ts     # MongoDB connection
│   │   └── models/        # Mongoose models
│   ├── trpc/
│   │   ├── client.ts      # tRPC React client
│   │   ├── routers/       # tRPC routers
│   │   ├── services/      # Business logic services
│   │   ├── schemas/       # Zod validation schemas
│   │   ├── server.ts      # Server-side caller
│   │   └── trpc.ts        # tRPC initialization
│   └── utils.ts           # Utility functions
├── providers/
│   └── trpc-provider.tsx  # tRPC + React Query provider
scripts/
├── seed-user.ts           # User seeder script
└── change-password.ts     # Password change script
migrations/                # Database migrations
```

## How to Extend

### Adding a New Model

1. Create model in `src/lib/db/models/`:

```typescript
// src/lib/db/models/post.ts
import mongoose, { Schema, Model } from "mongoose";

export interface IPost {
  _id: mongoose.Types.ObjectId;
  title: string;
  content: string;
  authorId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new Schema<IPost>(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const Post =
  (mongoose.models.Post as Model<IPost>) ||
  mongoose.model<IPost>("Post", postSchema);

export default Post;
```

2. Export from `src/lib/db/models/index.ts`

### Adding a New tRPC Router

1. Create schema in `src/lib/trpc/schemas/`:

```typescript
// src/lib/trpc/schemas/post.schema.ts
import { z } from "zod";

export const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
});
```

2. Create service in `src/lib/trpc/services/`:

```typescript
// src/lib/trpc/services/post.service.ts
import Post from "@/lib/db/models/post";
import { connectToDatabase } from "@/lib/db/connect";

export async function createPost(authorId: string, input: { title: string; content: string }) {
  await connectToDatabase();
  const post = await Post.create({ ...input, authorId });
  return { id: post._id.toString(), title: post.title };
}
```

3. Create router in `src/lib/trpc/routers/`:

```typescript
// src/lib/trpc/routers/post.ts
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { createPostSchema } from "../schemas";
import * as postService from "../services/post.service";

export const postRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createPostSchema)
    .mutation(({ ctx, input }) =>
      postService.createPost(ctx.session.user.id, input)
    ),
});
```

4. Register in `src/lib/trpc/routers/index.ts`:

```typescript
import { postRouter } from "./post";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  user: userRouter,
  post: postRouter, // Add here
});
```

### Using tRPC in Components

```typescript
"use client";

import { trpc } from "@/lib/trpc/client";

export function PostList() {
  // Query
  const { data, isLoading } = trpc.post.list.useQuery();

  // Mutation
  const createMutation = trpc.post.create.useMutation({
    onSuccess: () => {
      // Invalidate and refetch
      trpc.useUtils().post.list.invalidate();
    },
  });

  return (/* ... */);
}
```

## Authentication & Authorization

### Role-Based Access

The boilerplate includes three procedure types:

```typescript
// Public - no auth required
export const publicProcedure = t.procedure;

// Protected - requires authentication
export const protectedProcedure = t.procedure.use(/* auth check */);

// Admin - requires admin role
export const adminProcedure = protectedProcedure.use(/* role check */);
```

### Checking Auth in Components

```typescript
// Server Component
import { auth } from "@/lib/auth";

export default async function Page() {
  const session = await auth();
  if (!session) redirect("/login");

  const isAdmin = session.user.role === "admin";
  // ...
}
```

```typescript
// Client Component
import { useSession } from "next-auth/react";

export function Component() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  // ...
}
```

## Deployment

### Environment Variables for Production

```env
MONGODB_URI=your-production-mongodb-uri
AUTH_SECRET=your-production-secret
AUTH_TRUST_HOST=true
NODE_ENV=production
```

### Build and Start

```bash
npm run build
npm run start
```

### Docker Production

```bash
docker-compose up -d --build
```

## Security Recommendations

1. **Generate a strong AUTH_SECRET** using `openssl rand -base64 32`
2. **Change default admin password** immediately after setup
3. **Use environment variables** for all sensitive configuration
4. **Enable HTTPS** in production
5. **Restrict MongoDB access** to application IPs only

## License

MIT License - feel free to use this boilerplate for any project.
