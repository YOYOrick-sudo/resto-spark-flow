/**
 * Supabase Error Parsing Utility
 * 
 * Parst PostgreSQL errors naar user-friendly messages.
 * Prioriteit: error.code -> error.details -> error.message
 */

interface PostgrestError {
  code: string;
  details: string | null;
  hint: string | null;
  message: string;
}

export type ErrorCode = 
  | 'unique_table_number'
  | 'unique_display_label'
  | 'unique_area_name'
  | 'unique_group_name'
  | 'table_group_overlap'
  | 'label_conflict'
  | 'unauthorized'
  | 'not_found'
  | 'unknown';

export interface ParsedError {
  code: ErrorCode;
  message: string;
}

export function parseSupabaseError(error: unknown): ParsedError {
  const pgError = error as PostgrestError;
  
  // 23505 = unique_violation
  if (pgError.code === '23505') {
    const details = pgError.details?.toLowerCase() ?? '';
    const message = pgError.message?.toLowerCase() ?? '';
    
    // Check details first (more reliable)
    if (details.includes('table_number') || message.includes('table_number')) {
      return { 
        code: 'unique_table_number', 
        message: 'Dit tafelnummer bestaat al in deze locatie.' 
      };
    }
    if (details.includes('display_label') || message.includes('display_label')) {
      return { 
        code: 'unique_display_label', 
        message: 'Dit label bestaat al (hoofdletterongevoelig).' 
      };
    }
    if (details.includes('areas') && details.includes('name')) {
      return { 
        code: 'unique_area_name', 
        message: 'Er bestaat al een area met deze naam.' 
      };
    }
    if (details.includes('table_groups') && details.includes('name')) {
      return { 
        code: 'unique_group_name', 
        message: 'Er bestaat al een groep met deze naam.' 
      };
    }
  }
  
  // P0001 = raise_exception (used by triggers and RPCs)
  if (pgError.code === 'P0001') {
    const msg = pgError.message?.toLowerCase() ?? '';
    
    if (msg.includes('overlap') || msg.includes('already in')) {
      return { 
        code: 'table_group_overlap', 
        message: 'Deze tafel zit al in een andere actieve groep.' 
      };
    }
    if (msg.includes('unauthorized')) {
      return { 
        code: 'unauthorized', 
        message: 'Je hebt geen rechten voor deze actie.' 
      };
    }
    if (msg.includes('not found')) {
      return { 
        code: 'not_found', 
        message: 'Item niet gevonden.' 
      };
    }
  }
  
  // Custom error from restore_table RPC (return-based)
  const anyError = error as { code?: string; message?: string };
  if (anyError.code === 'label_conflict') {
    return { 
      code: 'label_conflict', 
      message: 'Dit label is al in gebruik door een andere tafel.' 
    };
  }
  
  // Fallback: message parsing
  const msg = pgError.message?.toLowerCase() ?? '';
  if (msg.includes('overlap')) {
    return { 
      code: 'table_group_overlap', 
      message: 'Deze tafel zit al in een andere actieve groep.' 
    };
  }
  if (msg.includes('unauthorized')) {
    return { 
      code: 'unauthorized', 
      message: 'Je hebt geen rechten voor deze actie.' 
    };
  }
  
  return { 
    code: 'unknown', 
    message: pgError.message || 'Er is een onbekende fout opgetreden.' 
  };
}
