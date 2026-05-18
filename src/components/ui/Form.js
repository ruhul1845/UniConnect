export function Field({ label, children }) {
  return <label className="block"><span className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-uniBlue">{label}</span>{children}</label>;
}
export const inputClass = 'w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-uniGold focus:ring-4 focus:ring-yellow-100';
export const selectClass = inputClass;
