import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronDown, Zap, PanelLeft, Sun, Moon, Monitor, HelpCircle, BookOpen } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { menuItems, getActiveItemFromPath, getExpandedGroupFromPath } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import * as Collapsible from '@radix-ui/react-collapsible';

interface NestoSidebarProps {
  onNavigate?: () => void;
  unreadNotifications?: number;
}

export function NestoSidebar({ onNavigate, unreadNotifications = 0 }: NestoSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, resolvedTheme } = useTheme();
  
  // Initialize with correct group already expanded (no useEffect flash)
  const [expandedGroups, setExpandedGroups] = useState<string[]>(() => {
    const group = getExpandedGroupFromPath(location.pathname);
    return group ? [group] : [];
  });
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const activeItemId = getActiveItemFromPath(location.pathname);

  // Sync expanded groups with current route - collapse others when navigating away
  useEffect(() => {
    const groupToExpand = getExpandedGroupFromPath(location.pathname);
    
    if (groupToExpand) {
      // Route within a group: keep only that group expanded
      setExpandedGroups((prev) => {
        if (prev.length === 1 && prev[0] === groupToExpand) return prev;
        return [groupToExpand];
      });
    } else {
      // Top-level route: collapse all groups
      setExpandedGroups((prev) => prev.length === 0 ? prev : []);
    }
  }, [location.pathname]);

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  }, []);

  const handleNavigation = useCallback((path: string) => {
    // Guard: don't navigate if already on this path
    if (location.pathname === path) {
      return;
    }
    navigate(path);
    onNavigate?.();
  }, [location.pathname, navigate, onNavigate]);

  // Handle click on expandable parent: navigate to first sub-item
  const handleExpandableClick = useCallback((item: typeof menuItems[0]) => {
    // Find first non-disabled subitem and navigate
    const firstActiveSubItem = item.subItems?.find(
      (sub) => !sub.disabled && sub.path
    );
    
    if (firstActiveSubItem?.path && location.pathname !== firstActiveSubItem.path) {
      navigate(firstActiveSubItem.path);
      onNavigate?.();
    }
  }, [location.pathname, navigate, onNavigate]);

  return (
    <div className="h-full w-60 flex flex-col bg-secondary border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          {/* Logo - text fallback until PNG is uploaded */}
          <span 
            className="text-2xl font-bold text-foreground"
            style={{ 
              fontFamily: 'Inter, sans-serif',
              height: '40px', 
              display: 'flex', 
              alignItems: 'center' 
            }}
          >
            nesto
          </span>
          
          {/* Quick action buttons - Zap + PanelLeft (Figma spec) */}
          <div className="flex items-center gap-1">
            {/* Zap button - Notifications */}
            <button
              type="button"
              className={cn(
                'w-8 h-8 flex items-center justify-center rounded-md transition-colors relative',
                hoveredButton === 'zap' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground'
              )}
              onMouseEnter={() => setHoveredButton('zap')}
              onMouseLeave={() => setHoveredButton(null)}
              aria-label="Notificaties"
            >
              <Zap size={18} />
              {unreadNotifications > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
              )}
            </button>
            
            {/* PanelLeft button - Panel toggle */}
            <button
              type="button"
              className={cn(
                'w-8 h-8 flex items-center justify-center rounded-md transition-colors',
                hoveredButton === 'panel' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground'
              )}
              onMouseEnter={() => setHoveredButton('panel')}
              onMouseLeave={() => setHoveredButton(null)}
              aria-label="Panel"
            >
              <PanelLeft size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        <ul className="space-y-0.5 px-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isExpanded = expandedGroups.includes(item.id);
            const isActive = activeItemId === item.id;
            const hasActiveChild = item.subItems?.some((sub) => activeItemId === sub.id);

            // Expandable group
            if (item.expandable && item.subItems) {
              // Keep open if expanded OR if it has an active child
              const isOpen = isExpanded || hasActiveChild;
              
              return (
                <li key={item.id}>
                  <Collapsible.Root
                    open={isOpen}
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
                          'group w-full flex items-center gap-3 px-2.5 py-[7px] rounded-lg text-sm transition-colors duration-150',
                          'border',
                          hasActiveChild
                            ? 'bg-card border-border text-foreground font-medium'
                            : 'border-transparent text-muted-foreground font-medium hover:text-foreground'
                        )}
                      >
                        <Icon size={18} className={cn("flex-shrink-0 transition-colors", hasActiveChild ? "text-primary" : "group-hover:text-foreground")} />
                        <span className="flex-1 text-left">{item.label}</span>
                        <ChevronDown 
                          size={16} 
                          className={cn(
                            'text-muted-foreground transition-transform duration-200',
                            isExpanded && 'rotate-180'
                          )} 
                        />
                      </button>
                    </Collapsible.Trigger>
                    
                    <Collapsible.Content className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
                      <div className="relative ml-[23px] mt-1 pl-3 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[1.5px] before:bg-border dark:before:bg-muted-foreground/40">
                        <ul className="space-y-0.5">
                          {item.subItems.map((subItem) => {
                            const isSubActive = activeItemId === subItem.id;
                            
                            if (subItem.disabled) {
                              return (
                                <li key={subItem.id}>
                                  <div className="flex items-center gap-3 px-2.5 py-[7px] text-sm text-muted-foreground cursor-not-allowed border border-transparent">
                                    <span>{subItem.label}</span>
                                    <span className="ml-auto text-[11px] font-medium px-2 py-0.5 rounded bg-[rgba(29,151,158,0.15)] text-[#1d979e]">
                                      Soon
                                    </span>
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
                                    'w-full flex items-center px-2.5 py-[7px] text-sm transition-colors duration-150 rounded-lg',
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
                </li>
              );
            }

            // Disabled item
            if (item.disabled) {
              return (
                <li key={item.id}>
                  <div className="flex items-center gap-3 px-2.5 py-[7px] text-sm text-muted-foreground cursor-not-allowed">
                    <Icon size={18} className="flex-shrink-0" />
                    <span>{item.label}</span>
                    <span className="ml-auto text-[11px] font-medium px-2 py-0.5 rounded bg-[rgba(29,151,158,0.15)] text-[#1d979e]">
                      Soon
                    </span>
                  </div>
                </li>
              );
            }

            // Regular link item
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (item.path) handleNavigation(item.path);
                  }}
                  className={cn(
                    'group w-full flex items-center gap-3 px-2.5 py-[7px] rounded-lg text-sm transition-colors duration-150',
                    'border border-transparent',
                    isActive
                      ? 'bg-card border-border text-foreground font-medium'
                      : 'text-muted-foreground font-medium hover:text-foreground'
                  )}
                >
                  <Icon size={18} className={cn("flex-shrink-0 transition-colors", isActive ? "text-primary" : "group-hover:text-foreground")} />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Support & Documentation Section */}
      <div className="px-3 py-3 border-t border-border">
        <div className="space-y-0.5">
          {/* Support Item - disabled */}
          <div className="flex items-center gap-3 px-2.5 py-[7px] text-sm text-muted-foreground cursor-not-allowed">
            <HelpCircle size={18} className="flex-shrink-0" />
            <span>Support</span>
            <span className="ml-auto text-[11px] font-medium px-2 py-0.5 rounded bg-[rgba(29,151,158,0.15)] text-[#1d979e]">
              Soon
            </span>
          </div>
          
          {/* Documentatie Item - disabled */}
          <div className="flex items-center gap-3 px-2.5 py-[7px] text-sm text-muted-foreground cursor-not-allowed">
            <BookOpen size={18} className="flex-shrink-0" />
            <span>Documentatie</span>
            <span className="ml-auto text-[11px] font-medium px-2 py-0.5 rounded bg-[rgba(29,151,158,0.15)] text-[#1d979e]">
              Soon
            </span>
          </div>
        </div>
      </div>

      {/* Footer - Theme Indicator (NOT clickable) */}
      <div className="px-4 py-3 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 flex items-center justify-center rounded bg-muted">
            {theme === 'light' && <Sun size={14} />}
            {theme === 'dark' && <Moon size={14} />}
            {theme === 'system' && <Monitor size={14} />}
          </div>
          <span className="text-[13px] text-muted-foreground">
            {theme === 'light' ? 'Licht' : theme === 'dark' ? 'Donker' : 'Systeem'}
          </span>
        </div>
        
        {/* Show effective theme when system */}
        {theme === 'system' && (
          <span className="text-sm">
            {resolvedTheme === 'dark' ? '🌙' : '☀️'}
          </span>
        )}
      </div>
    </div>
  );
}
