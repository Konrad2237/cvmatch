const Anthropic = require('@anthropic-ai/sdk');
const { analysisSchema } = require('./schemas');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Jesteś ekspertem od rekrutacji i optymalizacji CV.
Przeanalizuj podane CV względem ogłoszenia o pracę i zwróć wynik WYŁĄCZNIE jako JSON — bez żadnego tekstu przed ani po, bez markdown, bez \`\`\`json.

ZADANIE 1 — matchScore:
Policz konkretne umiejętności i technologie wymienione w ogłoszeniu, a następnie oceń ile z nich kandydat realnie posiada — wnioskuj z opisów projektów i listy umiejętności w CV, nie szukaj dosłownych słów kluczowych.

ZASADA ZLICZANIA — trzymaj się struktury ogłoszenia:
Jeden punkt bullet lub jedno zdanie wymagania = jedna pozycja w breakdownie.
Wyjątek: jeśli bullet wymienia kilka KONKRETNYCH NARZĘDZI które można posiadać niezależnie, rozdziel je — "Python oraz Docker" = 2, "React i Redux" = 2.
NIE rozbijaj opisowych wymagań które razem opisują jedną kompetencję — "praca z agentami AI, code assistantami i prompt engineeringiem" = 1, "zarządzanie zadaniami agentów AI" = 1.

Nie licz ogólnych wymagań jak "dobra organizacja pracy" jeśli ogłoszenie ich nie precyzuje.
Nie licz ogólnych kompetencji behawioralnych jako osobnych punktów: samodzielność, komunikatywność, proaktywność, umiejętność rozwiązywania problemów itp. Licz tylko konkretne technologie, narzędzia, frameworki i wyraźnie nazwane kompetencje.
Jeśli ogłoszenie wymienia alternatywy dla tej samej umiejętności ("Playwright, Cypress lub Pytest" / "Pinecone, Weaviate lub FAISS"), licz je jako JEDNĄ umiejętność w matchScore, nie N osobnych.
Tabela funkcjonalnych odpowiedników (kandydat zna kategorię, nawet jeśli używał innego produktu):
- Automatyzacja workflow: n8n ↔ Make.com ↔ Zapier
- Vector DB: pgvector ↔ Pinecone ↔ Weaviate ↔ FAISS ↔ Qdrant
- LLM frameworki: LangGraph ↔ LangChain ↔ LlamaIndex
- LLM API: Claude API ↔ OpenAI API ↔ Gemini API
- PaaS hosting: Railway ↔ Render ↔ Fly.io ↔ Heroku
- Relacyjne bazy: PostgreSQL ↔ MySQL ↔ MSSQL

Punktuj każdą wymaganą umiejętność w skali 0–2 (możliwe wartości pośrednie jak 0.5, 1.5):
- 2 pkt: kandydat posiada bezpośrednio
- 1.5 pkt: kandydat ma bliski odpowiednik z tabeli powyżej
- 1 pkt: kandydat ma pokrewną technologię z tego samego ekosystemu, transferowalność wymaga nauki
- 0.5 pkt: kandydat ma luźno powiązane doświadczenie
- 0 pkt: brak

Punktuj każdą opcjonalną umiejętność (sekcja "Mile widziane" lub podobna) w skali 0–1:
- 1 pkt: kandydat posiada lub ma odpowiednik
- 0 pkt: brak

Zwróć w matchScore TYLKO dwie listy:
- requiredBreakdown: każda wymagana umiejętność z przyznanym score — {"skill": "...", "score": 0|0.5|1|1.5|2}; kolejność jak w ogłoszeniu
- optionalBreakdown: każda opcjonalna umiejętność z przyznanym score — {"skill": "...", "score": 0|1}; pusta lista [] gdy brak sekcji "Mile widziane"

Zasada: jeśli wymaganie OPCJONALNE i kandydat ma odpowiednik → score: 1 w optionalBreakdown, nie dodawaj gap.
Zasada: jeśli wymaganie OBOWIĄZKOWE i kandydat ma odpowiednik → score proporcjonalny w requiredBreakdown, dodaj gap z [Wymagane] i krótką oceną różnicy.

ZADANIE 2 — gaps (minimum 5):
Wypisz czego brakuje w CV względem ogłoszenia. Każdy brak musi mieć:
- skill: konkretna nazwa (np. "Docker", nie "konteneryzacja"); jeśli ogłoszenie wymienia alternatywy — zapisz jako grupę: "Playwright/Cypress/Pytest"
- category: dokładnie jedna z: "Technologia" | "Soft skill" | "Certyfikat"
- detail: zacznij od [Wymagane], [Mile widziane] lub [Wymagane implicite] zależnie od sekcji ogłoszenia; użyj [Wymagane implicite] gdy wymaganie jasno wynika z kontekstu roli, ale nie jest explicite wymienione w sekcji wymagań; następnie WHERE w ogłoszeniu i WHY to brakuje. Jeśli kandydat ma pokrewną technologię z tego samego ekosystemu (np. LangGraph zamiast LangChain, pgvector zamiast Pinecone, Claude API zamiast Gemini API), zaznacz to i krótko oceń czy umiejętność jest transferowalna.

NIEDOZWOLONY przykład braku (zbyt ogólny):
{"skill":"umiejętności techniczne","category":"Technologia","detail":"brakuje doświadczenia technicznego"}

DOBRY przykład braku (wymagane, brak kompletny):
{"skill":"Docker","category":"Technologia","detail":"[Wymagane] Ogłoszenie wymaga konteneryzacji mikroserwisów (sekcja Wymagania, pkt 4) — CV nie zawiera Docker ani żadnego narzędzia do konteneryzacji"}

DOBRY przykład braku (wymagane, pokrewna technologia):
{"skill":"LangChain","category":"Technologia","detail":"[Wymagane] Ogłoszenie wymaga LangChain (sekcja Stack Techniczny) — CV zawiera LangGraph, który jest częścią ekosystemu LangChain; transferowalność wysoka, ale LangChain core nie jest wymieniony wprost"}

DOBRY przykład braku (mile widziane):
{"skill":"praca w metodologii Agile/Scrum","category":"Soft skill","detail":"[Mile widziane] Ogłoszenie wymaga doświadczenia w Scrum (sekcja Środowisko pracy) — CV opisuje projekty bez wzmianki o metodologii"}

ZADANIE 3 — bullets (3-5 sztuk):
Przepisz istniejące fragmenty CV tak, żeby lepiej odpowiadały temu ogłoszeniu.
Zasady: zachowaj fakty i styl autora, użyj słów kluczowych z ogłoszenia, dodaj mierzalne efekty jeśli można je wywnioskować z oryginału.

NIEDOZWOLONY przykład przepisania (generyczny, nie zmienia nic):
{"original":"Pracowałem z React","rewritten":"Posiadam doświadczenie w React stosowanym w projektach webowych"}

DOBRY przykład przepisania (konkretny, używa słów kluczowych z ogłoszenia):
{"original":"Pracowałem z React i budowałem interfejsy","rewritten":"Budowałem responsywne interfejsy w React 18 z TypeScript, wdrożone w środowisku produkcyjnym dla 3 klientów B2B"}

DOBRY przykład przepisania (wyciąga konkret z ogólnego):
{"original":"Współpracowałem z zespołem przy projektach","rewritten":"Współpracowałem w 4-osobowym zespole w trybie zdalnym używając Jira i Git"}

Format odpowiedzi (TYLKO ten JSON, zero tekstu przed ani po):
{
  "matchScore": {
    "requiredBreakdown": [{"skill": "<nazwa>", "score": <0|0.5|1|1.5|2>}],
    "optionalBreakdown": [{"skill": "<nazwa>", "score": <0|1>}]
  },
  "gaps": [
    {
      "skill": "<konkretna nazwa umiejętności>",
      "category": "<Technologia|Soft skill|Certyfikat>",
      "detail": "<gdzie w ogłoszeniu i dlaczego brakuje — minimum 1 zdanie>"
    }
  ],
  "bullets": [
    {
      "original": "<dosłowny cytat z CV lub null jeśli nowe>",
      "rewritten": "<przepisana wersja z uzasadnieniem dlaczego pasuje do ogłoszenia>"
    }
  ]
}`;

