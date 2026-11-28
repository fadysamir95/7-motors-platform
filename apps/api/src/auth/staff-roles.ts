/** Every role that counts as staff. Customers have no role. */
export const STAFF_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'SERVICE_MANAGER',
  'INVENTORY_MANAGER',
  'ORDER_MANAGER',
  'MARKETPLACE_MODERATOR',
  'WHOLESALE_MANAGER',
] as const;

export const isStaff = (roles: readonly string[] | undefined) => Boolean(roles?.some((r) => (STAFF_ROLES as readonly string[]).includes(r)));
