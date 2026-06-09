export const dataTableStyles = {
  card: (dark) => `rounded-lg border shadow-sm overflow-hidden ${dark ? 'bg-slate-900/80 border-slate-700' : 'bg-white border-slate-100'}`,
  tableWrapper: 'overflow-x-auto',
  headerRow: (dark) => `border-b text-xs uppercase tracking-wide ${dark ? 'bg-slate-900/95 text-slate-400' : 'bg-white/90 text-slate-600'}`,
  headCell: 'px-5 py-3 text-left font-semibold whitespace-nowrap',
  bodyRow: (dark) => `border-b transition ${dark ? 'border-slate-800 hover:bg-white/5' : 'border-slate-200 hover:bg-green-50/50'}`,
  bodyCell: 'px-5 py-4 whitespace-nowrap',
  badge: (status) => `text-xs font-semibold px-2 py-0.5 rounded-full ${status === 'Delivered' ? 'bg-green-100 text-green-900' : status === 'Assigned' ? 'bg-blue-100 text-blue-900' : status === 'Pending' ? 'bg-yellow-100 text-yellow-900' : 'bg-slate-100 text-slate-700'}`,
  avatar: 'h-10 w-10 rounded-full overflow-hidden',
  loadingWrapper: 'flex items-center justify-center py-16',
  emptyState: 'px-5 py-12 text-center text-sm text-slate-500',
};
