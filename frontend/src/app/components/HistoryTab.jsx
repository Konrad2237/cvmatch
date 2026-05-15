'use client';

import { useState, useEffect } from 'react';

const LS_HISTORY = 'cvmatch_history';

// Props:
//   onLoad({ results, jobSnippet }) — load a saved entry into the Analiza tab
export default function HistoryTab({ onLoad }) {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    try {
      setEntries(JSON.parse(localStorage.getItem(LS_HISTORY) || '[]'));
    } catch {}
  }, []);

  function remove(id) {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    localStorage.setItem(LS_HISTORY, JSON.stringify(updated));
  }

  if (entries.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl border border-gray-200 text-center text-gray-400 text-sm">
        Brak zapisanych analiz. Po zakończeniu analizy kliknij "Zapisz analizę".
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map(entry => {
        const { matchScore } = entry.results;
        const totalScore = matchScore.requiredScore + matchScore.optionalMatched;
        const totalMax   = matchScore.requiredTotal * 2 + matchScore.optionalTotal;
        const pct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
        const date = new Date(entry.savedAt).toLocaleDateString('pl-PL', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        });

        return (
          <div key={entry.id} className="bg-white p-4 rounded-xl border border-gray-200 flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 mb-1">{date}</p>
              <p className="text-sm text-gray-700 truncate">{entry.jobSnippet || '—'}</p>
              <p className="text-sm font-semibold text-gray-800 mt-1">
                {totalScore}/{totalMax} pkt &nbsp;·&nbsp; {pct}%
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => onLoad(entry)}
                className="text-sm px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                Wczytaj
              </button>
              <button
                onClick={() => remove(entry.id)}
                className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
              >
                Usuń
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { LS_HISTORY };
