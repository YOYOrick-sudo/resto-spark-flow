export const PREP_HANDELINGEN = [
  { type: 'Raspen',      defaultYield: 95,  defaultDuur: 10 },
  { type: 'Snijden',     defaultYield: 90,  defaultDuur: 15 },
  { type: 'Schillen',    defaultYield: 85,  defaultDuur: 20 },
  { type: 'Wassen',      defaultYield: 80,  defaultDuur: 5  },
  { type: 'Portioneren', defaultYield: 100, defaultDuur: 10 },
  { type: 'Aanvullen',   defaultYield: 100, defaultDuur: 2  },
  { type: 'Ontdooien',   defaultYield: 95,  defaultDuur: 5  },
  { type: 'Marineren',   defaultYield: 100, defaultDuur: 10 },
  { type: 'Roosteren',   defaultYield: 90,  defaultDuur: 15 },
  { type: 'Vacuümeren',  defaultYield: 100, defaultDuur: 10 },
  { type: 'Fileren',     defaultYield: 50,  defaultDuur: 20 },
  { type: 'Overig',      defaultYield: 100, defaultDuur: 10 },
] as const;

export type PrepHandeling = typeof PREP_HANDELINGEN[number]['type'];

export function getPrepDefaults(type: string) {
  return PREP_HANDELINGEN.find(h => h.type === type) ?? PREP_HANDELINGEN[PREP_HANDELINGEN.length - 1];
}
