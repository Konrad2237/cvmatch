'use client';

import { useState, useEffect, useRef } from 'react';

const LS_CV    = 'cvmatch_cv_text';
const LS_EXTRA = 'cvmatch_extra_skills';

// Props:
//   onSubmit(formData: FormData) — called when user submits
//   disabled: boolean            — true while analysis is running
export default function AnalyzeForm({ onSubmit, disabled }) {
  const [cvMode, setCvMode]     = useState('text'); // 'text' | 'file'
  const [cvText, setCvText]     = useState('');
  const [cvFile, setCvFile]     = useState(null);
  const [skills, setSkills]     = useState([]);   // saved chips
  const [skillInput, setSkillInput] = useState(''); // current input value
  const [jobPosting, setJobPosting] = useState('');
  const [saved, setSaved]       = useState(false);
  const inputRef = useRef(null);

  // Load saved profile on first render
  useEffect(() => {
    const savedCv     = localStorage.getItem(LS_CV) || '';
    const savedSkills = localStorage.getItem(LS_EXTRA);
    if (savedCv) setCvText(savedCv);
    if (savedSkills) {
      try { setSkills(JSON.parse(savedSkills)); } catch {}
    }
  }, []);

  function addSkill() {
    const val = skillInput.trim();
    if (!val || skills.includes(val)) return;
    setSkills(prev => [...prev, val]);
    setSkillInput('');
    inputRef.current?.focus();
  }

  function removeSkill(skill) {
    setSkills(prev => prev.filter(s => s !== skill));
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); addSkill(); }
  }

  function handleSave() {
    localStorage.setItem(LS_CV,    cvText);
    localStorage.setItem(LS_EXTRA, JSON.stringify(skills));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleSubmit(e) {
    e.preventDefault();

    const formData = new FormData();

    if (cvMode === 'file' && cvFile) {
      formData.append('cvFile', cvFile);
    } else {
      const fullCv = skills.length > 0
        ? `${cvText}\n\n---\nDodatkowe umiejętności i kontekst (poza formalnym CV):\n${skills.map(s => `- ${s}`).join('\n')}`
        : cvText;
      formData.append('cvText', fullCv);
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

      {/* Extra skills chip input — text mode only */}
      {cvMode === 'text' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Dodatkowe umiejętności
          </label>
          <p className="text-xs text-gray-400 mb-2">
            Narzędzia i umiejętności których nie ma w CV — Claude doliczy je do analizy.
          </p>

          {/* Chips */}
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {skills.map(skill => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 text-sm bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    disabled={disabled}
                    className="text-blue-400 hover:text-blue-700 leading-none disabled:opacity-50"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Input + Add button */}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Wpisz umiejętność i naciśnij Enter lub Dodaj..."
              disabled={disabled}
              className="flex-1 border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
            <button
              type="button"
              onClick={addSkill}
              disabled={disabled || !skillInput.trim()}
              className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              Dodaj
            </button>
          </div>
        </div>
      )}

      {/* Save profile button — text mode only */}
      {cvMode === 'text' && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={disabled}
            className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Zapisz profil
          </button>
          {saved && (
            <span className="text-sm text-green-600 font-medium">Zapisano ✓</span>
          )}
        </div>
      )}

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
