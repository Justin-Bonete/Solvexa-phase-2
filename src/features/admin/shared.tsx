import { NavLink } from 'react-router-dom';
import type { RequestStatus, RequestKind } from '@shared/enums';
import { Badge } from '@/components/ui/Feedback';

export type InboxItem = {
  id: string;
  reference: string;
  kind: RequestKind;
  status: RequestStatus;
  contactName: string;
  contactEmail: string;
  organization: string | null;
  projectType: string;
  path: string;
  priority: string;
  createdAt: string;
  attachmentCount: number;
};

const tone = {
  new: 'accent',
  reviewing: 'warn',
  contacted: 'warn',
  qualified: 'ok',
  converted: 'ok',
  declined: 'neutral',
  spam: 'bad',
} as const;
export const StatusBadge = ({ status, label }: { status: RequestStatus; label: string }) => (
  <Badge tone={tone[status]}>{label}</Badge>
);

export function AdminNav() {
  const cls = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-2 text-sm ${isActive ? 'bg-s2 text-fg' : 'text-muted hover:text-fg'}`;
  return (
    <nav aria-label="Admin" className="flex gap-1 border-b border-line pb-3">
      <NavLink to="/admin" end className={cls}>
        Overview
      </NavLink>
      <NavLink to="/admin/inquiries" className={cls}>
        Inquiries
      </NavLink>
    </nav>
  );
}

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
