export default function Modal({ title, eyebrow, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-blue-100 pb-4">
          <div>{eyebrow && <p className="text-xs font-black uppercase tracking-widest text-uniGold">{eyebrow}</p>}<h2 className="text-2xl font-black text-uniBlue">{title}</h2></div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-blue-50 text-xl font-black text-uniBlue hover:bg-blue-100">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
