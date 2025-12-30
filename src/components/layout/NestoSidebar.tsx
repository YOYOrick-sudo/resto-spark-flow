import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronDown, Bell, Grid, HelpCircle, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { menuItems, getActiveItemFromPath, getExpandedGroupFromPath } from '@/lib/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface NestoSidebarProps {
  onNavigate?: () => void;
}

export function NestoSidebar({ onNavigate }: NestoSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['kitchen']);
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

  const themeOptions = [
    { value: 'light', label: 'Licht', icon: Sun },
    { value: 'dark', label: 'Donker', icon: Moon },
    { value: 'system', label: 'Systeem', icon: Monitor },
  ] as const;

  const currentTheme = themeOptions.find((opt) => opt.value === theme) || themeOptions[0];

  return (
    <div className="h-full w-60 flex flex-col bg-card border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          {/* Logo - text fallback until PNG is uploaded */}
          <span className="text-2xl font-semibold text-primary">nesto</span>
          
          {/* Quick action buttons */}
          <div className="flex items-center gap-1">
            <button
              className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              aria-label="Notificaties"
            >
              <Bell size={18} />
            </button>
            <button
              className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              aria-label="Apps"
            >
              <Grid size={18} />
            </button>
            <button
              className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              aria-label="Help"
            >
              <HelpCircle size={18} />
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
                        ? 'text-primary bg-[hsl(var(--selected-background))]'
                        : 'text-foreground hover:bg-accent'
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
                                <span className="ml-auto text-[10px] font-semibold text-pending bg-pending/10 px-1.5 py-0.5 rounded">
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
                                  ? 'text-primary font-medium bg-[hsl(var(--selected-background))] border-l-[3px] border-primary ml-0 pl-[39px]'
                                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
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
                    <span className="ml-auto text-[10px] font-semibold text-pending bg-pending/10 px-1.5 py-0.5 rounded">
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
                      ? 'text-primary bg-[hsl(var(--selected-background))] border-l-[3px] border-primary pl-[9px]'
                      : 'text-foreground hover:bg-accent'
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

      {/* Footer - Theme Toggle */}
      <div className="p-3 border-t border-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
              <currentTheme.icon size={18} />
              <span>{currentTheme.label}</span>
              <ChevronDown size={16} className="ml-auto" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[200px]">
            {themeOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => setTheme(option.value)}
                className={cn(
                  'flex items-center gap-2',
                  theme === option.value && 'bg-accent'
                )}
              >
                <option.icon size={16} />
                <span>{option.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
