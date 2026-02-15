import { ReactNode, useState, useEffect, forwardRef, useCallback } from 'react';
import { NestoSidebar } from './NestoSidebar';
import { CommandPalette } from './CommandPalette';
import { Menu, X } from 'lucide-react';
import { NestoButton } from '@/components/polar/NestoButton';
import { NestoLogo } from '@/components/polar/NestoLogo';

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
    }, []);

    return (
      <div ref={ref} className="h-screen flex w-full bg-card overflow-hidden">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background focus:text-foreground focus:rounded-button">
          Ga naar inhoud
        </a>
        {/* Desktop/Tablet Sidebar */}
        <aside
          className={`hidden md:flex flex-shrink-0 sticky top-0 h-screen transition-all duration-200 ${
            sidebarCollapsed ? 'w-14' : 'w-60'
          }`}
        >
          <NestoSidebar
            collapsed={sidebarCollapsed}
            onToggleCollapse={handleToggleCollapse}
            onSearchClick={() => setCommandOpen(true)}
          />
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
          className={`fixed inset-y-0 left-0 z-50 w-60 transform transition-transform duration-200 ease-in-out md:hidden ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <NestoSidebar onNavigate={() => setMobileMenuOpen(false)} onSearchClick={() => setCommandOpen(true)} />
        </aside>

        <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Mobile Header */}
          <header className="md:hidden flex items-center h-14 px-4 border-b border-white/10 bg-[hsl(220,15%,13%)]">
            <NestoButton
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Sluit menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </NestoButton>
            <span className="ml-3"><NestoLogo size="sm" showIcon={false} variant="white" /></span>
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
    );
  }
);
