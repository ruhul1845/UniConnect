export default function PageHero({ eyebrow, title, subtitle, actions, danger = false }) {
  return (
    <section className={`relative overflow-hidden ${danger ? 'bg-gradient-to-r from-rose-950 via-red-900 to-uniBlue' : 'bg-gradient-to-r from-[#061A40] via-[#123C69] to-[#1E88E5]'} px-6 py-20 text-white`}>
      <div className="absolute  inset-0 bg-[radial-gradient(circle_at_top_right,rgba(246,184,0,.28),transparent_35%)]" />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div className="max-w-3xl">
          {eyebrow && <p className="mb-3 text-sm font-black uppercase tracking-[0.25em] text-uniGold">{eyebrow}</p>}
          <h1 className="text-4xl font-black tracking-tight md:text-6xl">{title}</h1>
          {subtitle && <p className="mt-5 max-w-2xl text-lg leading-8 text-blue-50">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
      </div>
    </section>
  );
}
