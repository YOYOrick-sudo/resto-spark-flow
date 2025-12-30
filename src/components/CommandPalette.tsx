import { useNavigate } from 'react-router-dom';
import { CornerDownLeft, LucideIcon } from 'lucide-react';
import { menuItems } from '@/lib/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

interface SearchableItem {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  parentLabel?: string;
}

/**
 * Flatten menuItems into a searchable list
 * - Skip disabled items and items without path
 * - SubItems become "Parent → Child" format
 */
function getSearchableItems(): SearchableItem[] {
  const items: SearchableItem[] = [];

  for (const item of menuItems) {
    // Skip disabled items
    if (item.disabled) continue;

    // Top-level item with path
    if (item.path && !item.expandable) {
      items.push({
        id: item.id,
        label: item.label,
        path: item.path,
        icon: item.icon,
      });
    }

    // Process subItems
    if (item.subItems) {
      for (const subItem of item.subItems) {
        // Skip disabled or non-navigable subitems
        if (subItem.disabled || !subItem.path) continue;

        items.push({
          id: subItem.id,
          label: `${item.label} → ${subItem.label}`,
          path: subItem.path,
          icon: item.icon,
          parentLabel: item.label,
        });
      }
    }
  }

  return items;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const searchableItems = getSearchableItems();

  const handleSelect = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search..." className="border-0" />
      <CommandList>
        <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
          Geen resultaten gevonden
        </CommandEmpty>
        <CommandGroup heading="GO TO" className="px-3 pb-3">
          {searchableItems.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.id}
                value={item.label}
                onSelect={() => handleSelect(item.path)}
                className="group flex items-center gap-4 px-3 py-3.5 rounded-lg cursor-pointer"
              >
                <Icon size={20} className="flex-shrink-0 text-muted-foreground" />
                <span className="flex-1">{item.label}</span>
                <CornerDownLeft 
                  size={16} 
                  className="text-muted-foreground opacity-0 group-data-[selected=true]:opacity-100 transition-opacity" 
                />
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
