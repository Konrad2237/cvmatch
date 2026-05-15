// Props:
//   score: { requiredScore, requiredTotal, optionalMatched, optionalTotal }
export default function MatchScore({ score }) {
  const { requiredScore, requiredTotal, optionalMatched, optionalTotal } = score;
  const requiredMax = requiredTotal * 2;
  const pct = requiredMax > 0 ? Math.round((requiredScore / requiredMax) * 100) : 0;

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

      {/* Progress bar — based on required score only */}
      <div className="w-full bg-gray-100 rounded-full h-3">
        <div
          className={`${color.bar} h-3 rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={`mt-2 text-sm font-medium ${color.text}`}>{pct}% dopasowania wymagań</p>
    </div>
  );
}
