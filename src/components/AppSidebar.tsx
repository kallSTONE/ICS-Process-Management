import { NavLink } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard,
  Users,
  FileText,
  DollarSign,
  History,
  LogOut,
  ClipboardList,
  Wallet,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

export function AppSidebar() {
  const { role, signOut, user } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const adminItems = [
    { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
    { title: 'Clients', url: '/clients', icon: FileText },
    { title: 'Create Client', url: '/clients/create', icon: ClipboardList },
    { title: 'Users', url: '/users', icon: Users },
    { title: 'Payments', url: '/payments', icon: DollarSign },
    { title: 'Audit History', url: '/audit', icon: History },
  ];

  const employeeItems = [
    { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
    { title: 'My Clients', url: '/my-clients', icon: FileText },
    { title: 'My History', url: '/my-history', icon: History },
  ];

  const payerItems = [
    { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
    { title: 'My Clients', url: '/my-clients', icon: FileText },
    { title: 'Payments', url: '/my-payments', icon: Wallet },
  ];

  const getMenuItems = () => {
    switch (role) {
      case 'admin':
        return adminItems;
      case 'employee':
        return employeeItems;
      case 'payer':
        return payerItems;
      default:
        return [];
    }
  };

  const menuItems = getMenuItems();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-4">
          <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <span className="font-semibold text-lg text-foreground">PassportFlow</span>
              <p className="text-muted-foreground text-sm">{user.user_metadata.name}</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'hover:bg-sidebar-accent/50'
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => signOut()}>
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Logout</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
