import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { nestoToast } from '@/lib/nestoToast';

export interface ImportRow {
  first_name: string;
  last_name?: string;
  email: string;
  phone_number?: string;
  birthday?: string;
  tags?: string;
}

export interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function processChunk(
  rows: ImportRow[],
  locationId: string,
  optIn: boolean,
  result: ImportResult
) {
  for (const row of rows) {
    if (!row.email || !EMAIL_REGEX.test(row.email)) {
      result.skipped++;
      continue;
    }
    if (!row.first_name?.trim()) {
      result.skipped++;
      continue;
    }

    try {
      // Check existing
      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .eq('location_id', locationId)
        .eq('email', row.email.toLowerCase().trim())
        .maybeSingle();

      if (existing) {
        // Update — merge, don't overwrite empty
        const updates: Record<string, unknown> = {};
        if (row.first_name?.trim()) updates.first_name = row.first_name.trim();
        if (row.last_name?.trim()) updates.last_name = row.last_name.trim();
        if (row.phone_number?.trim()) updates.phone_number = row.phone_number.trim();
        if (row.birthday?.trim()) updates.birthday = row.birthday.trim();
        if (row.tags?.trim()) {
          updates.tags = row.tags.split(',').map(t => t.trim()).filter(Boolean);
        }

        const { error } = await supabase
          .from('customers')
          .update(updates)
          .eq('id', existing.id);

        if (error) {
          result.errors.push(`${row.email}: ${error.message}`);
        } else {
          result.updated++;
        }

        if (optIn) {
          await upsertOptIn(existing.id, locationId);
        }
      } else {
        // Insert new
        const { data: newCustomer, error } = await supabase
          .from('customers')
          .insert({
            location_id: locationId,
            first_name: row.first_name.trim(),
            last_name: row.last_name?.trim() || '',
            email: row.email.toLowerCase().trim(),
            phone_number: row.phone_number?.trim() || null,
            birthday: row.birthday?.trim() || null,
            tags: row.tags ? row.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          })
          .select('id')
          .single();

        if (error) {
          result.errors.push(`${row.email}: ${error.message}`);
        } else {
          result.imported++;
          if (optIn && newCustomer) {
            await upsertOptIn(newCustomer.id, locationId);
          }
        }
      }
    } catch (e: any) {
      result.errors.push(`${row.email}: ${e.message}`);
    }
  }
}

async function upsertOptIn(customerId: string, locationId: string) {
  await supabase
    .from('marketing_contact_preferences')
    .upsert(
      {
        customer_id: customerId,
        location_id: locationId,
        channel: 'email',
        opted_in: false,
        consent_source: 'import',
      },
      { onConflict: 'customer_id,location_id,channel', ignoreDuplicates: false }
    );
}

export function useImportContacts() {
  const qc = useQueryClient();
  const { currentLocation } = useUserContext();

  return useMutation({
    mutationFn: async (input: { rows: ImportRow[]; optIn: boolean }): Promise<ImportResult> => {
      if (!currentLocation) throw new Error('No location');
      const locationId = currentLocation.id;

      const result: ImportResult = { imported: 0, updated: 0, skipped: 0, errors: [] };
      const chunkSize = 50;

      for (let i = 0; i < input.rows.length; i += chunkSize) {
        const chunk = input.rows.slice(i, i + chunkSize);
        await processChunk(chunk, locationId, input.optIn, result);
      }

      return result;
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['marketing-contacts'] });
      qc.invalidateQueries({ queryKey: ['new-contacts-month'] });

      const parts: string[] = [];
      if (result.imported > 0) parts.push(`${result.imported} geïmporteerd`);
      if (result.updated > 0) parts.push(`${result.updated} bijgewerkt`);
      if (result.skipped > 0) parts.push(`${result.skipped} overgeslagen`);

      nestoToast.success('Import voltooid', parts.join(', '));
    },
  });
}
