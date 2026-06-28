import { RESOURCE_TYPES } from './resourceConstants';
import { normalizeResourceType } from './resourceHelpers';
import { GoPin } from "react-icons/go";

export default function ResourceCard({ item, onPreview, onDownload, onDelete }) {
  const type = normalizeResourceType(item.resource_type || item.type);
  const label = RESOURCE_TYPES.find((resourceType) => resourceType.key === type)?.label || type;

  return (
    <article className="rounded-3xl max-w-2xl border border-blue-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="mb-5 flex items-start justify-between gap-4">
        <span className="inline-flex items-center bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
          <GoPin className="mr-1 text-sm" /> {label}
        </span>
        {item.year && <span className="rounded-full bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700">{item.year}</span>}
      </div>

      <h3 className="text-xl font-black text-[#18004d]">
        {item.title || item.file_name || 'Untitled Resource'}
      </h3>

      <p className="mt-3 text-sm font-semibold text-slate-500 flex flex-col gap-1">
        <li type="disc">{`Course Code: ${item.course_code || 'No course code'}`}</li>
        <li>{item.batch ? `  Batch : ${item.batch}` : ''}</li>
        <li>{item.semester ? `Semester : ${item.semester}` : ''}</li>
      </p>

      {item.author && (
        <p className="mt-2 text-sm text-slate-500">
          Author: {item.author}{item.edition ? `  ${item.edition}` : ''}
        </p>
      )}
      {item.lecture_no && <p className="mt-2 text-sm text-slate-500">Lecture No: {item.lecture_no}</p>}

      <div className="mt-6 flex flex-wrap gap-3">
        <button onClick={onDownload} className="rounded-full bg-[#18004d] px-5 py-3 text-sm font-black text-white hover:bg-[#2a0b68]">
          Download
        </button>
        <button onClick={onPreview} className="rounded-full border border-blue-100 px-5 py-3 text-sm font-black text-[#18004d] hover:bg-blue-50">
          Preview
        </button>
        {onDelete && <button onClick={onDelete} className="rounded-full px-4 py-3 text-sm font-bold text-red-700 hover:bg-red-50">Remove</button>}
      </div>
    </article>
  );
}
