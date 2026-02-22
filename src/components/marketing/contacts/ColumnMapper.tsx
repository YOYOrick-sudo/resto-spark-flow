import { NestoSelect } from '@/components/polar/NestoSelect';

export interface ColumnMapping {
  csvHeader: string;
  nestoField: string;
}

interface ColumnMapperProps {
  csvHeaders: string[];
  mappings: ColumnMapping[];
  onMappingChange: (index: number, nestoField: string) => void;
}

export const NESTO_FIELDS = [
  { value: '__skip__', label: 'Overslaan' },
  { value: 'first_name', label: 'Voornaam' },
  { value: 'last_name', label: 'Achternaam' },
  { value: 'email', label: 'Email' },
  { value: 'phone_number', label: 'Telefoon' },
  { value: 'birthday', label: 'Verjaardag' },
  { value: 'tags', label: 'Tags' },
];

const AUTO_MATCH: Record<string, string> = {
  'voornaam': 'first_name',
  'first_name': 'first_name',
  'first name': 'first_name',
  'firstname': 'first_name',
  'achternaam': 'last_name',
  'last_name': 'last_name',
  'last name': 'last_name',
  'lastname': 'last_name',
  'email': 'email',
  'e-mail': 'email',
  'emailaddress': 'email',
  'email_address': 'email',
  'telefoon': 'phone_number',
  'phone': 'phone_number',
  'phone_number': 'phone_number',
  'telefoonnummer': 'phone_number',
  'verjaardag': 'birthday',
  'birthday': 'birthday',
  'geboortedatum': 'birthday',
  'date_of_birth': 'birthday',
  'tags': 'tags',
  'label': 'tags',
  'labels': 'tags',
};

export function autoMatchHeaders(headers: string[]): ColumnMapping[] {
  return headers.map(h => ({
    csvHeader: h,
    nestoField: AUTO_MATCH[h.toLowerCase().trim()] ?? '__skip__',
  }));
}

export function validateMappings(mappings: ColumnMapping[]): string[] {
  const errors: string[] = [];
  if (!mappings.some(m => m.nestoField === 'first_name')) {
    errors.push('Voornaam moet gekoppeld zijn');
  }
  if (!mappings.some(m => m.nestoField === 'email')) {
    errors.push('Email moet gekoppeld zijn');
  }
  return errors;
}

export function ColumnMapper({ csvHeaders, mappings, onMappingChange }: ColumnMapperProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center text-xs font-medium text-muted-foreground mb-2">
        <span>CSV kolom</span>
        <span />
        <span>Nesto veld</span>
      </div>
      {csvHeaders.map((header, i) => (
        <div key={i} className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
          <div className="px-3 py-2 rounded-card bg-muted/30 border border-border/50 text-small text-foreground truncate">
            {header}
          </div>
          <span className="text-muted-foreground text-xs">→</span>
          <NestoSelect
            value={mappings[i]?.nestoField ?? '__skip__'}
            onValueChange={(v) => onMappingChange(i, v)}
            options={NESTO_FIELDS}
            placeholder="Kies veld"
          />
        </div>
      ))}
    </div>
  );
}
