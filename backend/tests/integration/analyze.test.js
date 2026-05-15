// Testy integracyjne dla POST /analyze
// Uruchom: npx jest tests/integration/analyze.test.js
// Nie wywołuje prawdziwego Claude API — analyzeCV jest zamockowany

const request = require('supertest');
const app = require('../../src/app');

jest.mock('../../src/lib/claude');
const { analyzeCV } = require('../../src/lib/claude');

// ── Dane testowe ────────────────────────────────────────────────────────────

const SAMPLE_CV = 'Jan Kowalski\nDoświadczenie: React, Node.js\nWykształcenie: Informatyka';
const SAMPLE_JOB = 'Junior Developer\nWymagania: React, TypeScript, Docker, Git';

const VALID_GAPS = Array(5).fill({
  skill: 'Docker',
  category: 'Technologia',
  detail: 'Ogłoszenie wymaga Docker (sekcja Wymagania) — brak w CV',
});

const VALID_BULLETS = Array(3).fill({
  original: 'Pracowałem z React',
  rewritten: 'Budowałem interfejsy w React 18 — odpowiada wymaganiu z ogłoszenia',
});

// ── Pomocnicze ──────────────────────────────────────────────────────────────

// Parsuje SSE body do tablicy obiektów { type, payload? }
function parseSSE(body) {
  return body
    .split('\n\n')
    .filter(block => block.startsWith('data: '))
    .map(block => JSON.parse(block.slice(6)));
}

// Wysyła POST /analyze i zbiera pełne SSE body jako string
function postSSE(fields) {
  let req = request(app).post('/analyze');
  for (const [key, value] of Object.entries(fields)) {
    req = req.field(key, value);
  }
  return req.buffer(true).parse((res, cb) => {
    let data = '';
    res.setEncoding('utf8');
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => cb(null, data));
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Walidacja wejścia (odpowiedzi JSON 400, przed otwarciem SSE) ─────────────

describe('POST /analyze — walidacja wejścia', () => {
  it('zwraca 400 gdy brak cvText i cvFile', async () => {
    const res = await request(app)
      .post('/analyze')
      .field('jobPosting', SAMPLE_JOB);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/CV/);
  });

  it('zwraca 400 gdy cvText to same spacje', async () => {
    const res = await request(app)
      .post('/analyze')
      .field('cvText', '   ')
      .field('jobPosting', SAMPLE_JOB);

    expect(res.status).toBe(400);
  });

  it('zwraca 400 gdy brak jobPosting', async () => {
    const res = await request(app)
      .post('/analyze')
      .field('cvText', SAMPLE_CV);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/ogłoszenie/i);
  });

  it('nie wywołuje analyzeCV przy błędnym wejściu', async () => {
    await request(app).post('/analyze').field('jobPosting', SAMPLE_JOB);

    expect(analyzeCV).not.toHaveBeenCalled();
  });
});

// ── Happy path ───────────────────────────────────────────────────────────────

describe('POST /analyze — happy path', () => {
  beforeEach(() => {
    analyzeCV.mockImplementation(async ({ onEvent }) => {
      onEvent('score', { matched: 8, total: 12 });
      onEvent('gaps', VALID_GAPS);
      onEvent('bullets', VALID_BULLETS);
      onEvent('done', null);
    });
  });

  it('odpowiada 200 i Content-Type: text/event-stream', async () => {
    const res = await postSSE({ cvText: SAMPLE_CV, jobPosting: SAMPLE_JOB });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/event-stream/);
  });

  it('wysyła zdarzenia score, gaps, bullets, done', async () => {
    const res = await postSSE({ cvText: SAMPLE_CV, jobPosting: SAMPLE_JOB });
    const events = parseSSE(res.body);
    const types = events.map(e => e.type);

    expect(types).toContain('score');
    expect(types).toContain('gaps');
    expect(types).toContain('bullets');
    expect(types).toContain('done');
  });

  it('score.payload zawiera matched i total', async () => {
    const res = await postSSE({ cvText: SAMPLE_CV, jobPosting: SAMPLE_JOB });
    const scoreEvent = parseSSE(res.body).find(e => e.type === 'score');

    expect(scoreEvent.payload.matched).toBe(8);
    expect(scoreEvent.payload.total).toBe(12);
  });

  it('wywołuje analyzeCV z przyciętym CV i ogłoszeniem', async () => {
    await postSSE({ cvText: SAMPLE_CV, jobPosting: SAMPLE_JOB });

    expect(analyzeCV).toHaveBeenCalledWith(expect.objectContaining({
      cvText: SAMPLE_CV,
      jobPosting: SAMPLE_JOB,
      onEvent: expect.any(Function),
    }));
  });
});

// ── Obsługa błędów analyzeCV ─────────────────────────────────────────────────

describe('POST /analyze — błędy analyzeCV', () => {
  it('wysyła SSE error event gdy analyzeCV rzuca wyjątek', async () => {
    analyzeCV.mockImplementation(async ({ onEvent }) => {
      onEvent('error', { message: 'Claude API niedostępny' });
      throw new Error('Claude API niedostępny');
    });

    const res = await postSSE({ cvText: SAMPLE_CV, jobPosting: SAMPLE_JOB });
    const events = parseSSE(res.body);
    const errorEvent = events.find(e => e.type === 'error');

    expect(errorEvent).toBeDefined();
    expect(errorEvent.payload.message).toContain('Claude API niedostępny');
  });

  it('kończy SSE po błędzie (res.end wywołany)', async () => {
    analyzeCV.mockImplementation(async ({ onEvent }) => {
      onEvent('error', { message: 'timeout' });
      throw new Error('timeout');
    });

    // Jeśli res.end nie zostałby wywołany, request by się nie zakończył
    const res = await postSSE({ cvText: SAMPLE_CV, jobPosting: SAMPLE_JOB });

    expect(res.status).toBe(200); // 200 bo SSE już otwarte, błąd jest w body
  });
});
