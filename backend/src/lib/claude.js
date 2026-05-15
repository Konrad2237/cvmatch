const Anthropic = require('@anthropic-ai/sdk');
const { analysisSchema } = require('./schemas');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Jesteś ekspertem od rekrutacji i optymalizacji CV.
Przeanalizuj podane CV względem ogłoszenia o pracę i zwróć wynik WYŁĄCZNIE jako JSON — bez żadnego tekstu przed ani po, bez markdown, bez \`\`\`json.

ZADANIE 1 — matchScore:
Policz konkretne umiejętności i technologie wymienione w ogłoszeniu, a następnie sprawdź ile z nich jest w CV.
Licz każdą technologię/umiejętność osobno. "React i Redux" = 2, nie 1.
Nie licz ogólnych wymagań jak "dobra organizacja pracy" jeśli ogłoszenie ich nie precyzuje.

ZADANIE 2 — gaps (minimum 5):
Wypisz czego brakuje w CV względem ogłoszenia. Każdy brak musi mieć:
- skill: konkretna nazwa (np. "Docker", nie "konteneryzacja")
- category: dokładnie jedna z: "Technologia" | "Soft skill" | "Certyfikat"
- detail: zdanie które mówi WHERE w ogłoszeniu i WHY to brakuje

NIEDOZWOLONY przykład braku (zbyt ogólny):
{"skill":"umiejętności techniczne","category":"Technologia","detail":"brakuje doświadczenia technicznego"}

DOBRY przykład braku:
{"skill":"Docker","category":"Technologia","detail":"Ogłoszenie wymaga konteneryzacji mikroserwisów (sekcja Wymagania, pkt 4) — CV nie zawiera Docker ani żadnego narzędzia do konteneryzacji"}

DOBRY przykład braku:
{"skill":"praca w metodologii Agile/Scrum","category":"Soft skill","detail":"Ogłoszenie wymaga doświadczenia w Scrum (sekcja Środowisko pracy) — CV opisuje projekty bez wzmianki o metodologii"}

ZADANIE 3 — bullets (3-5 sztuk):
Przepisz istniejące fragmenty CV tak, żeby lepiej odpowiadały temu ogłoszeniu.
Zasady: zachowaj fakty i styl autora, użyj słów kluczowych z ogłoszenia, dodaj mierzalne efekty jeśli można je wywnioskować z oryginału.

NIEDOZWOLONY przykład przepisania (generyczny, nie zmienia nic):
{"original":"Pracowałem z React","rewritten":"Posiadam doświadczenie w React stosowanym w projektach webowych"}

DOBRY przykład przepisania (konkretny, używa słów kluczowych z ogłoszenia):
{"original":"Pracowałem z React i budowałem interfejsy","rewritten":"Budowałem responsywne interfejsy w React 18 z TypeScript, wdrożone w środowisku produkcyjnym dla 3 klientów B2B — bezpośrednio odpowiada wymaganiu 'doświadczenie z React w środowisku produkcyjnym' z ogłoszenia"}

DOBRY przykład przepisania (wyciąga konkret z ogólnego):
{"original":"Współpracowałem z zespołem przy projektach","rewritten":"Współpracowałem w 4-osobowym zespole w trybie zdalnym używając Jira i Git — odpowiada wymaganiu 'praca w zespole rozproszonym' z sekcji Środowisko pracy"}

Format odpowiedzi (TYLKO ten JSON, zero tekstu przed ani po):
{
  "matchScore": {
    "matched": <liczba całkowita>,
    "total": <liczba całkowita>
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
      max_tokens: 2048,
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
    onEvent('score', result.matchScore);
    onEvent('gaps', result.gaps);
    onEvent('bullets', result.bullets);
    onEvent('done', null);
  } catch (err) {
    const message = err.name === 'ZodError'
      ? `Nieprawidłowa struktura odpowiedzi Claude: ${err.errors[0]?.message}`
      : err.message;

    onEvent('error', { message });
    throw err;
  }
}

module.exports = { analyzeCV };
