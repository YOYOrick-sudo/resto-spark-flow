import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, Zap, PanelLeft, Search, Building2 } from 'lucide-react';
import { menuItems, getActiveItemFromPath, getExpandedGroupFromPath, MenuItem } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import * as Collapsible from '@radix-ui/react-collapsible';

import { mockAssistantItems } from '@/data/assistantMockData';
import { CommandPalette } from './CommandPalette';

interface NestoSidebarProps {
  onNavigate?: () => void;
  unreadNotifications?: number;
}

export function NestoSidebar({ onNavigate, unreadNotifications = 0 }: NestoSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [expandedGroups, setExpandedGroups] = useState<string[]>(() => {
    const group = getExpandedGroupFromPath(location.pathname);
    return group ? [group] : [];
  });
  const [commandOpen, setCommandOpen] = useState(false);
  const activeItemId = getActiveItemFromPath(location.pathname);

  const hasAttentionSignals = useMemo(() => 
    mockAssistantItems.some(item => item.actionable && (item.severity === 'error' || item.severity === 'warning')),
    []
  );

  useEffect(() => {
    const groupToExpand = getExpandedGroupFromPath(location.pathname);
    if (groupToExpand) {
      setExpandedGroups((prev) => {
        if (prev.length === 1 && prev[0] === groupToExpand) return prev;
        return [groupToExpand];
      });
    } else {
      setExpandedGroups((prev) => prev.length === 0 ? prev : []);
    }
  }, [location.pathname]);

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

  const handleNavigation = useCallback((path: string) => {
    if (location.pathname === path) return;
    navigate(path);
    onNavigate?.();
  }, [location.pathname, navigate, onNavigate]);

  const handleExpandableClick = useCallback((item: MenuItem) => {
    const firstActiveSubItem = item.subItems?.find((sub) => !sub.disabled && sub.path);
    if (firstActiveSubItem?.path && location.pathname !== firstActiveSubItem.path) {
      navigate(firstActiveSubItem.path);
      onNavigate?.();
    }
  }, [location.pathname, navigate, onNavigate]);

  return (
    <div className="h-full w-60 flex flex-col bg-secondary border-r border-border">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <span 
            className="text-xl font-extrabold tracking-tight text-foreground"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            nesto
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="p-1 rounded-md transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-0 relative"
              aria-label="Notificaties"
            >
              <Zap size={18} strokeWidth={0} className="fill-foreground" />
              {unreadNotifications > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
              )}
            </button>
            <button
              type="button"
              className="p-1 rounded-md transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-0"
              aria-label="Panel"
            >
              <PanelLeft size={18} strokeWidth={2} className="text-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="px-4 mt-2 mb-4">
        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          className="relative group w-full"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <div className="w-full h-9 pl-9 pr-12 bg-background border-[1.5px] border-border rounded-lg text-sm text-muted-foreground flex items-center hover:border-primary/40 transition-colors">
            Zoeken...
          </div>
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground bg-background border border-border px-1.5 py-0.5 rounded-md pointer-events-none">
            ⌘K
          </span>
        </button>
      </div>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        <ul className="px-2">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isExpanded = expandedGroups.includes(item.id);
            const isActive = activeItemId === item.id;
            const hasActiveChild = item.subItems?.some((sub) => activeItemId === sub.id);
            const prevItem = index > 0 ? menuItems[index - 1] : null;
            const showSectionLabel = item.section && (!prevItem || prevItem.section !== item.section);

            return (
              <li key={item.id}>
                {/* Section label */}
                {showSectionLabel && (
                  <div className="px-3 pt-5 pb-1">
                    <span className="text-[11px] font-medium text-muted-foreground/60 tracking-widest uppercase">
                      {item.section}
                    </span>
                  </div>
                )}

                {/* Expandable group */}
                {item.expandable && item.subItems ? (
                  <Collapsible.Root
                    open={isExpanded || !!hasActiveChild}
                    onOpenChange={(nextOpen) => {
                      setExpandedGroups((prev) =>
                        nextOpen
                          ? prev.includes(item.id) ? prev : [...prev, item.id]
                          : prev.filter((id) => id !== item.id)
                      );
                    }}
                  >
                    <Collapsible.Trigger asChild>
                      <button
                        type="button"
                        onClick={() => handleExpandableClick(item)}
                        className={cn(
                          'group w-full flex items-center gap-3 px-2.5 py-[5px] rounded-lg text-[13px] transition-colors duration-150',
                          'border',
                          hasActiveChild
                            ? 'bg-card border-border text-foreground font-medium'
                            : 'border-transparent text-muted-foreground font-medium hover:text-foreground'
                        )}
                      >
                        <Icon size={16} className={cn("flex-shrink-0 transition-colors", hasActiveChild ? "text-primary" : "group-hover:text-foreground")} />
                        <span className="flex-1 text-left">{item.label}</span>
                        <ChevronDown 
                          size={16} 
                          className={cn(
                            'text-muted-foreground transition-transform duration-200',
                            (isExpanded || hasActiveChild) && 'rotate-180'
                          )} 
                        />
                      </button>
                    </Collapsible.Trigger>
                    
                    <Collapsible.Content className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
                      <div className="relative ml-[23px] mt-1 pl-3 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-px before:bg-muted-foreground/25 dark:before:bg-muted-foreground/50">
                        <ul className="space-y-0.5">
                          {item.subItems.map((subItem) => {
                            const isSubActive = activeItemId === subItem.id;
                            
                            if (subItem.disabled) {
                              return (
                                <li key={subItem.id}>
                                  <div className="flex items-center gap-3 px-2.5 py-[5px] text-[13px] text-muted-foreground opacity-40 cursor-default border border-transparent">
                                    <span>{subItem.label}</span>
                                  </div>
                                </li>
                              );
                            }

                            return (
                              <li key={subItem.id}>
                                <button
                                  type="button"
                                  onClick={() => subItem.path && handleNavigation(subItem.path)}
                                  className={cn(
                                    'w-full flex items-center px-2.5 py-[5px] text-[13px] transition-colors duration-150 rounded-lg',
                                    'border border-transparent',
                                    isSubActive
                                      ? 'text-[#1d979e] font-medium hover:text-[#1d979e]'
                                      : 'text-muted-foreground font-medium hover:text-foreground'
                                  )}
                                >
                                  {subItem.label}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </Collapsible.Content>
                  </Collapsible.Root>
                ) : item.disabled ? (
                  /* Disabled item */
                  <div className="flex items-center gap-3 px-2.5 py-[5px] text-[13px] text-muted-foreground opacity-40 cursor-default">
                    <Icon size={16} className="flex-shrink-0" />
                    <span>{item.label}</span>
                  </div>
                ) : (
                  /* Regular link item */
                  <button
                    type="button"
                    onClick={() => { if (item.path) handleNavigation(item.path); }}
                    className={cn(
                      'group w-full flex items-center gap-3 px-2.5 py-[5px] rounded-lg text-[13px] transition-colors duration-150',
                      'border border-transparent',
                      isActive
                        ? 'bg-card border-border text-foreground font-medium'
                        : 'text-muted-foreground font-medium hover:text-foreground'
                    )}
                  >
                    <Icon size={16} className={cn("flex-shrink-0 transition-colors", isActive ? "text-primary" : "group-hover:text-foreground")} />
                    <span>{item.label}</span>
                    {item.id === 'assistent' && hasAttentionSignals && (
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 ml-auto flex-shrink-0" />
                    )}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-3 pt-3 pb-3 space-y-2">
        <div className="flex items-center gap-2 px-2.5">
          <Building2 size={16} className="text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-medium text-foreground truncate">Restaurant Demo</span>
        </div>
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center flex-shrink-0">
            JD
          </div>
          <span className="text-sm text-foreground truncate flex-1">Jan de Vries</span>
          <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" />
        </div>
      </div>
    </div>
  );
}
