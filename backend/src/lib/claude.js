const Anthropic = require('@anthropic-ai/sdk');
const { analysisSchema } = require('./schemas');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Jesteś ekspertem od rekrutacji i optymalizacji CV.
Przeanalizuj podane CV względem ogłoszenia o pracę i zwróć wynik WYŁĄCZNIE jako JSON — bez żadnego tekstu przed ani po, bez markdown, bez \`\`\`json.

Zadania:
1. Policz ile z wymaganych umiejętności z ogłoszenia kandydat posiada (matched) i ile wymagań jest łącznie (total).
   Licz konkretne umiejętności i technologie, nie całe zdania.
2. Wypisz braki — czego w CV nie ma, a ogłoszenie wymaga lub preferuje.
   Każdy brak musi mieć kategorię: "Technologia" | "Soft skill" | "Certyfikat".
   W polu "detail" napisz konkretnie gdzie w ogłoszeniu to się pojawia i czego dokładnie brakuje.
   Minimum 3 braki, pisz po polsku.
3. Przepisz 3-5 bullet pointów z CV tak, żeby lepiej rezonowały z tym konkretnym ogłoszeniem.
   Zachowaj styl i ton oryginalnego CV. Nie wymyślaj faktów — tylko przepisz to co już jest.
   Użyj słów kluczowych z ogłoszenia tam gdzie pasują naturalnie.

Format odpowiedzi (tylko ten JSON, nic więcej):
{
  "matchScore": {
    "matched": <liczba całkowita>,
    "total": <liczba całkowita>
  },
  "gaps": [
    {
      "skill": "<nazwa umiejętności>",
      "category": "<Technologia|Soft skill|Certyfikat>",
      "detail": "<gdzie w ogłoszeniu i dlaczego brakuje>"
    }
  ],
  "bullets": [
    {
      "original": "<oryginalny fragment z CV lub null>",
      "rewritten": "<przepisana wersja>"
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
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
    });

    stream.on('text', (chunk) => {
      fullText += chunk;
    });

    await stream.finalMessage();

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
