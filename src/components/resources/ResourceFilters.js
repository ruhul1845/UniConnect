import { inputClass, selectClass } from '../ui/Form';

const labelClass = 'block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5';

export default function ResourceFilters({ filters, setFilters, unique, resultCount, totalCount }) {
  const update = (key, value) => setFilters({ ...filters, [key]: value });

  const reset = () =>
    setFilters({ search: '', course_code: '', year: '', batch: '', semester: '' });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5">

      {/* Row 1 — Search, Course Code, Year, Batch */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-4">

        <div>
          <label className={labelClass}>Search</label>
          <input
            className={inputClass}
            placeholder="Search resources..."
            value={filters.search}
            onChange={(e) => update('search', e.target.value)}
          />
        </div>

        <div>
          <label className={labelClass}>Course Code</label>
          <input
            className={inputClass}
            placeholder="CSE-311"
            value={filters.course_code}
            onChange={(e) => update('course_code', e.target.value)}
          />
        </div>

        <div>
          <label className={labelClass}>Year</label>
          <select
            className={selectClass}
            value={filters.year}
            onChange={(e) => update('year', e.target.value)}
          >
            <option value="">All Years</option>
            {unique('year').map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Batch</label>
          <select
            className={selectClass}
            value={filters.batch}
            onChange={(e) => update('batch', e.target.value)}
          >
            <option value="">All Batches</option>
            {unique('batch').map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

      </div>

      {/* Row 2 — Semester, Reset, Count badge */}
      <div className="mt-5 flex flex-wrap items-end gap-5">

        <div className="w-56">
          <label className={labelClass}>Semester</label>
          <select
            className={selectClass}
            value={filters.semester}
            onChange={(e) => update('semester', e.target.value)}
          >
            <option value="">All Semesters</option>
            {unique('semester').map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={reset}
          className="rounded-full border border-slate-300 bg-white px-6 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
        >
          Reset Filters
        </button>

        <span className="ml-auto rounded-full bg-yellow-100 px-5 py-2.5 text-sm font-black text-uniBlue ring-1 ring-yellow-300">
          Showing {resultCount} of {totalCount ?? resultCount} items
        </span>

      </div>

    </div>
  );
}