import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, Zap, PanelLeft, Search, Building2 } from 'lucide-react';
import { menuItems, getActiveItemFromPath, getExpandedGroupFromPath, MenuItem } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { useSignals } from '@/hooks/useSignals';
import { NestoLogo } from '@/components/polar/NestoLogo';


interface NestoSidebarProps {
  onNavigate?: () => void;
  onSearchClick?: () => void;
  unreadNotifications?: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

function ExpandableContent({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [maxHeight, setMaxHeight] = useState<string>(isOpen ? 'none' : '0px');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (isOpen) {
      setMaxHeight(el.scrollHeight + 'px');
      // After transition, remove max-height constraint so content can grow dynamically
      const timer = setTimeout(() => setMaxHeight('none'), 200);
      return () => clearTimeout(timer);
    } else {
      // Force a reflow: set to current height first, then to 0
      setMaxHeight(el.scrollHeight + 'px');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setMaxHeight('0px');
        });
      });
    }
  }, [isOpen]);

  return (
    <div
      ref={ref}
      style={{
        maxHeight,
        overflow: 'hidden',
        transition: 'max-height 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {children}
    </div>
  );
}

export function NestoSidebar({ onNavigate, onSearchClick, unreadNotifications = 0, collapsed, onToggleCollapse }: NestoSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [expandedModule, setExpandedModule] = useState<string | null>(() => {
    return getExpandedGroupFromPath(location.pathname);
  });
  
  const activeItemId = getActiveItemFromPath(location.pathname);

  const { signals } = useSignals();
  const hasAttentionSignals = useMemo(() => 
    signals.some(item => item.actionable && (item.severity === 'error' || item.severity === 'warning')),
    [signals]
  );

  useEffect(() => {
    const groupToExpand = getExpandedGroupFromPath(location.pathname);
    setExpandedModule(groupToExpand);
  }, [location.pathname]);

  const handleNavigation = useCallback((path: string) => {
    if (location.pathname === path) return;
    navigate(path);
    onNavigate?.();
  }, [location.pathname, navigate, onNavigate]);

  const handleExpandableClick = useCallback((item: MenuItem) => {
    // Toggle: if same module, close it; otherwise open the new one
    setExpandedModule(prev => prev === item.id ? null : item.id);
    
    const firstActiveSubItem = item.subItems?.find((sub) => !sub.disabled && sub.path);
    if (firstActiveSubItem?.path && location.pathname !== firstActiveSubItem.path) {
      navigate(firstActiveSubItem.path);
      onNavigate?.();
    }
  }, [location.pathname, navigate, onNavigate]);

  return (
    <div className={cn(
      "h-full flex flex-col bg-secondary border-r border-border transition-all duration-200",
      collapsed ? "w-14" : "w-60"
    )}>
      {/* Header */}
      <div className={cn("p-4", collapsed && "px-2 py-4 flex justify-center")}>
        {collapsed ? (
          <NestoLogo size="sm" showWordmark={false} />
        ) : (
          <div className="flex items-center justify-between">
            <NestoLogo size="md" />
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="p-1 rounded-md transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 relative"
                aria-label="Notificaties"
              >
                <Zap size={18} strokeWidth={0} className="fill-foreground" />
                {unreadNotifications > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
                )}
              </button>
              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-1 rounded-md transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Sidebar inklappen"
              >
                <PanelLeft size={18} strokeWidth={2} className="text-foreground" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Search bar - hidden when collapsed */}
      {!collapsed && (
        <div className="px-4 mt-2 mb-4">
          <button
            type="button"
            onClick={() => onSearchClick?.()}
            className="relative group w-full"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <div className="w-full h-9 pl-9 pr-12 bg-background border-[1.5px] border-border rounded-lg text-sm text-muted-foreground flex items-center hover:border-primary/40 transition-colors">
              Zoeken...
            </div>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-caption text-muted-foreground bg-background border border-border px-1.5 py-0.5 rounded-md pointer-events-none">
              ⌘K
            </span>
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        <ul className={cn("px-2", collapsed && "px-1")}>
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isExpanded = expandedModule === item.id;
            const isActive = activeItemId === item.id;
            const hasActiveChild = item.subItems?.some((sub) => activeItemId === sub.id);
            const prevItem = index > 0 ? menuItems[index - 1] : null;
            const showSectionLabel = item.section && (!prevItem || prevItem.section !== item.section);

            // Collapsed mode: icon-only with tooltip
            if (collapsed) {
              const isItemActive = isActive || hasActiveChild;
              const path = item.path || item.subItems?.find((s) => !s.disabled && s.path)?.path;

              if (item.disabled) {
                return (
                  <li key={item.id}>
                    {showSectionLabel && <div className="pt-3" />}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-center py-1.5 opacity-40 cursor-default">
                          <Icon size={16} className="text-muted-foreground" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={8}>Binnenkort beschikbaar</TooltipContent>
                    </Tooltip>
                  </li>
                );
              }

              return (
                <li key={item.id}>
                  {showSectionLabel && <div className="pt-3" />}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => path && handleNavigation(path)}
                        className={cn(
                          'w-full flex items-center justify-center py-1.5 rounded-lg transition-colors duration-200',
                          'border focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none',
                          isItemActive
                            ? 'bg-card border-border text-foreground'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <Icon size={16} className={cn("flex-shrink-0", isItemActive && "text-primary")} />
                        {item.id === 'assistent' && hasAttentionSignals && (
                          <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-warning" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                </li>
              );
            }

            // Expanded mode
            return (
              <li key={item.id}>
                {/* Section label */}
                {showSectionLabel && (
                  <div className="px-3 pt-5 pb-1">
                    <span className="text-caption text-muted-foreground/60 tracking-widest uppercase">
                      {item.section}
                    </span>
                  </div>
                )}

                {/* Expandable group */}
                {item.expandable && item.subItems ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleExpandableClick(item)}
                      className={cn(
                        'group w-full flex items-center gap-3 px-2.5 py-1.5 rounded-lg text-[13px] transition-colors duration-200',
                        'border focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none',
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
                          (isExpanded || hasActiveChild) ? 'rotate-90' : 'rotate-0'
                        )}
                        style={{ transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}
                      />
                    </button>
                    
                    <ExpandableContent isOpen={isExpanded || !!hasActiveChild}>
                      <div className="relative ml-[23px] mt-1 pl-3 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-px before:bg-muted-foreground/25 dark:before:bg-muted-foreground/50">
                        <ul>
                          {item.subItems.map((subItem) => {
                            const isSubActive = activeItemId === subItem.id;
                            
                            if (subItem.disabled) {
                              return (
                                <li key={subItem.id}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center gap-3 px-2.5 py-1 text-[13px] text-muted-foreground opacity-40 cursor-default border border-transparent">
                                        <span>{subItem.label}</span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" sideOffset={8}>Binnenkort beschikbaar</TooltipContent>
                                  </Tooltip>
                                </li>
                              );
                            }

                            return (
                              <li key={subItem.id}>
                                <button
                                  type="button"
                                  onClick={() => subItem.path && handleNavigation(subItem.path)}
                                  className={cn(
                                    'w-full flex items-center px-2.5 py-1 text-[13px] transition-colors duration-200 rounded-lg',
                                    'border border-transparent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none',
                                    isSubActive
                                      ? 'text-primary font-medium hover:text-primary'
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
                    </ExpandableContent>
                  </>
                ) : item.disabled ? (
                  /* Disabled item */
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-3 px-2.5 py-1.5 text-[13px] text-muted-foreground opacity-40 cursor-default">
                        <Icon size={16} className="flex-shrink-0" />
                        <span>{item.label}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>Binnenkort beschikbaar</TooltipContent>
                  </Tooltip>
                ) : (
                  /* Regular link item */
                  <button
                    type="button"
                    onClick={() => { if (item.path) handleNavigation(item.path); }}
                    className={cn(
                      'group w-full flex items-center gap-3 px-2.5 py-1.5 rounded-lg text-[13px] transition-colors duration-200',
                      'border border-transparent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none',
                      isActive
                        ? 'bg-card border-border text-foreground font-medium'
                        : 'text-muted-foreground font-medium hover:text-foreground'
                    )}
                  >
                    <Icon size={16} className={cn("flex-shrink-0 transition-colors", isActive ? "text-primary" : "group-hover:text-foreground")} />
                    <span>{item.label}</span>
                    {item.id === 'assistent' && hasAttentionSignals && (
                      <span className="w-1.5 h-1.5 rounded-full bg-warning ml-auto flex-shrink-0" />
                    )}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      {collapsed ? (
        <div className="border-t border-border px-1 py-3 flex flex-col items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                aria-label="Sidebar uitklappen"
              >
                <PanelLeft size={16} className="text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>Sidebar uitklappen</TooltipContent>
          </Tooltip>
          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center flex-shrink-0">
            JD
          </div>
        </div>
      ) : (
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
      )}
    </div>
  );
}
