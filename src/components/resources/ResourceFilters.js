const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100';
const labelClass = 'mb-2 block text-xs font-black uppercase tracking-wide text-[#18004d]';

export default function ResourceFilters({ filters, setFilters, options, resultCount, totalCount }) {
  const update = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const reset = () => setFilters({ search: '', courseCode: '', year: 'All Years', batch: 'All Batches', semester: 'All Semesters' });

  return (
    <div className=" border border-blue-100 bg-white p-6 shadow-xl shadow-blue-900/5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <FilterField label="Search">
          <input className={inputClass} value={filters.search} onChange={(e) => update('search', e.target.value)} placeholder="Search title, author..." />
        </FilterField>
        <FilterField label="Course Code">
          <input className={inputClass} value={filters.courseCode} onChange={(e) => update('courseCode', e.target.value)} placeholder="CSE-311" />
        </FilterField>
        <FilterField label="Year">
          <Select value={filters.year} onChange={(value) => update('year', value)} options={options.years} />
        </FilterField>
        <FilterField label="Batch">
          <Select value={filters.batch} onChange={(value) => update('batch', value)} options={options.batches} />
        </FilterField>
        <FilterField label="Semester">
          <Select value={filters.semester} onChange={(value) => update('semester', value)} options={options.semesters} />
        </FilterField>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button onClick={reset} className="rounded-full border border-blue-100 px-5 py-3 text-sm font-black text-[#18004d] hover:bg-blue-50">
          Reset Filters
        </button>
        <span className="rounded-full bg-white px-5 py-2.5 text-sm font-black text-[#18004d] ring-1 ring-yellow-300">
          Showing {resultCount} of {totalCount} items
        </span>
      </div>
    </div>
  );
}

function FilterField({ label, children }) {
  return <label><span className={labelClass}>{label}</span>{children}</label>;
}

function Select({ value, onChange, options }) {
  return (
    <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  );
}
