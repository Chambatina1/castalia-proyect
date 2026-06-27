import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  MessageSquare,
  FileBarChart,
  Users,
  Settings,
  Camera,
  FileText,
  Bell,
  Search,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  User as UserIcon,
  Plus,
  X,
} from 'lucide-react';

import { useAppStore, type View } from '@/store/app-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import PhotoUploadModal from '@/components/castalia/photo-upload-modal';
// PhotoLightbox disabled — has missing store props, causes runtime crash
// import PhotoLightbox from '@/components/castalia/photo-lightbox';

// ─── Nav Items ───────────────────────────────────────────────────────────────

interface NavItem {
  view: View;
  label: string;
  icon: React.ElementType;
  mobileOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { view: 'projects', label: 'Projects', icon: FolderKanban },
  { view: 'tasks', label: 'Tasks', icon: CheckSquare },
  { view: 'chat', label: 'Chat', icon: MessageSquare },
  { view: 'reports', label: 'Reports', icon: FileBarChart },
  { view: 'clients', label: 'Clients', icon: Users },
  { view: 'settings', label: 'Settings', icon: Settings },
];

const MOBILE_NAV_ITEMS = NAV_ITEMS.filter(
  (item) => !['settings', 'clients', 'reports'].includes(item.view)
);

// ─── Role Badge Config ───────────────────────────────────────────────────────

const ROLE_STYLES: Record<string, string> = {
  SUPER_ADMIN: 'bg-gold/20 text-gold-foreground border-gold/30',
  MANAGER: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30',
  EMPLOYEE: 'bg-sky-500/20 text-sky-600 border-sky-500/30',
  CLIENT: 'bg-violet-500/20 text-violet-600 border-violet-500/30',
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Admin',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee',
  CLIENT: 'Client',
};

// ─── Sidebar Nav Item ────────────────────────────────────────────────────────

function SidebarNavItem({
  item,
  active,
  collapsed,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;

  const button = (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
        active
          ? 'bg-sidebar-accent text-sidebar-primary shadow-sm'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
        collapsed && 'justify-center px-2'
      )}
    >
      {active && (
        <motion.div
          layoutId="sidebar-active-indicator"
          className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gold"
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        />
      )}
      <Icon
        className={cn(
          'h-5 w-5 shrink-0 transition-colors',
          active ? 'text-gold' : 'text-sidebar-foreground/60 group-hover:text-sidebar-foreground'
        )}
      />
      {!collapsed && (
        <motion.span
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: 'auto' }}
          exit={{ opacity: 0, width: 0 }}
          className="truncate"
        >
          {item.label}
        </motion.span>
      )}
      {active && !collapsed && (
        <motion.div
          layoutId="sidebar-active-dot"
          className="ml-auto h-1.5 w-1.5 rounded-full bg-gold"
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        />
      )}
    </button>
  );

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
}

// ─── Sidebar Content ─────────────────────────────────────────────────────────

