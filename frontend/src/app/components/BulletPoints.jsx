'use client';

import { useState } from 'react';

// Props:
//   bullets: Array<{ original?: string, rewritten: string }>
export default function BulletPoints({ bullets }) {
  const [copiedIndex, setCopiedIndex] = useState(null);

  async function handleCopy(text, index) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // Clipboard API blocked (http or iframe) — silent fail
    }
  }

  return (
    <div className="mt-6 p-6 bg-white rounded-xl border border-gray-200">
      <h2 className="text-lg font-semibold text-gray-800 mb-1">
        Przepisane bullet pointy
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Gotowe do wklejenia bezpośrednio do CV.
      </p>

      <div className="space-y-3">
        {bullets.map((bullet, i) => (
          <div key={i} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            {bullet.original && (
              <p className="text-xs text-gray-400 mb-2 line-through">{bullet.original}</p>
            )}
            <div className="flex items-start gap-3">
              <p className="text-sm text-gray-800 flex-1 leading-relaxed">
                • {bullet.rewritten}
              </p>
              <button
                onClick={() => handleCopy(bullet.rewritten, i)}
                className={`shrink-0 text-xs font-medium px-3 py-1 rounded-md border transition-colors ${
                  copiedIndex === i
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'
                }`}
              >
                {copiedIndex === i ? 'Skopiowano!' : 'Kopiuj'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
