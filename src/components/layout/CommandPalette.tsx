import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { menuItems } from '@/lib/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();

  // Flatten menu items into searchable list
  const searchItems = useMemo(() => {
    const items: { id: string; label: string; path: string; group: string; icon: typeof menuItems[0]['icon'] }[] = [];

    for (const item of menuItems) {
      if (item.path && !item.disabled) {
        items.push({
          id: item.id,
          label: item.label,
          path: item.path,
          group: item.section || 'Algemeen',
          icon: item.icon,
        });
      }
      if (item.subItems) {
        for (const sub of item.subItems) {
          if (sub.path && !sub.disabled) {
            items.push({
              id: sub.id,
              label: sub.label,
              path: sub.path,
              group: item.label,
              icon: item.icon,
            });
          }
        }
      }
    }
    return items;
  }, []);

  // Group items by group name
  const grouped = useMemo(() => {
    const map = new Map<string, typeof searchItems>();
    for (const item of searchItems) {
      const list = map.get(item.group) || [];
      list.push(item);
      map.set(item.group, list);
    }
    return map;
  }, [searchItems]);

  const handleSelect = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Zoeken in nesto..." />
      <CommandList>
        <CommandEmpty>Geen resultaten gevonden.</CommandEmpty>
        {Array.from(grouped.entries()).map(([group, items]) => (
          <CommandGroup key={group} heading={group}>
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.id}
                  value={item.label}
                  onSelect={() => handleSelect(item.path)}
                >
                  <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{item.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
