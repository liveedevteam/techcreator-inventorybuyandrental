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
import { Home, Users, Settings, Code2 } from "lucide-react";
import type { Session } from "next-auth";

interface DashboardShellProps {
  children: React.ReactNode;
  session: Session;
}

export function DashboardShell({ children, session }: DashboardShellProps) {
  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  const userName = session.user?.name || "User";
  const userEmail = session.user?.email || "";
  const userRole = session.user?.role === "admin" ? "Administrator" : "User";
  const isAdmin = session.user?.role === "admin";

  return (
    <AppShell>
      <AppShellSidebar>
        <Sidebar>
          <SidebarBrand icon={Code2} title="Boilerplate" subtitle="Next.js + tRPC" />
          <SidebarNav>
            <NavGroup>
              <NavItem href="/" icon={Home} exact>
                Dashboard
              </NavItem>
              {isAdmin && (
                <NavItem href="/users" icon={Users}>
                  Users
                </NavItem>
              )}
            </NavGroup>
            <NavGroup label="Settings" collapsible defaultOpen={false}>
              <NavItem href="/settings" icon={Settings}>
                Account Settings
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
        <MobileNav brandIcon={Code2} brandTitle="Boilerplate" />
        <AppShellContent>{children}</AppShellContent>
        <Footer version="1.0.0" status="online" />
      </AppShellMain>
    </AppShell>
  );
}
