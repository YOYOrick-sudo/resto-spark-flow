/**
 * Helper functions for table combination capacity calculations.
 */

interface TableWithCapacity {
  max_capacity: number;
}

/**
 * Calculates the base capacity (sum of max_capacity) for a set of tables.
 */
export function getBaseCapacity(tables: TableWithCapacity[]): number {
  return tables.reduce((sum, t) => sum + t.max_capacity, 0);
}

/**
 * Calculates effective capacity for a table combination.
 * Formula: sum(maxCapacity) + extraSeats
 */
export function getCombinationCapacity(
  tables: TableWithCapacity[],
  extraSeats: number
): number {
  return getBaseCapacity(tables) + extraSeats;
}

/**
 * Calculates the minimum allowed extra_seats value.
 * Formula: -(baseCapacity - 1) to ensure effectiveCapacity >= 1
 */
export function getMinExtraSeats(baseCapacity: number): number {
  return -(baseCapacity - 1);
}

/**
 * Maximum allowed extra_seats value (hard cap).
 */
export const MAX_EXTRA_SEATS = 6;

/**
 * Validates extra_seats value for a table combination.
 */
export function validateExtraSeats(
  tables: TableWithCapacity[],
  extraSeats: number
): { valid: boolean; message?: string } {
  const baseCapacity = getBaseCapacity(tables);
  const effectiveCapacity = baseCapacity + extraSeats;
  const minExtraSeats = getMinExtraSeats(baseCapacity);

  if (!Number.isInteger(extraSeats)) {
    return { valid: false, message: 'Extra stoelen moet een geheel getal zijn.' };
  }

  if (extraSeats < minExtraSeats) {
    return { valid: false, message: `Minimaal ${minExtraSeats} extra stoelen.` };
  }

  if (extraSeats > MAX_EXTRA_SEATS) {
    return { valid: false, message: `Maximaal +${MAX_EXTRA_SEATS} extra stoelen.` };
  }

  if (effectiveCapacity < 1) {
    return { valid: false, message: 'Effectieve capaciteit moet minimaal 1 zijn.' };
  }

  return { valid: true };
}