function SidebarContent({ collapsed, onClose }: { collapsed: boolean; onClose?: () => void }) {
  const { currentView, navigateTo, currentUser, canAccess, isManagerOrAdmin, logout } = useAppStore();

  const filteredNavItems = NAV_ITEMS.filter((item) => canAccess(item.view));

  return (
    <div className="flex h-full flex-col bg-navy text-navy-foreground">
      {/* Logo */}
      <div className={cn('flex h-16 items-center gap-3 px-4 border-b border-sidebar-border', collapsed && 'justify-center px-2')}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg overflow-hidden">
          <img src="/logo-sidebar.png" alt="Castalia" className="h-9 w-9 object-contain" />
        </div>
        {!collapsed && (
          <div className="flex flex-col overflow-hidden">
            <span className="text-base font-bold tracking-tight text-navy-foreground">
              Castalia
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">
              Proyect
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-1" role="navigation" aria-label="Main navigation">
          {filteredNavItems.map((item) => (
            <SidebarNavItem
              key={item.view}
              item={item}
              active={currentView === item.view}
              collapsed={collapsed}
              onClick={() => {
                navigateTo(item.view);
                onClose?.();
              }}
            />
          ))}
        </nav>
      </ScrollArea>

      {/* User section at bottom */}
      <div className="border-t border-sidebar-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-sidebar-accent/50',
                collapsed && 'justify-center'
              )}
            >
              <Avatar className="h-8 w-8 border-2 border-gold/30">
                <AvatarImage src={currentUser?.avatar} alt={currentUser?.name} />
                <AvatarFallback className="bg-navy text-xs font-semibold text-gold">
                  {currentUser?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2) ?? 'CP'}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex flex-1 flex-col items-start overflow-hidden">
                  <span className="truncate text-sm font-medium text-navy-foreground">
                    {currentUser?.name ?? 'Guest'}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'mt-0.5 border px-1.5 py-0 text-[10px] font-semibold',
                      ROLE_STYLES[currentUser?.role ?? '']
                    )}
                  >
                    {ROLE_LABELS[currentUser?.role ?? ''] ?? 'Unknown'}
                  </Badge>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem className="gap-2">
              <UserIcon className="h-4 w-4" />
              Profile
            </DropdownMenuItem>
            {isManagerOrAdmin() && (
              <DropdownMenuItem
                className="gap-2"
                onClick={() => navigateTo('settings')}
              >
                <Settings className="h-4 w-4" />
                Settings
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 text-destructive" onClick={logout}>
              <LogOut className="h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ─── Mobile Bottom Nav ───────────────────────────────────────────────────────

function MobileBottomNav() {
  const { currentView, navigateTo, canAccess } = useAppStore();

  const items = MOBILE_NAV_ITEMS.filter((item) => canAccess(item.view));

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-border bg-background/95 backdrop-blur-md md:hidden"
      role="navigation"
      aria-label="Mobile navigation"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = currentView === item.view;

        return (
          <button
            key={item.view}
            onClick={() => navigateTo(item.view)}
            className="relative flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors"
          >
            {active && (
              <motion.div
                layoutId="mobile-nav-indicator"
                className="absolute -top-px left-2 right-2 h-0.5 rounded-full bg-gold"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <Icon
              className={cn(
                'h-5 w-5 transition-colors',
                active ? 'text-gold' : 'text-muted-foreground'
              )}
            />
            <span
              className={cn(
                'text-[10px] font-medium',
                active ? 'text-gold' : 'text-muted-foreground'
              )}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────

function AppHeader() {
  const {
    currentUser,
    navigateTo,
    unreadCount,
    searchOpen,
    searchQuery,
    toggleMobileMenu,
    toggleSearch,
    setSearch,
    isManagerOrAdmin,
    canAccess,
    logout,
  } = useAppStore();

  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      toggleSearch();
      setSearch('');
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl md:px-6">
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={toggleMobileMenu}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Search */}
      <div className="flex flex-1 items-center justify-center md:justify-start">
        <AnimatePresence mode="wait">
          {searchOpen ? (
            <motion.div
              key="search-expanded"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '100%', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex w-full items-center gap-2"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  placeholder="Search projects, tasks, clients..."
                  className="h-9 pl-9 pr-9"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  toggleSearch();
                  setSearch('');
                }}
                className="shrink-0"
              >
                Cancel
              </Button>
            </motion.div>
          ) : (
            <motion.button
              key="search-collapsed"
              onClick={toggleSearch}
              className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-border hover:bg-muted/60"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <Search className="h-4 w-4" />
              <span className="hidden md:inline">Search...</span>
              <kbd className="hidden rounded bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground md:inline">
                ⌘K
              </kbd>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Quick Actions (Desktop) */}
      <div className="hidden items-center gap-1.5 lg:flex">
        {isManagerOrAdmin() && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => navigateTo('projects')}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">New Project</span>
          </Button>
        )}
        {canAccess('photos') && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => navigateTo('photos')}
          >
            <Camera className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">Upload Photo</span>
          </Button>
        )}
        {isManagerOrAdmin() && canAccess('reports') && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => navigateTo('reports')}
          >
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">Create Report</span>
          </Button>
        )}
      </div>

      <Separator orientation="vertical" className="mx-1 hidden h-6 lg:block" />

      {/* Notifications */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive p-0 text-[10px] font-bold text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <div className="px-3 py-2 text-sm font-semibold">Notifications</div>
          <DropdownMenuSeparator />
          <div className="max-h-64 overflow-y-auto">
            {/* Notification items would be rendered here from the store */}
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              No new notifications
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* User Avatar (Desktop) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full md:hidden">
            <Avatar className="h-8 w-8 border-2 border-gold/30">
              <AvatarImage src={currentUser?.avatar} alt={currentUser?.name} />
              <AvatarFallback className="bg-navy text-xs font-semibold text-gold">
                {currentUser?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2) ?? 'CP'}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem className="gap-2">
            <UserIcon className="h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="gap-2 text-destructive" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

// ─── Main Layout ─────────────────────────────────────────────────────────────

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const {
    sidebarOpen,
    sidebarCollapsed,
    mobileMenuOpen,
    setMobileMenuOpen,
    toggleSidebarCollapse,
    currentView,
    canAccess,
  } = useAppStore();

  const isLogin = currentView === 'login';

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        {/* ── Desktop Sidebar ── */}
        <aside
          className={cn(
            'hidden h-full flex-col border-r border-sidebar-border bg-navy transition-all duration-300 lg:flex',
            sidebarCollapsed ? 'w-[68px]' : 'w-64',
            !sidebarOpen && 'hidden lg:flex' // sidebarOpen always true on desktop, but allows toggling
          )}
        >
          {/* Collapse toggle */}
          <div className="absolute right-0 top-20 z-10 hidden lg:block">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 rounded-l-none rounded-r-md border-sidebar-border bg-navy text-sidebar-foreground/60 hover:text-sidebar-foreground"
              onClick={toggleSidebarCollapse}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-3.5 w-3.5" />
              ) : (
                <PanelLeftClose className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>

          <SidebarContent collapsed={sidebarCollapsed} />
        </aside>

        {/* ── Mobile Sidebar (Sheet) ── */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="w-72 p-0">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <SidebarContent
              collapsed={false}
              onClose={() => setMobileMenuOpen(false)}
            />
          </SheetContent>
        </Sheet>

        {/* ── Main Area ── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <AppHeader />

          <main className="flex-1 overflow-y-auto pb-20 md:pb-4">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="mx-auto h-full"
            >
              {children}
            </motion.div>
          </main>
        </div>

        {/* ── Mobile Bottom Nav ── */}
        <MobileBottomNav />

        {/* ── Global Modals ── */}
        <PhotoUploadModal />
        {/* PhotoLightbox temporarily disabled */}
      </div>
    </TooltipProvider>
  );
}