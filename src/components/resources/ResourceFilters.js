import { Field, inputClass, selectClass } from '../ui/Form';
import { Button } from '../ui/Button';

export default function ResourceFilters({ filters, setFilters, unique, resultCount }) {
  const update = (key, value) => setFilters({ ...filters, [key]: value });
  return (
    <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-xl shadow-slate-200/50">
      <div className="grid gap-4 md:grid-cols-4">
        <Field label="Search"><input className={inputClass} placeholder="English or Bengali" value={filters.search} onChange={(e) => update('search', e.target.value)} /></Field>
        <Field label="Course Code"><input className={inputClass} placeholder="CSE-311" value={filters.course_code} onChange={(e) => update('course_code', e.target.value)} /></Field>
        <Field label="Year"><select className={selectClass} value={filters.year} onChange={(e) => update('year', e.target.value)}><option value="">All Years</option>{unique('year').map(y => <option key={y} value={y}>{y}</option>)}</select></Field>
        <div className="flex items-end"><span className="rounded-full bg-blue-50 px-4 py-3 text-sm font-black text-uniBlue">{resultCount} results</span></div>
      </div>
    </div>
  );
}

export function ArchiveSidebar({ filters, setFilters, unique }) {
  const update = (key, value) => setFilters({ ...filters, [key]: value });
  return (
    <aside className="rounded-3xl border border-blue-100 bg-white p-5 shadow-xl shadow-slate-200/50">
      <h3 className="text-lg font-black text-uniBlue">Archive Navigation</h3>
      <p className="mt-1 text-sm text-slate-500">Filter using values found in Supabase.</p>
      <div className="mt-5 space-y-4">
        <Field label="Batch"><select className={selectClass} value={filters.batch} onChange={(e) => update('batch', e.target.value)}><option value="">All Batches</option>{unique('batch').map(v => <option key={v} value={v}>{v}</option>)}</select></Field>
        <Field label="Semester"><select className={selectClass} value={filters.semester} onChange={(e) => update('semester', e.target.value)}><option value="">All Semesters</option>{unique('semester').map(v => <option key={v} value={v}>{v}</option>)}</select></Field>
        <Button type="button" variant="outline" className="w-full" onClick={() => setFilters({ search: '', course_code: '', year: '', batch: '', semester: '' })}>Clear Filters</Button>
      </div>
    </aside>
  );
}
