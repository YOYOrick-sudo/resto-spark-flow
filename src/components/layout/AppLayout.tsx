import { ReactNode, useState, forwardRef } from 'react';
import { NestoSidebar } from './NestoSidebar';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = forwardRef<HTMLDivElement, AppLayoutProps>(
  function AppLayout({ children }, ref) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
      <div ref={ref} className="min-h-screen flex w-full bg-card">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-60 flex-shrink-0">
          <NestoSidebar />
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
          <NestoSidebar onNavigate={() => setMobileMenuOpen(false)} />
        </aside>

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
            <span className="ml-3 text-xl font-semibold text-primary">nesto</span>
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
