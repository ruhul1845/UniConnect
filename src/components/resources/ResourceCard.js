import { Badge, Card } from '../ui/Card';
import { LinkButton } from '../ui/Button';
export default function ResourceCard({ resource }) {
  const meta = [resource.course_code, resource.batch && `Batch ${resource.batch}`, resource.semester, resource.year].filter(Boolean).join(' • ');
  return <Card className="p-6"><Badge>{resource.resource_type}</Badge><h3 className="mt-4 text-xl font-black text-uniBlue">{resource.title}</h3><p className="mt-2 text-sm font-semibold text-slate-500">{meta || 'No metadata'}</p>{resource.description && <p className="mt-3 text-sm leading-6 text-slate-600">{resource.description}</p>}<div className="mt-6 flex flex-wrap gap-3">{resource.file_url ? <><LinkButton variant="navy" href={resource.file_url} target="_blank" rel="noreferrer">Preview</LinkButton><LinkButton href={resource.file_url} download>Download</LinkButton></> : <><button className="rounded-full bg-slate-200 px-5 py-2.5 text-sm font-bold text-slate-500" disabled>No Preview</button><button className="rounded-full bg-slate-200 px-5 py-2.5 text-sm font-bold text-slate-500" disabled>Download</button></>}</div></Card>;
}
