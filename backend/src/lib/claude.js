const Anthropic = require('@anthropic-ai/sdk');
const { analysisSchema } = require('./schemas');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Jesteś ekspertem od rekrutacji i optymalizacji CV.
Przeanalizuj podane CV względem ogłoszenia o pracę i zwróć wynik WYŁĄCZNIE jako JSON — bez żadnego tekstu przed ani po, bez markdown, bez \`\`\`json.

ZADANIE 1 — matchScore:
Policz konkretne umiejętności i technologie wymienione w ogłoszeniu, a następnie oceń ile z nich kandydat realnie posiada — wnioskuj z opisów projektów i listy umiejętności w CV, nie szukaj dosłownych słów kluczowych.
Licz każdą technologię/umiejętność osobno. "React i Redux" = 2, nie 1.
Nie licz ogólnych wymagań jak "dobra organizacja pracy" jeśli ogłoszenie ich nie precyzuje.
Nie licz ogólnych kompetencji behawioralnych jako osobnych punktów: samodzielność, komunikatywność, proaktywność, dyspozycyjność, umiejętność rozwiązywania problemów itp. Licz tylko konkretne technologie, narzędzia i frameworki.
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

Zwróć w matchScore:
- requiredScore: suma punktów za wymagane (może być ułamkowa — używaj kropki jako separatora: 8.5 nie 8,5)
- requiredTotal: liczba wymaganych umiejętności
- optionalMatched: liczba opcjonalnych które kandydat posiada
- optionalTotal: liczba opcjonalnych umiejętności w ogłoszeniu (0 jeśli brak sekcji)
- requiredBreakdown: lista każdej wymaganej umiejętności z przyznanym score — {"skill": "...", "score": 0|0.5|1|1.5|2}; kolejność jak w ogłoszeniu
- optionalBreakdown: lista każdej opcjonalnej umiejętności z przyznanym score — {"skill": "...", "score": 0|1}; puste gdy optionalTotal === 0

Zasada: jeśli wymaganie OPCJONALNE i kandydat ma odpowiednik → optionalMatched += 1, nie dodawaj gap.
Zasada: jeśli wymaganie OBOWIĄZKOWE i kandydat ma odpowiednik → requiredScore += 1, dodaj gap z [Wymagane] i krótką oceną różnicy.

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
{"original":"Pracowałem z React i budowałem interfejsy","rewritten":"Budowałem responsywne interfejsy w React 18 z TypeScript, wdrożone w środowisku produkcyjnym dla 3 klientów B2B — bezpośrednio odpowiada wymaganiu 'doświadczenie z React w środowisku produkcyjnym' z ogłoszenia"}

DOBRY przykład przepisania (wyciąga konkret z ogólnego):
{"original":"Współpracowałem z zespołem przy projektach","rewritten":"Współpracowałem w 4-osobowym zespole w trybie zdalnym używając Jira i Git — odpowiada wymaganiu 'praca w zespole rozproszonym' z sekcji Środowisko pracy"}

ZADANIE 4 — roadmap (3-5 pozycji):
Ułóż priorytetową listę umiejętności do nauki na podstawie gaps i profilu kandydata.
Kolejność: maksymalizuj ROI — priorytetyzuj [Wymagane] przed [Mile widziane], umiejętności z wysokim impaktem na wynik (0/2 w wymaganych) przed niskim (0.5/2), łatwe do nauki przy istniejącym tle kandydata przed trudnymi.
Jeśli kandydat ma bliski odpowiednik (np. pgvector gdy wymagany Pinecone) — zaznacz że nauka zajmie dni nie tygodnie.

Każda pozycja:
- skill: konkretna nazwa
- dlaczego: 1-2 zdania — dlaczego TA umiejętność i TERAZ, jaki ma wpływ na zatrudnialność w tej roli i podobnych
- start: jeden konkretny pierwszy krok (nie "naucz się Dockera" lecz "przejdź oficjalny Docker getting started i skonteneryzuj jeden istniejący projekt w 2h")

Format odpowiedzi (TYLKO ten JSON, zero tekstu przed ani po):
{
  "matchScore": {
    "requiredScore": <suma punktów za wymagane — liczba z kropką jako separatorem dziesiętnym np. 8.5>,
    "requiredTotal": <liczba wymaganych umiejętności, liczba całkowita>,
    "optionalMatched": <liczba opcjonalnych które kandydat posiada, liczba całkowita>,
    "optionalTotal": <liczba opcjonalnych umiejętności w ogłoszeniu, liczba całkowita>,
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
  ],
  "roadmap": [
    {
      "skill": "<nazwa umiejętności>",
      "dlaczego": "<dlaczego ta umiejętność i teraz — wpływ na zatrudnialność>",
      "start": "<konkretny pierwszy krok>"
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
      max_tokens: 4096,
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

    // Emit results as separate events so frontend can render progressively
    onEvent('score',    result.matchScore);
    onEvent('gaps',     result.gaps);
    onEvent('bullets',  result.bullets);
    onEvent('roadmap',  result.roadmap);
    onEvent('done',     null);
  } catch (err) {
    const message = err.name === 'ZodError'
      ? `Nieprawidłowa struktura odpowiedzi Claude: ${err.errors[0]?.message}`
      : err.message;

    onEvent('error', { message });
    throw err;
  }
}

module.exports = { analyzeCV, extractJSON };
