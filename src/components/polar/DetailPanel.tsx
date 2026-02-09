import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface DetailPanelProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: string;
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setIsDesktop(mql.matches);
    mql.addEventListener('change', onChange);
    setIsDesktop(mql.matches);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return !!isDesktop;
}

export function DetailPanel({
  open,
  onClose,
  title,
  children,
  width = 'w-[460px]',
}: DetailPanelProps) {
  const isDesktop = useIsDesktop();

  if (!open) return null;

  // Desktop: inline panel
  if (isDesktop) {
    return (
      <div
        className={cn(
          'flex flex-col border-l border-border/50 bg-background overflow-hidden flex-shrink-0',
          'animate-in slide-in-from-right-4 duration-200',
          width
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          {title && (
            <h2 className="text-base font-semibold truncate pr-2">{title}</h2>
          )}
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-secondary transition-colors flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    );
  }

  // Tablet/mobile: Sheet fallback
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-[460px] p-0 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          {title && (
            <h2 className="text-base font-semibold truncate pr-2">{title}</h2>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
