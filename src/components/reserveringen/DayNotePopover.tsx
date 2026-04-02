import { useState, useEffect, useRef } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { StickyNote, Pencil } from 'lucide-react';
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
        <button
          className={cn(
            'flex items-center gap-2 text-left min-w-0 max-w-md group',
            'transition-colors rounded-lg px-2 py-1.5 -mx-2',
            'hover:bg-muted/50'
          )}
        >
          <StickyNote className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          {hasNote ? (
            <>
              <span className="text-sm text-foreground truncate">{note?.content}</span>
              <Pencil className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </>
          ) : (
            <span className="text-sm text-muted-foreground italic">Notitie toevoegen…</span>
          )}
        </button>
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
