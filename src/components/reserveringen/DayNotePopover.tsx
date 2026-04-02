import { useState, useEffect, useRef } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { NestoButton } from '@/components/polar/NestoButton';
import { StickyNote } from 'lucide-react';
import { useDayNote } from '@/hooks/useDayNote';
import { cn } from '@/lib/utils';

interface DayNotePopoverProps {
  date: string;
  locationId: string | undefined;
}

export function DayNotePopover({ date, locationId }: DayNotePopoverProps) {
  const { note, hasNote, saveNote, isSaving } = useDayNote(date, locationId);
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setValue(note?.content ?? '');
  }, [note?.content]);

  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open]);

  const handleBlur = () => {
    const trimmed = value.trim();
    const existing = (note?.content ?? '').trim();
    if (trimmed !== existing) {
      saveNote(trimmed);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <NestoButton variant="ghost" size="sm" className="relative gap-1.5">
          <StickyNote className="h-4 w-4" />
          Notities
          {hasNote && (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />
          )}
        </NestoButton>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-80 p-3">
        <p className="text-xs font-medium text-muted-foreground mb-2">Dagnotitie</p>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleBlur}
          placeholder="Notitie voor deze dag…"
          rows={4}
          className={cn(
            'w-full resize-none rounded-lg border border-border bg-background px-3 py-2',
            'text-sm text-foreground placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-1 focus:ring-primary/30',
            'transition-colors'
          )}
        />
        {isSaving && (
          <p className="text-xs text-muted-foreground mt-1">Opslaan…</p>
        )}
      </PopoverContent>
    </Popover>
  );
}
