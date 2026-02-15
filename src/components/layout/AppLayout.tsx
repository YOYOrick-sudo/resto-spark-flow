import { ReactNode, useState, useEffect, forwardRef } from 'react';
import { NestoSidebar } from './NestoSidebar';
import { CommandPalette } from './CommandPalette';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NestoLogo } from '@/components/polar/NestoLogo';

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = forwardRef<HTMLDivElement, AppLayoutProps>(
  function AppLayout({ children }, ref) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [commandOpen, setCommandOpen] = useState(false);

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

    return (
      <div ref={ref} className="h-screen flex w-full bg-card overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-60 flex-shrink-0 sticky top-0 h-screen">
          <NestoSidebar onSearchClick={() => setCommandOpen(true)} />
        </aside>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-foreground/20 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-60 transform transition-transform duration-200 ease-in-out lg:hidden ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <NestoSidebar onNavigate={() => setMobileMenuOpen(false)} onSearchClick={() => setCommandOpen(true)} />
        </aside>

        <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Mobile Header */}
          <header className="lg:hidden flex items-center h-14 px-4 border-b border-border bg-secondary">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Sluit menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>
            <span className="ml-3"><NestoLogo size="sm" showIcon={false} /></span>
          </header>

          {/* Page Content */}
          <div className="flex-1 py-6 px-8 lg:py-8 lg:px-12 xl:px-16 overflow-auto scroll-smooth">
            {children}
          </div>
        </main>
      </div>
    );
  }
);
