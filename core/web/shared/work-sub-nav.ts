/**
 * Work hub route sub-nav (Docs / AI Lab / Process) — used by `AppWorkSubNav`.
 */

export type WorkSubNavItem = {
  to: string;
  label: string;
};

export const WORK_SUB_NAV_ITEMS: WorkSubNavItem[] = [
  { to: '/docs', label: 'Docs' },
  { to: '/ai-lab', label: 'AI Lab' },
  { to: '/process', label: 'Process' },
];
