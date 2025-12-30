import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronDown, Zap, PanelLeft, Sun, Moon, Monitor, HelpCircle, BookOpen } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { menuItems, getActiveItemFromPath, getExpandedGroupFromPath } from '@/lib/navigation';
import { cn } from '@/lib/utils';

interface NestoSidebarProps {
  onNavigate?: () => void;
  unreadNotifications?: number;
}

export function NestoSidebar({ onNavigate, unreadNotifications = 0 }: NestoSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, resolvedTheme } = useTheme();
  
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['kitchen']);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const activeItemId = getActiveItemFromPath(location.pathname);

  // Auto-expand group based on current route
  useEffect(() => {
    const groupToExpand = getExpandedGroupFromPath(location.pathname);
    if (groupToExpand && !expandedGroups.includes(groupToExpand)) {
      setExpandedGroups((prev) => [...prev, groupToExpand]);
    }
  }, [location.pathname]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  return (
    <div className="h-full w-60 flex flex-col bg-card border-r border-border">
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
              return (
                <li key={item.id}>
                  <button
                    onClick={() => toggleGroup(item.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      hasActiveChild
                        ? 'text-[#1d979e]'
                        : 'text-foreground hover:bg-[hsl(var(--border-subtle))]'
                    )}
                  >
                    <Icon size={18} className="flex-shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {isExpanded ? (
                      <ChevronDown size={16} className="text-muted-foreground transition-transform duration-200" />
                    ) : (
                      <ChevronRight size={16} className="text-muted-foreground transition-transform duration-200" />
                    )}
                  </button>
                  
                  {/* Sub-items */}
                  {isExpanded && (
                    <ul className="mt-0.5 space-y-0.5">
                      {item.subItems.map((subItem) => {
                        const isSubActive = activeItemId === subItem.id;
                        
                        if (subItem.disabled) {
                          return (
                            <li key={subItem.id}>
                              <div className="flex items-center gap-3 pl-[42px] pr-3 py-2 text-sm text-muted-foreground cursor-not-allowed">
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
                              onClick={() => subItem.path && handleNavigation(subItem.path)}
                              className={cn(
                                'w-full flex items-center pl-[42px] pr-3 py-2 text-sm transition-colors rounded-lg',
                                isSubActive
                                  ? 'bg-background border border-border text-[#1d979e] font-medium'
                                  : 'text-muted-foreground hover:bg-[hsl(var(--border-subtle))]'
                              )}
                            >
                              {subItem.label}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            }

            // Disabled item
            if (item.disabled) {
              return (
                <li key={item.id}>
                  <div className="flex items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground cursor-not-allowed">
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
                  onClick={() => item.path && handleNavigation(item.path)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-background border border-border text-[#1d979e]'
                      : 'text-foreground hover:bg-[hsl(var(--border-subtle))]'
                  )}
                >
                  <Icon size={18} className="flex-shrink-0" />
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
          <div className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground cursor-not-allowed">
            <HelpCircle size={18} className="flex-shrink-0" />
            <span>Support</span>
            <span className="ml-auto text-[11px] font-medium px-2 py-0.5 rounded bg-[rgba(29,151,158,0.15)] text-[#1d979e]">
              Soon
            </span>
          </div>
          
          {/* Documentatie Item - disabled */}
          <div className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground cursor-not-allowed">
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
