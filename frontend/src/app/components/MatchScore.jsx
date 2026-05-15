// Props:
//   score: { requiredScore, requiredTotal, optionalMatched, optionalTotal,
//            requiredBreakdown, optionalBreakdown }
export default function MatchScore({ score }) {
  const { requiredScore, requiredTotal, optionalMatched, optionalTotal,
          requiredBreakdown = [], optionalBreakdown = [] } = score;
  const requiredMax  = requiredTotal * 2;
  const totalScore   = requiredScore + optionalMatched;
  const totalMax     = requiredMax + optionalTotal;
  const pct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

  const color =
    pct >= 70 ? { bar: 'bg-green-500',  text: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200' } :
    pct >= 40 ? { bar: 'bg-yellow-400', text: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200' } :
                { bar: 'bg-red-500',    text: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200' };

  return (
    <div className={`mt-8 p-6 bg-white rounded-xl border ${color.border}`}>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Dopasowanie umiejętności
      </h2>

      <div className="flex items-end gap-8 mb-4">
        <div>
          <div className="flex items-end gap-2">
            <span className={`text-5xl font-bold ${color.text}`}>{requiredScore}</span>
            <span className="text-2xl text-gray-400 mb-1">z {requiredMax} pkt</span>
          </div>
          <span className="text-gray-500 text-sm">wymaganych</span>
        </div>

        {optionalTotal > 0 && (
          <>
            <span className="text-gray-300 text-3xl pb-5">•</span>
            <div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-gray-500">{optionalMatched}</span>
                <span className="text-xl text-gray-400 mb-1">z {optionalTotal}</span>
              </div>
              <span className="text-gray-500 text-sm">mile widzianych</span>
            </div>
          </>
        )}
      </div>

      {/* Progress bar — combined required + optional */}
      <div className="w-full bg-gray-100 rounded-full h-3">
        <div
          className={`${color.bar} h-3 rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={`mt-2 text-sm font-medium ${color.text}`}>
        {totalScore} z {totalMax} pkt łącznie • {pct}% dopasowania
      </p>

      {/* Per-skill breakdown */}
      {requiredBreakdown.length > 0 && (
        <div className="mt-5 pt-4 border-t border-gray-100">
          <BreakdownSection title="Wymagane" items={requiredBreakdown} max={2} />
          {optionalBreakdown.length > 0 && (
            <BreakdownSection title="Mile widziane" items={optionalBreakdown} max={1} className="mt-4" />
          )}
        </div>
      )}
    </div>
  );
}

function BreakdownSection({ title, items, max, className = '' }) {
  return (
    <div className={className}>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{title}</p>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="text-sm text-gray-700 truncate">{item.skill}</span>
            <ScoreChip score={item.score} max={max} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoreChip({ score, max }) {
  const ratio = max > 0 ? score / max : 0;
  const colorClass =
    ratio >= 1    ? 'text-green-700 bg-green-50' :
    ratio >= 0.75 ? 'text-lime-700 bg-lime-50' :
    ratio >= 0.5  ? 'text-yellow-700 bg-yellow-50' :
    ratio > 0     ? 'text-orange-600 bg-orange-50' :
                    'text-gray-400 bg-gray-50';

  const label = `${score}/${max}`;

  return (
    <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${colorClass}`}>
      {label}
    </span>
  );
}
