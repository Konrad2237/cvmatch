'use client';

import { useState } from 'react';

// Props:
//   onSubmit(formData: FormData) — called when user submits
//   disabled: boolean            — true while analysis is running
export default function AnalyzeForm({ onSubmit, disabled }) {
  const [cvMode, setCvMode] = useState('text'); // 'text' | 'file'
  const [cvText, setCvText] = useState('');
  const [cvFile, setCvFile] = useState(null);
  const [jobPosting, setJobPosting] = useState('');

  function handleSubmit(e) {
    e.preventDefault();

    // TODO: validate — at least one CV input must be non-empty
    // TODO: validate — jobPosting must not be empty

    const formData = new FormData();
    if (cvMode === 'file' && cvFile) {
      formData.append('cvFile', cvFile);
    } else {
      formData.append('cvText', cvText);
    }
    formData.append('jobPosting', jobPosting);

    onSubmit(formData);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-xl border border-gray-200">
      {/* CV section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Twoje CV
        </label>

        {/* TODO: styled tab switcher — text | PDF */}
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => setCvMode('text')}
            className={`text-sm px-3 py-1 rounded-md border ${cvMode === 'text' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600'}`}
          >
            Wklej tekst
          </button>
          <button
            type="button"
            onClick={() => setCvMode('file')}
            className={`text-sm px-3 py-1 rounded-md border ${cvMode === 'file' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600'}`}
          >
            Wgraj PDF
          </button>
        </div>

        {cvMode === 'text' ? (
          <textarea
            value={cvText}
            onChange={(e) => setCvText(e.target.value)}
            placeholder="Wklej treść CV..."
            rows={8}
            disabled={disabled}
            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
          />
        ) : (
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setCvFile(e.target.files[0])}
            disabled={disabled}
            className="block w-full text-sm text-gray-500"
          />
        )}
      </div>

      {/* Job posting section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Ogłoszenie o pracę
        </label>
        <textarea
          value={jobPosting}
          onChange={(e) => setJobPosting(e.target.value)}
          placeholder="Wklej treść ogłoszenia z Pracuj.pl / LinkedIn..."
          rows={6}
          disabled={disabled}
          className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
        />
      </div>

      <button
        type="submit"
        disabled={disabled}
        className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {disabled ? 'Analizuję...' : 'Analizuj'}
      </button>
    </form>
  );
}
