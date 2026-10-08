import type { RoleName } from '../../shared/enums';

/** RBAC matrix (Phase 0 §4.2), restricted to resources that exist in Phase 1. Extended per phase; unlisted = denied. */
type Matrix = Record<string, Partial<Record<RoleName, readonly string[]>>>;
export const POLICY: Matrix = {
  users: { admin: ['read', 'disable'] },
  activity_logs: { admin: ['read'] },
  inquiries: { admin: ['read', 'update', 'delete'] },
  attachments: { admin: ['read'] },
  self: { admin: ['read', 'update'], client: ['read', 'update'] },
};

export const can = (role: RoleName, resource: string, action: string): boolean =>
  POLICY[resource]?.[role]?.includes(action) ?? false;
