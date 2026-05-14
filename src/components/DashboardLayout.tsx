import { ReactNode } from 'react';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import ThemeToggle from './ThemeToggle';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider className="min-h-screen w-full">
      <AppSidebar />
      <SidebarInset className="min-h-screen w-full">
        <header className="h-14 border-b bg-card flex items-center px-4 sticky top-0 z-10">
          <SidebarTrigger />
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>
        <div className="p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
