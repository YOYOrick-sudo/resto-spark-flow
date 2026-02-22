import { useRef, useState, useCallback } from 'react';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MediaUploadZoneProps {
  mediaUrls: string[];
  uploading: boolean;
  onUpload: (files: File[]) => void;
  onRemove: (url: string) => void;
  compact?: boolean;
}

export function MediaUploadZone({ mediaUrls, uploading, onUpload, onRemove, compact = false }: MediaUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onUpload(files);
  }, [onUpload]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) onUpload(files);
    e.target.value = '';
  }, [onUpload]);

  const maxReached = mediaUrls.length >= 4;

  return (
    <div className="space-y-2">
      {/* Thumbnails */}
      {mediaUrls.length > 0 && (
        <div className={cn('grid gap-2', compact ? 'grid-cols-4' : 'grid-cols-4')}>
          {mediaUrls.map((url) => (
            <div key={url} className="relative group aspect-square rounded-lg overflow-hidden border border-border/50">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => onRemove(url)}
                className="absolute top-1 right-1 p-0.5 rounded-full bg-background/80 text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                type="button"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload zone */}
      {!maxReached && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'border border-dashed rounded-xl flex items-center justify-center cursor-pointer transition-colors',
            compact ? 'p-3 gap-2' : 'p-6 gap-3 flex-col',
            dragOver ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-primary/40 hover:bg-accent/20'
          )}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <ImagePlus className="h-5 w-5 text-muted-foreground" />
          )}
          <span className="text-xs text-muted-foreground">
            {uploading ? 'Uploaden...' : `Voeg foto's toe (max ${4 - mediaUrls.length})`}
          </span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
