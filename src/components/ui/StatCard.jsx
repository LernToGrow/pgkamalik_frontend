export default function StatCard({ label, value, icon: Icon, color = 'indigo', sub, progress, growth }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  const barColor = {
    indigo: 'bg-indigo-500',
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${colors[color]} shrink-0`}>
        <Icon size={22} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-500">{label}</p>
        <div className="flex items-center gap-2">
          <p className="text-2xl font-bold text-slate-800">{value ?? '—'}</p>
          {growth != null && (
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${growth >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
              {growth >= 0 ? '▲' : '▼'} {Math.abs(growth)}%
            </span>
          )}
        </div>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        {progress != null && (
          <div className="mt-2">
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>Collection Rate</span>
              <span className="font-semibold text-slate-600">{progress}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${barColor[color]}`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
