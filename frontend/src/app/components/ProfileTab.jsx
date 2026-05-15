'use client';

import { useState, useEffect, useRef } from 'react';

export const LS_CV    = 'cvmatch_cv_text';
export const LS_EXTRA = 'cvmatch_extra_skills';

export default function ProfileTab() {
  const [cvText, setCvText]         = useState('');
  const [skills, setSkills]         = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [saved, setSaved]           = useState(false);
  const inputRef = useRef(null);

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

  return (
    <div className="space-y-6 bg-white p-6 rounded-xl border border-gray-200">

      {/* CV */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Twoje CV
        </label>
        <p className="text-xs text-gray-400 mb-2">
          Bazowe CV które leci do każdej analizy.
        </p>
        <textarea
          value={cvText}
          onChange={(e) => setCvText(e.target.value)}
          placeholder="Wklej treść CV..."
          rows={10}
          className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Extra skills chips */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Dodatkowe umiejętności
        </label>
        <p className="text-xs text-gray-400 mb-2">
          Narzędzia i umiejętności których nie ma w CV — Claude doliczy je do każdej analizy.
        </p>

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
                  className="text-blue-400 hover:text-blue-700 leading-none"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Wpisz umiejętność i naciśnij Enter lub Dodaj..."
            className="flex-1 border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={addSkill}
            disabled={!skillInput.trim()}
            className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            Dodaj
          </button>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleSave}
          className="text-sm px-5 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
        >
          Zapisz profil
        </button>
        {saved && (
          <span className="text-sm text-green-600 font-medium">Zapisano ✓</span>
        )}
      </div>
    </div>
  );
}
