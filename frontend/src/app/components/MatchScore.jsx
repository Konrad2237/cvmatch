// Props:
//   score: { matched: number, total: number }
export default function MatchScore({ score }) {
  const { matched, total } = score;
  const pct = total > 0 ? Math.round((matched / total) * 100) : 0;

  const color =
    pct >= 70 ? { bar: 'bg-green-500',  text: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200' } :
    pct >= 40 ? { bar: 'bg-yellow-400', text: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200' } :
                { bar: 'bg-red-500',    text: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200' };

  return (
    <div className={`mt-8 p-6 bg-white rounded-xl border ${color.border}`}>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Dopasowanie umiejętności
      </h2>

      <div className="flex items-end gap-3 mb-4">
        <span className={`text-5xl font-bold ${color.text}`}>{matched}</span>
        <span className="text-2xl text-gray-400 mb-1">z {total}</span>
        <span className="text-gray-500 mb-1 text-sm">wymaganych umiejętności</span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-3">
        <div
          className={`${color.bar} h-3 rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={`mt-2 text-sm font-medium ${color.text}`}>{pct}% dopasowania</p>
    </div>
  );
}
