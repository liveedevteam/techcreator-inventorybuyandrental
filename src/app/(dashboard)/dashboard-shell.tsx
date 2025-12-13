"use client";

import { signOut } from "next-auth/react";
import {
  AppShell,
  AppShellSidebar,
  AppShellMain,
  AppShellContent,
  Sidebar,
  SidebarBrand,
  SidebarNav,
  SidebarFooter,
  MobileNav,
  Footer,
} from "@/components/layout";
import { NavItem, NavGroup, UserMenu } from "@/components/navigation";
import {
  Home,
  Users,
  Settings,
  Package,
  ShoppingCart,
  Box,
  Calendar,
  FileText,
  Code2,
  Receipt,
} from "lucide-react";
import type { Session } from "next-auth";
import { useTranslation } from "@/lib/hooks/useTranslation";

interface DashboardShellProps {
  children: React.ReactNode;
  session: Session;
}

export function DashboardShell({ children, session }: DashboardShellProps) {
  const t = useTranslation();
  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  const userName = session.user?.name || "User";
  const userEmail = session.user?.email || "";
  const userRole =
    session.user?.role === "super_admin"
      ? "Super Administrator"
      : session.user?.role === "admin"
        ? "Administrator"
        : "User";
  const isAdmin = session.user?.role === "admin" || session.user?.role === "super_admin";
  const isSuperAdmin = session.user?.role === "super_admin";

  return (
    <AppShell>
      <AppShellSidebar>
        <Sidebar>
          <SidebarBrand icon={Code2} title="Stock Management" subtitle="ระบบจัดการสต็อก" />
          <SidebarNav>
            <NavGroup>
              <NavItem href="/" icon={Home} exact>
                {t.nav.dashboard}
              </NavItem>
              {isAdmin && (
                <>
                  <NavItem href="/products" icon={Package}>
                    {t.nav.products}
                  </NavItem>
                  <NavItem href="/buy-stock" icon={ShoppingCart}>
                    {t.nav.buyStock}
                  </NavItem>
                  <NavItem href="/rental-assets" icon={Box}>
                    {t.nav.rentalAssets}
                  </NavItem>
                  <NavItem href="/rentals" icon={Calendar}>
                    {t.nav.rentals}
                  </NavItem>
                  <NavItem href="/sales" icon={Receipt}>
                    {t.nav.sales}
                  </NavItem>
                </>
              )}
              {isSuperAdmin && (
                <>
                  <NavItem href="/activity-logs" icon={FileText}>
                    {t.nav.activityLogs}
                  </NavItem>
                  <NavItem href="/users" icon={Users}>
                    {t.nav.users}
                  </NavItem>
                </>
              )}
            </NavGroup>
            <NavGroup label={t.nav.settings} collapsible defaultOpen={false}>
              <NavItem href="/settings" icon={Settings}>
                {t.nav.settings}
              </NavItem>
            </NavGroup>
          </SidebarNav>
          <SidebarFooter>
            <UserMenu
              name={userName}
              email={userEmail}
              role={userRole}
              onLogout={handleLogout}
            />
          </SidebarFooter>
        </Sidebar>
      </AppShellSidebar>
      <AppShellMain>
        <MobileNav brandIcon={Code2} brandTitle="Stock Management" />
        <AppShellContent>{children}</AppShellContent>
        <Footer version="1.0.0" status="online" />
      </AppShellMain>
    </AppShell>
  );
}
