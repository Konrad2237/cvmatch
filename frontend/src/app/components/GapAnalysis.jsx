// Badge colors match the Zod enum in backend/src/lib/schemas.js
const CATEGORY_COLORS = {
  'Technologia': 'bg-blue-100 text-blue-800',
  'Soft skill':  'bg-purple-100 text-purple-800',
  'Certyfikat':  'bg-orange-100 text-orange-800',
};

// Props:
//   gaps: Array<{ skill: string, category: string, detail: string }>
export default function GapAnalysis({ gaps }) {
  return (
    <div className="mt-6 p-6 bg-white rounded-xl border border-gray-200">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Czego brakuje ({gaps.length})
      </h2>

      <ul className="space-y-3">
        {gaps.map((gap, i) => (
          <li key={i} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
            <span className={`mt-0.5 shrink-0 text-xs font-medium px-2 py-1 rounded-full ${CATEGORY_COLORS[gap.category] ?? 'bg-gray-100 text-gray-700'}`}>
              {gap.category}
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-800">{gap.skill}</p>
              <p className="text-sm text-gray-500">{gap.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
