import { resourceTypes } from './resourceUtils';
export default function ResourceTabs({ activeType, setActiveType }) {
  return <div className="my-6 flex flex-wrap gap-3">{resourceTypes.map(([value, label]) => <button key={value} onClick={() => setActiveType(value)} className={`rounded-full px-5 py-3 text-sm font-black transition ${activeType === value ? 'bg-uniGold text-uniBlue shadow-lg shadow-yellow-100 ring-1 ring-yellow-300' : 'bg-white text-uniBlue ring-1 ring-blue-100 hover:bg-blue-50'}`}>{label}</button>)}</div>;
}
