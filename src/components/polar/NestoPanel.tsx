import { useRef, useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export interface NestoPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  footer?: React.ReactNode;
  children: (titleRef: React.RefObject<HTMLHeadingElement>) => React.ReactNode;
  width?: string;
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setIsDesktop(mql.matches);
    mql.addEventListener('change', onChange);
    setIsDesktop(mql.matches);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return isDesktop;
}

export function NestoPanel({ open, onClose, title, footer, children, width = 'w-[460px]' }: NestoPanelProps) {
  const isDesktop = useIsDesktop();
  const [titleVisible, setTitleVisible] = useState(true);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset title visibility when panel opens
  useEffect(() => {
    if (open) setTitleVisible(true);
  }, [open]);

  // IntersectionObserver for reveal header
  useEffect(() => {
    if (!open) return;
    const titleEl = titleRef.current;
    const scrollEl = scrollRef.current;
    if (!titleEl || !scrollEl) return;

    const observer = new IntersectionObserver(
      ([entry]) => setTitleVisible(entry.isIntersecting),
      { root: scrollEl, threshold: 0 }
    );
    observer.observe(titleEl);
    return () => observer.disconnect();
  }, [open]);

  if (!open) return null;

  const panelContent = (
    <div className="relative flex flex-col h-full">
      {/* Reveal header — appears when in-content title scrolls out */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 z-10 h-10 flex items-center justify-between px-5 bg-card/95 backdrop-blur-[2px] transition-all duration-200",
          titleVisible
            ? "opacity-0 -translate-y-0.5 pointer-events-none"
            : "opacity-100 translate-y-0 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
        )}
      >
        <span className="text-[13px] font-medium text-foreground truncate pr-8">{title}</span>
        <button
          onClick={onClose}
          className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted/50 transition-colors shrink-0"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Floating close button (visible when title is in view) */}
      <button
        onClick={onClose}
        className={cn(
          "absolute top-4 right-4 z-10 h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted/50 transition-all duration-150",
          titleVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Scrollable content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {children(titleRef)}
      </div>

      {/* Fixed footer */}
      {footer && (
        <div className="px-5 py-4 border-t border-border/50 bg-card">
          {footer}
        </div>
      )}
    </div>
  );

  // Desktop: fixed overlay panel
  if (isDesktop) {
    return (
      <>
        <div
          className="fixed inset-0 z-40 bg-black/20 animate-in fade-in duration-200"
          onClick={onClose}
        />
        <div
          className={cn(
            'fixed top-0 right-0 bottom-0 z-40 flex flex-col bg-card overflow-hidden',
            'border-l border-border/50 shadow-xl rounded-l-2xl',
            'animate-in slide-in-from-right-4 duration-200',
            width
          )}
        >
          {panelContent}
        </div>
      </>
    );
  }

  // Mobile: Sheet fallback
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className={cn("p-0 flex flex-col", `w-full sm:max-w-[460px]`)}>
        {panelContent}
      </SheetContent>
    </Sheet>
  );
}