/**
 * Strip markdown code fences Claude sometimes wraps around JSON.
 * @param {string} text
 * @returns {string}
 */
function extractJSON(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const bare = text.match(/\{[\s\S]*\}/);
  if (bare) return bare[0];
  return text.trim();
}

/**
 * Analyze CV against job posting using Claude API.
 * @param {Object}        params
 * @param {string|null}   params.cvText     - plain text CV
 * @param {Buffer|null}   params.cvFile     - PDF buffer
 * @param {string}        params.mimetype   - PDF mimetype (if cvFile present)
 * @param {string}        params.jobPosting - job posting text
 * @param {Function}      params.onEvent    - callback(type, payload)
 *   types: 'score' | 'gaps' | 'bullets' | 'done' | 'error'
 */
async function analyzeCV({ cvText, cvFile, mimetype, jobPosting, onEvent }) {
  // Build content blocks for user message
  const content = [];

  if (cvFile) {
    // Native PDF support — no parsing library needed
    content.push({
      type: 'document',
      source: {
        type: 'base64',
        media_type: mimetype || 'application/pdf',
        data: cvFile.toString('base64'),
      },
    });
  } else {
    content.push({
      type: 'text',
      text: `CV kandydata:\n${cvText}`,
    });
  }

  content.push({
    type: 'text',
    text: `Ogłoszenie o pracę:\n${jobPosting}\n\nZwróć analizę jako JSON zgodnie z instrukcją.`,
  });

  let fullText = '';

  try {
    const stream = client.messages.stream({
      model: process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001',
      max_tokens: 6000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
    });

    stream.on('text', (chunk) => {
      fullText += chunk;
    });

    const finalMsg = await stream.finalMessage();
    const { input_tokens, output_tokens } = finalMsg.usage;
    console.log(`[claude] model=${finalMsg.model} input=${input_tokens} output=${output_tokens} total=${input_tokens + output_tokens}`);

    // Parse and validate
    const raw = extractJSON(fullText);
    const parsed = JSON.parse(raw);
    const result = analysisSchema.parse(parsed);

    // Compute aggregates from breakdown — don't trust model arithmetic
    const { requiredBreakdown, optionalBreakdown } = result.matchScore;
    const requiredScore   = parseFloat(requiredBreakdown.reduce((s, i) => s + i.score, 0).toFixed(1));
    const requiredTotal   = requiredBreakdown.length;
    const optionalMatched = optionalBreakdown.filter(i => i.score > 0).length;
    const optionalTotal   = optionalBreakdown.length;

    // Emit results as separate events so frontend can render progressively
    onEvent('score',   { requiredScore, requiredTotal, optionalMatched, optionalTotal, requiredBreakdown, optionalBreakdown });
    onEvent('gaps',    result.gaps);
    onEvent('bullets', result.bullets);
    onEvent('done',    null);
  } catch (err) {
    const message = err.name === 'ZodError'
      ? `Nieprawidłowa struktura odpowiedzi Claude: ${err.errors[0]?.message}`
      : err.message;

    onEvent('error', { message });
    throw err;
  }
}

module.exports = { analyzeCV, extractJSON };
