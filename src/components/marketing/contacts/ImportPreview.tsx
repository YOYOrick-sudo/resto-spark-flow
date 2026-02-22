interface ImportPreviewProps {
  headers: string[];
  rows: string[][];
}

export function ImportPreview({ headers, rows }: ImportPreviewProps) {
  const previewRows = rows.slice(0, 5);

  return (
    <div className="overflow-x-auto rounded-card border border-border">
      <table className="w-full text-small">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            {headers.map((h, i) => (
              <th key={i} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {previewRows.map((row, ri) => (
            <tr key={ri} className="border-b border-border/50 last:border-0">
              {headers.map((_, ci) => (
                <td key={ci} className="px-3 py-1.5 text-foreground whitespace-nowrap max-w-[200px] truncate">
                  {row[ci] ?? ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 5 && (
        <p className="px-3 py-2 text-xs text-muted-foreground border-t border-border/50">
          +{rows.length - 5} meer rijen
        </p>
      )}
    </div>
  );
}
