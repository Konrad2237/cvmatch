// Props:
//   roadmap: Array<{ skill: string, dlaczego: string, start: string }>
export default function LearningRoadmap({ roadmap }) {
  return (
    <div className="mt-6 p-6 bg-white rounded-xl border border-gray-200">
      <h2 className="text-lg font-semibold text-gray-800 mb-1">
        Learning roadmap
      </h2>
      <p className="text-sm text-gray-400 mb-5">
        Priorytetowa lista umiejętności do nauki — posortowana po ROI dla tej oferty.
      </p>

      <ol className="space-y-5">
        {roadmap.map((item, i) => (
          <li key={i} className="flex gap-4">
            {/* Priority number */}
            <span className="shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center mt-0.5">
              {i + 1}
            </span>

            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800 mb-1">{item.skill}</p>
              <p className="text-sm text-gray-500 mb-2">{item.dlaczego}</p>
              <div className="flex items-start gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <span className="shrink-0 text-blue-500 font-bold text-sm mt-0.5">→</span>
                <p className="text-sm text-gray-600">{item.start}</p>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
