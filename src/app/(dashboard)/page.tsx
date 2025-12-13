import { auth } from "@/lib/auth";
import {
  PageHeader,
  SectionCard,
  StatCard,
  StatCardGrid,
} from "@/components";
import { Users, ShieldCheck, Key, Rocket } from "lucide-react";
import { api } from "@/lib/trpc/server";

export default async function DashboardPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "admin";

  // Only fetch user count if admin
  let userCount = 0;
  if (isAdmin) {
    try {
      userCount = await api.user.count();
    } catch {
      // Ignore error if not authorized
    }
  }

  return (
    <>
      <PageHeader
        title={`Welcome back, ${session?.user?.name || "User"}!`}
        description="Next.js + tRPC + Mongoose Boilerplate Dashboard"
      />

      <div className="p-6 space-y-6">
        {/* Statistics Grid - Only show to admins */}
        {isAdmin && (
          <StatCardGrid columns={3}>
            <StatCard
              label="Total Users"
              value={userCount}
              icon={Users}
              variant="blue"
            />
            <StatCard
              label="Your Role"
              value={session?.user?.role || "user"}
              icon={ShieldCheck}
              variant="teal"
            />
            <StatCard
              label="API Endpoints"
              value={8}
              icon={Key}
              variant="indigo"
            />
          </StatCardGrid>
        )}

        {/* Features Section */}
        <SectionCard
          title="Boilerplate Features"
          description="This boilerplate includes everything you need to build a full-stack application"
          icon={Rocket}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-3">
              <h4 className="font-medium text-white">Core Stack</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  Next.js 16 with App Router
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  React 19 with React Compiler
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  TypeScript 5 (strict mode)
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  TailwindCSS v4 + shadcn/ui
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium text-white">Backend & Data</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                  tRPC v11 for type-safe APIs
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                  Mongoose v9 with MongoDB
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                  NextAuth v5 authentication
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                  Zod v4 for validation
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium text-white">Authentication</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                  JWT-based sessions
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                  Role-based access (admin/user)
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                  Password reset flow
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                  Protected routes & procedures
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium text-white">DevOps</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                  Docker support (full stack)
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                  Database migrations
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                  Seed scripts
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                  ESLint configured
                </li>
              </ul>
            </div>
          </div>
        </SectionCard>

        {/* Getting Started Section */}
        <SectionCard
          title="Getting Started"
          description="Quick steps to start building your application"
        >
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-800/50 p-4">
              <h4 className="font-mono text-sm font-medium text-white mb-2">
                1. Customize the User model
              </h4>
              <p className="text-sm text-slate-400">
                Edit <code className="text-blue-400">src/lib/db/models/user.ts</code> to
                add fields specific to your application.
              </p>
            </div>
            <div className="rounded-lg bg-slate-800/50 p-4">
              <h4 className="font-mono text-sm font-medium text-white mb-2">
                2. Create new tRPC routers
              </h4>
              <p className="text-sm text-slate-400">
                Add routers in <code className="text-blue-400">src/lib/trpc/routers/</code> and
                register them in the index file.
              </p>
            </div>
            <div className="rounded-lg bg-slate-800/50 p-4">
              <h4 className="font-mono text-sm font-medium text-white mb-2">
                3. Add new pages
              </h4>
              <p className="text-sm text-slate-400">
                Create pages in <code className="text-blue-400">src/app/(dashboard)/</code> using
                the existing UI components.
              </p>
            </div>
          </div>
        </SectionCard>
      </div>
    </>
  );
}
