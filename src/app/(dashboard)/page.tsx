import { auth } from "@/lib/auth";
import {
  PageHeader,
  SectionCard,
  StatCard,
  StatCardGrid,
  QuickActionCard,
} from "@/components";
import { ShieldCheck, Rocket, Package, ShoppingCart, Box, Calendar, Receipt } from "lucide-react";
import { api } from "@/lib/trpc/server";

export default async function DashboardPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "admin" || session?.user?.role === "super_admin";

  // Fetch statistics if admin
  let stats = {
    products: 0,
    buyStock: 0,
    rentalAssets: 0,
    activeRentals: 0,
    sales: 0,
    lowStock: 0,
  };

  if (isAdmin) {
    try {
      const [productsData, buyStockData, rentalAssetsData, rentalsData, salesData, lowStockData] =
        await Promise.all([
          api.product.list({ page: 1, limit: 1 }),
          api.buyStock.list({ page: 1, limit: 1 }),
          api.rentalAsset.list({ page: 1, limit: 1 }),
          api.rental.list({ status: "active", page: 1, limit: 1 }),
          api.sale.list({ page: 1, limit: 1 }),
          api.buyStock.checkLowStock(),
        ]);

      stats = {
        products: productsData?.total || 0,
        buyStock: buyStockData?.total || 0,
        rentalAssets: rentalAssetsData?.total || 0,
        activeRentals: rentalsData?.total || 0,
        sales: salesData?.total || 0,
        lowStock: lowStockData?.length || 0,
      };
    } catch {
      // Ignore errors if not authorized
    }
  }

  return (
    <>
      <PageHeader
        title={`ยินดีต้อนรับ, ${session?.user?.name || "User"}!`}
        description="ระบบจัดการสต็อก - Dashboard"
      />

      <div className="p-6 space-y-6">
        {/* Statistics Grid - Only show to admins */}
        {isAdmin && (
          <StatCardGrid columns={6}>
            <StatCard
              label="สินค้าทั้งหมด"
              value={stats.products}
              icon={Package}
              variant="blue"
            />
            <StatCard
              label="สต็อกซื้อ"
              value={stats.buyStock}
              icon={ShoppingCart}
              variant="teal"
            />
            <StatCard
              label="ทรัพย์สินเช่า"
              value={stats.rentalAssets}
              icon={Box}
              variant="indigo"
            />
            <StatCard
              label="การเช่าที่ใช้งาน"
              value={stats.activeRentals}
              icon={Calendar}
              variant="navy"
            />
            <StatCard
              label="การขาย"
              value={stats.sales}
              icon={Receipt}
              variant="blue"
            />
            <StatCard
              label="แจ้งเตือนสต็อกต่ำ"
              value={stats.lowStock}
              icon={ShieldCheck}
              variant="teal"
            />
          </StatCardGrid>
        )}

        {/* Quick Actions */}
        {isAdmin && (
          <SectionCard title="การดำเนินการด่วน" description="เข้าถึงฟีเจอร์หลักได้อย่างรวดเร็ว">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <QuickActionCard
                href="/products"
                icon={Package}
                title="สินค้า"
                description="จัดการสินค้า"
                iconColor="text-blue-500"
                iconBgColor="bg-blue-500/10"
              />
              <QuickActionCard
                href="/buy-stock"
                icon={ShoppingCart}
                title="สต็อกซื้อ"
                description="จัดการสต็อกซื้อ"
                iconColor="text-teal-500"
                iconBgColor="bg-teal-500/10"
              />
              <QuickActionCard
                href="/rental-assets"
                icon={Box}
                title="ทรัพย์สินเช่า"
                description="จัดการทรัพย์สินเช่า"
                iconColor="text-indigo-500"
                iconBgColor="bg-indigo-500/10"
              />
              <QuickActionCard
                href="/rentals"
                icon={Calendar}
                title="การเช่า"
                description="จัดการการเช่า"
                iconColor="text-purple-500"
                iconBgColor="bg-purple-500/10"
              />
              <QuickActionCard
                href="/sales"
                icon={Receipt}
                title="การขาย"
                description="จัดการการขาย"
                iconColor="text-green-500"
                iconBgColor="bg-green-500/10"
              />
            </div>
          </SectionCard>
        )}

        {/* Features Section - Removed for Stock Management System */}
        {false && (
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

        )}
      </div>
    </>
  );
}
