"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface AppShellContextValue {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isMobile: boolean;
}

const AppShellContext = React.createContext<AppShellContextValue | undefined>(
  undefined
);

export function useAppShell() {
  const context = React.useContext(AppShellContext);
  if (!context) {
    throw new Error("useAppShell must be used within an AppShell");
  }
  return context;
}

interface AppShellProps {
  children: React.ReactNode;
  className?: string;
  defaultSidebarOpen?: boolean;
}

export function AppShell({
  children,
  className,
  defaultSidebarOpen = true,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(defaultSidebarOpen);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <AppShellContext.Provider value={{ sidebarOpen, setSidebarOpen, isMobile }}>
      <div className={cn("flex h-screen w-full overflow-hidden", className)}>
        {children}
      </div>
    </AppShellContext.Provider>
  );
}

interface AppShellSidebarProps {
  children: React.ReactNode;
  className?: string;
}

export function AppShellSidebar({ children, className }: AppShellSidebarProps) {
  const { sidebarOpen, setSidebarOpen, isMobile } = useAppShell();

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 ease-in-out lg:relative lg:z-auto lg:translate-x-0",
          isMobile && !sidebarOpen && "-translate-x-full",
          className
        )}
      >
        {children}
      </aside>
    </>
  );
}

interface AppShellMainProps {
  children: React.ReactNode;
  className?: string;
}

export function AppShellMain({ children, className }: AppShellMainProps) {
  return (
    <main
      className={cn(
        "flex flex-1 flex-col overflow-hidden bg-background",
        className
      )}
    >
      {children}
    </main>
  );
}

interface AppShellContentProps {
  children: React.ReactNode;
  className?: string;
}

export function AppShellContent({ children, className }: AppShellContentProps) {
  return (
    <div className={cn("flex-1 overflow-auto", className)}>{children}</div>
  );
}

