'use client';

import { useState, useRef } from 'react';
import AnalyzeForm from './components/AnalyzeForm';
import ProfileTab from './components/ProfileTab';
import HistoryTab, { LS_HISTORY } from './components/HistoryTab';
import MatchScore from './components/MatchScore';
import GapAnalysis from './components/GapAnalysis';
import BulletPoints from './components/BulletPoints';
import StreamingStatus from './components/StreamingStatus';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function Home() {
  const [tab, setTab]           = useState('analiza'); // 'analiza' | 'profil' | 'historia'
  const [status, setStatus]     = useState('idle');    // idle | loading | done | error
  const [errorMessage, setErrorMessage] = useState('');
  const [results, setResults]   = useState({ matchScore: null, gaps: null, bullets: null });
  const [currentJob, setCurrentJob] = useState('');
  const [analysisSaved, setAnalysisSaved] = useState(false);

  const abortRef = useRef(null);

  async function handleAnalyze(formData) {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setCurrentJob(formData.get('jobPosting') || '');
    setStatus('loading');
    setErrorMessage('');
    setResults({ matchScore: null, gaps: null, bullets: null });
    setAnalysisSaved(false);

    let response;
    try {
      response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
    } catch (err) {
      if (err.name === 'AbortError') return;
      setErrorMessage('Nie można połączyć się z serwerem. Sprawdź czy backend działa.');
      setStatus('error');
      return;
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setErrorMessage(body.error || 'Błąd serwera. Spróbuj ponownie.');
      setStatus('error');
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          let event;
          try { event = JSON.parse(line.slice(6)); } catch { continue; }

          switch (event.type) {
            case 'score':   setResults(r => ({ ...r, matchScore: event.payload })); break;
            case 'gaps':    setResults(r => ({ ...r, gaps:       event.payload })); break;
            case 'bullets': setResults(r => ({ ...r, bullets:    event.payload })); break;
            case 'done':    setStatus('done'); break;
            case 'error':
              setErrorMessage(event.payload?.message || 'Błąd analizy. Spróbuj ponownie.');
              setStatus('error');
              break;
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      setErrorMessage('Połączenie przerwane podczas analizy. Spróbuj ponownie.');
      setStatus('error');
    }
  }

  function handleSaveAnalysis() {
    const entry = {
      id: Date.now(),
      savedAt: new Date().toISOString(),
      jobSnippet: currentJob.split('\n')[0].slice(0, 100).trim(),
      results,
    };
    const existing = JSON.parse(localStorage.getItem(LS_HISTORY) || '[]');
    localStorage.setItem(LS_HISTORY, JSON.stringify([entry, ...existing].slice(0, 20)));
    setAnalysisSaved(true);
    setTimeout(() => setAnalysisSaved(false), 2000);
  }

  function handleLoadEntry(entry) {
    setResults(entry.results);
    setCurrentJob(entry.jobSnippet);
    setStatus('done');
    setAnalysisSaved(false);
    setTab('analiza');
  }

  const TABS = [
    { key: 'analiza',  label: 'Analiza' },
    { key: 'profil',   label: 'Profil' },
    { key: 'historia', label: 'Historia' },
  ];

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">CVMatch</h1>
        <p className="text-gray-500 mb-6">
          Wklej CV i ogłoszenie — dostań konkretny feedback w 30 sekund.
        </p>

        {/* Tab navigation */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'profil'   && <ProfileTab />}
        {tab === 'historia' && <HistoryTab onLoad={handleLoadEntry} />}

        {tab === 'analiza' && (
          <>
            <AnalyzeForm onSubmit={handleAnalyze} disabled={status === 'loading'} />

            {status === 'loading' && <StreamingStatus />}

            {results.matchScore && <MatchScore score={results.matchScore} />}
            {results.gaps       && <GapAnalysis gaps={results.gaps} />}
            {results.bullets    && <BulletPoints bullets={results.bullets} />}

            {status === 'done' && (
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={handleSaveAnalysis}
                  className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Zapisz analizę
                </button>
                {analysisSaved && (
                  <span className="text-sm text-green-600 font-medium">Zapisano ✓</span>
                )}
              </div>
            )}

            {status === 'error' && (
              <p className="mt-6 text-sm text-red-600">{errorMessage}</p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
