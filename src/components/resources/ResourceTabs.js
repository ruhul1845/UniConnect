import { RESOURCE_TYPES } from './resourceConstants';

export default function ResourceTabs({ activeType, setActiveType }) {
  return (
    <div className="mt-6 flex flex-wrap mx-auto justify-center gap-3">
      {RESOURCE_TYPES.map((type) => (
        <button
          key={type.key}
          onClick={() => setActiveType(type.key)}
          className={`rounded-full border px-5 py-3 font-black transition ${activeType === type.key
            ? 'border-yellow-400 bg-yellow-400 text-[#18004d]'
            : 'border-blue-100 bg-white text-[#18004d] hover:bg-blue-50'
            }`}
        >
          {type.label}
        </button>
      ))}
    </div>
  );
}
