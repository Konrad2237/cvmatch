'use client';

import { useState, useRef } from 'react';
import AnalyzeForm from './components/AnalyzeForm';
import MatchScore from './components/MatchScore';
import GapAnalysis from './components/GapAnalysis';
import BulletPoints from './components/BulletPoints';
import StreamingStatus from './components/StreamingStatus';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function Home() {
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [errorMessage, setErrorMessage] = useState('');
  const [results, setResults] = useState({
    matchScore: null,
    gaps: null,
    bullets: null,
  });

  // Ref lets us abort the fetch if user navigates away mid-stream
  const abortRef = useRef(null);

  async function handleAnalyze(formData) {
    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus('loading');
    setErrorMessage('');
    setResults({ matchScore: null, gaps: null, bullets: null });

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

    // Backend returns 400 JSON before opening SSE
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setErrorMessage(body.error || 'Błąd serwera. Spróbuj ponownie.');
      setStatus('error');
      return;
    }

    // Read SSE stream line by line
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE events are separated by double newline
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete last line in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          let event;
          try {
            event = JSON.parse(line.slice(6)); // strip "data: "
          } catch {
            continue; // malformed line — skip
          }

          switch (event.type) {
            case 'score':
              setResults(r => ({ ...r, matchScore: event.payload }));
              break;
            case 'gaps':
              setResults(r => ({ ...r, gaps: event.payload }));
              break;
            case 'bullets':
              setResults(r => ({ ...r, bullets: event.payload }));
              break;
            case 'done':
              setStatus('done');
              break;
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

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">CVMatch</h1>
        <p className="text-gray-500 mb-8">
          Wklej CV i ogłoszenie — dostań konkretny feedback w 30 sekund.
        </p>

        <AnalyzeForm onSubmit={handleAnalyze} disabled={status === 'loading'} />

        {status === 'loading' && <StreamingStatus />}

        {results.matchScore && <MatchScore score={results.matchScore} />}
        {results.gaps && <GapAnalysis gaps={results.gaps} />}
        {results.bullets && <BulletPoints bullets={results.bullets} />}

        {status === 'error' && (
          <p className="mt-6 text-sm text-red-600">
            {errorMessage}
          </p>
        )}
      </div>
    </main>
  );
}
