import { RESOURCE_TYPES } from './resourceConstants';

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100';

export default function ResourceUploadModal({ form, options, uploading, onChange, onClose, onSubmit }) {
  const isProject = form.resource_type === 'Project';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-500">CR Upload</p>
            <h2 className="mt-2 text-2xl font-black text-[#18004d]">Upload Academic Resource</h2>
            <p className="mt-1 text-sm text-slate-500">Uploaded files publish directly to the resource archive.</p>
          </div>
          <button onClick={onClose} className="rounded-full bg-red-50 px-4 py-2 font-black text-red-600">✕</button>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Title">
              <input value={form.title} onChange={(e) => onChange('title', e.target.value)} placeholder="Lecture 05 - Database Normalization" className={inputClass} />
            </Field>
            <Field label="Resource Type">
              <select value={form.resource_type} onChange={(e) => onChange('resource_type', e.target.value)} className={inputClass}>
                {RESOURCE_TYPES.map((type) => <option key={type.key} value={type.key}>{type.label}</option>)}
              </select>
            </Field>
            <Field label="Course Code">
              <input value={form.course_code} onChange={(e) => onChange('course_code', e.target.value)} placeholder="CSE-311" className={inputClass} />
            </Field>
            <Field label="Batch">
              <input value={form.batch} onChange={(e) => onChange('batch', e.target.value)} placeholder="31" className={inputClass} />
            </Field>
            <Field label="Semester">
              <select value={form.semester} onChange={(e) => onChange('semester', e.target.value)} className={inputClass}>
                <option value="">Select semester</option>
                {options.semesters.filter((semester) => semester !== 'All Semesters').map((semester) => <option key={semester}>{semester}</option>)}
              </select>
            </Field>
            <Field label="Year">
              <input value={form.year} onChange={(e) => onChange('year', e.target.value)} placeholder="2026" className={inputClass} />
            </Field>
            {form.resource_type === 'Book' && (
              <>
                <Field label="Author">
                  <input value={form.author} onChange={(e) => onChange('author', e.target.value)} placeholder="Author name" className={inputClass} />
                </Field>
                <Field label="Edition">
                  <input value={form.edition} onChange={(e) => onChange('edition', e.target.value)} placeholder="4th Edition" className={inputClass} />
                </Field>
              </>
            )}
            {form.resource_type === 'Slide' && (
              <Field label="Lecture No">
                <input value={form.lecture_no} onChange={(e) => onChange('lecture_no', e.target.value)} placeholder="05" className={inputClass} />
              </Field>
            )}
            {isProject ? (
              <Field label="GitHub / Project Link">
                <input value={form.github_link} onChange={(e) => onChange('github_link', e.target.value)} placeholder="https://github.com/..." className={inputClass} />
              </Field>
            ) : (
              <Field label="PDF File">
                <input type="file" accept="application/pdf,.pdf" onChange={(e) => onChange('file', e.target.files?.[0] || null)} className={`${inputClass} file:mr-4 file:rounded-full file:border-0 file:bg-yellow-400 file:px-4 file:py-2 file:font-bold file:text-[#18004d]`} />
              </Field>
            )}
          </div>

          <div className="rounded-2xl bg-blue-50 p-4 text-sm text-slate-600">
            <strong className="text-[#18004d]">Note:</strong> Only CR/Admin users can upload. CR access is checked from <code>profiles.role/is_cr</code> and the existing <code>cr.university_email</code> table.
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-full border border-blue-100 px-6 py-3 font-black text-[#18004d]">Cancel</button>
            <button type="submit" disabled={uploading} className="rounded-full bg-yellow-400 px-6 py-3 font-black text-[#18004d] hover:bg-yellow-300 disabled:opacity-60">
              {uploading ? 'Uploading...' : 'Upload Resource'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-black uppercase tracking-wide text-[#18004d]">{label}</label>
      {children}
    </div>
  );
}
