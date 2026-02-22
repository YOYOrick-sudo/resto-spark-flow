import { useState, useCallback, useRef } from 'react';
import Papa from 'papaparse';
import { NestoModal } from '@/components/polar/NestoModal';
import { NestoButton } from '@/components/polar/NestoButton';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Upload, FileText, AlertTriangle } from 'lucide-react';
import { nestoToast } from '@/lib/nestoToast';
import { ImportPreview } from './ImportPreview';
import { ColumnMapper, autoMatchHeaders, validateMappings, type ColumnMapping } from './ColumnMapper';
import { useImportContacts, type ImportRow } from '@/hooks/useImportContacts';

interface ImportContactsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function ImportContactsModal({ open, onOpenChange }: ImportContactsModalProps) {
  const [step, setStep] = useState(0);
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [optIn, setOptIn] = useState(false);
  const [mappingErrors, setMappingErrors] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const importMutation = useImportContacts();

  const reset = useCallback(() => {
    setStep(0);
    setFileName('');
    setHeaders([]);
    setRows([]);
    setMappings([]);
    setOptIn(false);
    setMappingErrors([]);
    setIsDragging(false);
  }, []);

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const parseFile = (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      nestoToast.error('Bestand te groot', 'Max 5MB');
      return;
    }
    setFileName(file.name);
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (result) => {
        const data = result.data as string[][];
        if (data.length < 2) {
          nestoToast.error('Bestand bevat geen data');
          return;
        }
        const h = data[0];
        const r = data.slice(1);
        setHeaders(h);
        setRows(r);
        setMappings(autoMatchHeaders(h));
        setStep(1);
      },
      error: () => {
        nestoToast.error('Kan bestand niet lezen');
      },
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  };

  const goToConfirm = () => {
    const errors = validateMappings(mappings);
    setMappingErrors(errors);
    if (errors.length === 0) setStep(2);
  };

  const invalidEmailCount = (() => {
    const emailIdx = mappings.findIndex(m => m.nestoField === 'email');
    if (emailIdx < 0) return 0;
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return rows.filter(r => !regex.test(r[emailIdx]?.trim() ?? '')).length;
  })();

  const handleImport = async () => {
    const importRows: ImportRow[] = rows.map(row => {
      const obj: Record<string, string> = {};
      mappings.forEach((m, i) => {
        if (m.nestoField !== '__skip__') {
          obj[m.nestoField] = row[i] ?? '';
        }
      });
      return obj as unknown as ImportRow;
    });

    try {
      await importMutation.mutateAsync({ rows: importRows, optIn });
      handleClose(false);
    } catch {
      nestoToast.error('Import mislukt', 'Probeer het opnieuw');
    }
  };

  const steps = [
    { label: 'Upload', completed: step > 0 },
    { label: 'Koppelen', completed: step > 1 },
    { label: 'Bevestigen', completed: false },
  ];

  return (
    <NestoModal
      open={open}
      onOpenChange={handleClose}
      title="Contacten importeren"
      description="Importeer gastlijsten uit CSV, TSV of Excel bestanden"
      size="lg"
      steps={steps}
      currentStep={step}
      footer={
        <div className="flex justify-end gap-3 w-full">
          {step > 0 && (
            <NestoButton variant="outline" onClick={() => setStep(s => s - 1)} disabled={importMutation.isPending}>
              Terug
            </NestoButton>
          )}
          {step === 1 && (
            <NestoButton onClick={goToConfirm}>
              Volgende
            </NestoButton>
          )}
          {step === 2 && (
            <NestoButton onClick={handleImport} disabled={importMutation.isPending}>
              {importMutation.isPending ? 'Importeren...' : `Importeer ${rows.length - invalidEmailCount} contacten`}
            </NestoButton>
          )}
        </div>
      }
    >
      {/* Step 0: Upload */}
      {step === 0 && (
        <div className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-card p-8 text-center transition-colors cursor-pointer ${
              isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-body text-foreground font-medium">Sleep je bestand hierheen</p>
            <p className="text-small text-muted-foreground mt-1">of klik om een bestand te kiezen</p>
            <p className="text-xs text-muted-foreground mt-2">CSV, TSV of TXT • Max 5MB</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.tsv,.txt"
            className="hidden"
            onChange={handleFileChange}
          />
          {fileName && (
            <div className="border-t border-border/50 pt-4 mt-4">
              <div className="flex items-center gap-2 text-small text-foreground">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{fileName}</span>
                <span className="text-muted-foreground">• {rows.length} rijen</span>
              </div>
              <div className="mt-3">
                <ImportPreview headers={headers} rows={rows} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 1: Mapping */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-small text-muted-foreground">
            Koppel de kolommen uit je bestand aan de juiste Nesto velden. Voornaam en email zijn verplicht.
          </p>
          <ColumnMapper
            csvHeaders={headers}
            mappings={mappings}
            onMappingChange={(i, v) => {
              setMappings(prev => prev.map((m, idx) => idx === i ? { ...m, nestoField: v } : m));
              setMappingErrors([]);
            }}
          />
          {mappingErrors.length > 0 && (
            <div className="flex items-start gap-2 text-small text-error">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>{mappingErrors.join(', ')}</div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Confirm */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="rounded-card border border-border p-4 space-y-2">
            <p className="text-body text-foreground font-medium">
              {rows.length - invalidEmailCount} contacten worden geïmporteerd
            </p>
            {invalidEmailCount > 0 && (
              <div className="flex items-start gap-2 text-small text-warning">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{invalidEmailCount} rijen zonder geldig email worden overgeslagen</span>
              </div>
            )}
          </div>

          <div className="border-t border-border/50 pt-4 mt-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="opt-in"
                checked={optIn}
                onCheckedChange={(v) => setOptIn(v === true)}
              />
              <div>
                <Label htmlFor="opt-in" className="text-body text-foreground cursor-pointer">
                  Importeer als marketing opt-in
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Contacten ontvangen een double opt-in bevestigingsmail
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </NestoModal>
  );
}
