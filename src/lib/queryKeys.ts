// Centralized query keys for consistent cache invalidation
// All invalidations should use exact: false to cover all variants

export const queryKeys = {
  /** Base key for areas-with-tables queries. Variants add [includeInactive, includeGroupCounts] */
  areasWithTables: (locationId: string) => ['areas-with-tables', locationId] as const,
  
  /** Base key for table-groups queries. Variants add [includeInactive, includeMembers] */
  tableGroups: (locationId: string) => ['table-groups', locationId] as const,
} as const;

export type QueryKeys = typeof queryKeys;
