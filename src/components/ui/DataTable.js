export default function DataTable({ columns, rows, renderActions }) {
  return (
    <div className="overflow-x-auto rounded-3xl border border-blue-100 bg-white">
      <table className="min-w-full divide-y divide-blue-100 text-left text-sm">
        <thead className="bg-blue-50 text-xs font-black uppercase tracking-wide text-uniBlue"><tr>{columns.map(c => <th className="px-4 py-3" key={c.key}>{c.label}</th>)}{renderActions && <th className="px-4 py-3">Action</th>}</tr></thead>
        <tbody className="divide-y divide-blue-50">{rows.map((row, i) => <tr key={row.id || i} className="hover:bg-slate-50">{columns.map(c => <td className="px-4 py-3 text-slate-700" key={c.key}>{c.render ? c.render(row) : row[c.key] || '-'}</td>)}{renderActions && <td className="px-4 py-3">{renderActions(row)}</td>}</tr>)}</tbody>
      </table>
    </div>
  );
}
