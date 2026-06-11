import { HiLockClosed, HiLogout, HiExclamationCircle, HiShieldExclamation } from 'react-icons/hi';

const AccountRestrictionOverlay = ({ restriction, clearUser, dark }) => {
  const isDeleted = restriction?.type === 'deleted';
  const untilStr = restriction?.suspendedUntil
    ? new Date(restriction.suspendedUntil).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;
  const isPermanent = !isDeleted && restriction?.suspensionDuration === 'Permanent';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-500">
      <div className={`relative w-full max-w-md mx-4 rounded-2xl border shadow-2xl overflow-hidden ${dark ? 'bg-[#0d0d0d] border-white/[0.08]' : 'bg-white border-slate-200'}`}>
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, #22c55e 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

        <div className={`h-2 w-full bg-gradient-to-r ${isDeleted ? 'from-red-600 to-red-400' : 'from-orange-500 to-red-500'}`} />

        <div className="relative p-6 sm:p-8 text-center">
          <div className={`mx-auto h-16 w-16 rounded-2xl flex items-center justify-center mb-5 ${
            isDeleted ? 'bg-red-100 dark:bg-red-900/30' : 'bg-orange-100 dark:bg-orange-900/30'
          }`}>
            {isDeleted
              ? <HiShieldExclamation className="h-8 w-8 text-red-600 dark:text-red-400" />
              : <HiLockClosed className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            }
          </div>

          <h2 className={`text-xl font-bold mb-2 ${dark ? 'text-white' : 'text-slate-900'}`}>
            {isDeleted ? 'Account Deleted' : 'Account Suspended'}
          </h2>

          <p className={`text-sm mb-6 leading-relaxed ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
            {isDeleted
              ? 'Your account has been deleted by the administration.'
              : 'Your account has been suspended.'}
          </p>

          <div className={`rounded-xl border p-4 mb-6 text-left space-y-2 ${dark ? 'bg-white/5 border-white/[0.06]' : 'bg-slate-50 border-slate-200'}`}>
            {!isDeleted && (
              <div className="flex items-start gap-2">
                <HiExclamationCircle className="h-4 w-4 mt-0.5 shrink-0 text-orange-500" />
                <div>
                  <p className={`text-xs font-semibold ${dark ? 'text-slate-300' : 'text-slate-700'}`}>Reason</p>
                  <p className={`text-xs ${dark ? 'text-slate-500' : 'text-slate-500'}`}>{restriction.suspensionReason || 'Not specified'}</p>
                </div>
              </div>
            )}
            {isDeleted && (
              <div className="flex items-start gap-2">
                <HiExclamationCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-500" />
                <div>
                  <p className={`text-xs font-semibold ${dark ? 'text-slate-300' : 'text-slate-700'}`}>Reason</p>
                  <p className={`text-xs ${dark ? 'text-slate-500' : 'text-slate-500'}`}>{restriction.deletionReason || 'Not specified'}</p>
                </div>
              </div>
            )}
            {!isDeleted && untilStr && (
              <div className="flex items-start gap-2">
                <HiLockClosed className="h-4 w-4 mt-0.5 shrink-0 text-orange-500" />
                <div>
                  <p className={`text-xs font-semibold ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
                    {isPermanent ? 'Duration' : 'Suspended Until'}
                  </p>
                  <p className={`text-xs ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
                    {isPermanent ? 'Permanent' : untilStr}
                  </p>
                </div>
              </div>
            )}
          </div>

          <p className={`text-xs mb-5 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
            Please contact support at{' '}
            <span className="font-semibold text-green-500">support@ecoloop.com</span> for assistance.
          </p>

          <button onClick={clearUser}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-bold px-4 py-3 shadow-lg hover:shadow-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 active:scale-[0.98]">
            <HiLogout className="h-4 w-4" />
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountRestrictionOverlay;
