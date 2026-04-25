export function Card({ children, className = '' }) {
  return <div className={`rounded-3xl border border-blue-100 bg-white shadow-xl shadow-slate-200/50 ${className}`}>{children}</div>;
}
export function Badge({ children, tone = 'gold' }) {
  const cls = tone === 'blue' ? 'bg-blue-50 text-uniBlue ring-blue-100' : tone === 'green' ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : 'bg-yellow-100 text-uniBlue ring-yellow-200';
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-extrabold ring-1 ${cls}`}>{children}</span>;
}
