export const dataTableStyles = {
  card: (dark) => `rounded-lg border shadow-sm overflow-hidden ${dark ? 'bg-white/5 border-gray-700' : 'bg-white border-slate-100'}`,
  cardHeader: (dark) => `px-4 sm:px-6 py-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 ${dark ? 'border-gray-800' : 'border-slate-100'}`,
  headerRow: (dark) => `border-b text-xs uppercase tracking-wide ${dark ? 'bg-slate-800/50 border-gray-800 text-slate-500' : 'bg-slate-50 border-slate-100 text-slate-500'}`,
  headCell: 'px-5 py-3 text-left font-semibold whitespace-nowrap',
  bodyRow: (dark) => `border-b transition ${dark ? 'border-gray-800/50 hover:bg-white/5' : 'border-slate-100 hover:bg-green-50/50'}`,
  bodyCell: 'px-5 py-4 whitespace-nowrap',
  badge: (active, dark) => {
    if (active) return dark ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-800';
    return dark ? 'bg-red-900/50 text-red-400' : 'bg-red-100 text-red-800';
  },
  badgeBase: 'inline-flex min-w-[4rem] justify-center text-xs font-semibold px-2 py-0.5 rounded-full',
  actionButton: (dark) => `p-2 rounded-lg border transition ${dark ? 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-green-400' : 'border-slate-200 text-slate-500 hover:bg-green-50 hover:text-green-700'}`,
  actionIcon: 'h-4 w-4',
  avatar: 'h-10 w-10 rounded-full overflow-hidden',
  loadingWrapper: 'flex items-center justify-center py-16',
  loadingSpinner: 'h-7 w-7 rounded-full border-[3px] border-green-500 border-t-transparent animate-spin',
  emptyState: 'text-center py-16 text-sm',
  mobileCard: 'p-4 space-y-4 rounded-lg border shadow-sm',
  mobileDivider: 'divide-y divide-slate-100 dark:divide-gray-800',
};
