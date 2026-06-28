import { ReactNode, useState, useEffect, forwardRef, useCallback } from 'react';
import { NestoSidebar } from './NestoSidebar';
import { CommandPalette } from './CommandPalette';
import { Menu, X } from 'lucide-react';
import { NestoButton } from '@/components/polar/NestoButton';
import { NestoLogo } from '@/components/polar/NestoLogo';
import { SidebarStateProvider } from '@/contexts/SidebarStateContext';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = forwardRef<HTMLDivElement, AppLayoutProps>(
  function AppLayout({ children }, ref) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [commandOpen, setCommandOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
      return typeof window !== 'undefined' && window.innerWidth < 1024;
    });
    const [sidebarHovered, setSidebarHovered] = useState(false);

    // Auto-collapse on tablet, expand on desktop
    useEffect(() => {
      const mql = window.matchMedia('(min-width: 1024px)');
      const onChange = (e: MediaQueryListEvent | MediaQueryList) => {
        setSidebarCollapsed(!e.matches);
      };
      mql.addEventListener('change', onChange as (e: MediaQueryListEvent) => void);
      return () => mql.removeEventListener('change', onChange as (e: MediaQueryListEvent) => void);
    }, []);

    useEffect(() => {
      const down = (e: KeyboardEvent) => {
        if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          setCommandOpen((prev) => !prev);
        }
      };
      document.addEventListener('keydown', down);
      return () => document.removeEventListener('keydown', down);
    }, []);

    const handleToggleCollapse = useCallback(() => {
      setSidebarCollapsed((prev) => !prev);
      setSidebarHovered(false);
    }, []);

    // Floating sidebar: when collapsed, hovering expands it as an overlay
    // (content stays in place, sidebar floats over it).
    const isOverlayExpanded = sidebarCollapsed && sidebarHovered;
    const effectiveCollapsed = sidebarCollapsed && !sidebarHovered;

    return (
      <SidebarStateProvider collapsed={sidebarCollapsed}>
      <div ref={ref} className="h-screen flex w-full bg-card overflow-hidden">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background focus:text-foreground focus:rounded-button">
          Ga naar inhoud
        </a>
        {/* Desktop/Tablet Sidebar — floating, with hover-to-expand overlay when collapsed */}
        <aside
          className={cn(
            'hidden md:block flex-shrink-0 sticky top-0 h-screen transition-[width] duration-200',
            sidebarCollapsed ? 'w-16' : 'w-64'
          )}
        >
          <div
            onMouseEnter={() => sidebarCollapsed && setSidebarHovered(true)}
            onMouseLeave={() => setSidebarHovered(false)}
            className={cn(
              'absolute top-0 left-0 h-screen p-2 z-30 transition-[width] duration-200 ease-out',
              isOverlayExpanded ? 'w-64' : sidebarCollapsed ? 'w-16' : 'w-64'
            )}
          >
            <div
              className={cn(
                'h-full overflow-hidden bg-secondary border border-border rounded-2xl transition-shadow duration-200',
                isOverlayExpanded ? 'shadow-2xl' : 'shadow-sm'
              )}
            >
              <NestoSidebar
                collapsed={effectiveCollapsed}
                onToggleCollapse={handleToggleCollapse}
                onSearchClick={() => setCommandOpen(true)}
              />
            </div>
          </div>
        </aside>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-foreground/20 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-60 p-2 transform transition-transform duration-200 ease-in-out md:hidden ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="h-full overflow-hidden bg-secondary border border-border rounded-2xl shadow-2xl">
            <NestoSidebar onNavigate={() => setMobileMenuOpen(false)} onSearchClick={() => setCommandOpen(true)} />
          </div>
        </aside>

        <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Mobile Header */}
          <header className="md:hidden flex items-center h-14 px-4 border-b border-border bg-secondary">
            <NestoButton
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Sluit menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </NestoButton>
            <span className="ml-3"><NestoLogo size="sm" showIcon={false} /></span>
          </header>

          {/* Page Content */}
          <div
            id="main-content"
            className="flex-1 py-6 px-8 lg:py-8 lg:px-12 xl:px-16 overflow-auto scroll-smooth"
          >
            {children}
          </div>
        </main>
      </div>
      </SidebarStateProvider>
    );
  }
);
