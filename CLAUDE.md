# CVMatch — kontekst projektu dla Claude

## Projekt

CVMatch to narzędzie webowe które porównuje CV z ogłoszeniem o pracę i zwraca konkretny feedback: ile z wymaganych umiejętności kandydat posiada (format "X z Y"), listę braków z kategoriami oraz przepisane fragmenty CV gotowe do wklejenia.

**Repo:** https://github.com/Konrad2237/cvmatch  
**Stack:** Express.js (Railway) + Next.js 14 (Vercel) + Claude API (Anthropic) + Zod + Tailwind CSS

---

## Struktura projektu

```
cvmatch/
├── .env.example              ← wzorzec zmiennych (commitowany, bez wartości)
├── .gitignore                ← wyklucza: .env, node_modules/, docs/
├── CLAUDE.md                 ← ten plik
│
├── backend/                  ← Express.js, deploy: Railway
│   ├── .env                  ← ANTHROPIC_API_KEY, CLAUDE_MODEL, PORT=3001, FRONTEND_URL
│   ├── package.json          ← CommonJS; express, @anthropic-ai/sdk, multer, zod, cors, dotenv
│   ├── railway.toml          ← startCommand: "node src/index.js"
│   └── src/
│       ├── index.js          ← serwer Express, CORS z env, /health endpoint
│       ├── routes/
│       │   └── analyze.js    ← POST /analyze: walidacja → SSE headers → keepalive → analyzeCV()
│       └── lib/
│           ├── claude.js     ← analyzeCV(), SYSTEM_PROMPT, extractJSON(), klient Anthropic SDK
│           └── schemas.js    ← Zod: analysisSchema, gapSchema, bulletSchema
│
└── frontend/                 ← Next.js 14 App Router, deploy: Vercel
    ├── .env.local            ← NEXT_PUBLIC_API_URL=http://localhost:3001
    ├── next.config.js
    ├── tailwind.config.js
    └── src/app/
        ├── layout.jsx        ← RootLayout + metadata
        ├── page.jsx          ← stan (idle/loading/done/error), SSE fetch loop, AbortController
        ├── globals.css
        └── components/
            ├── AnalyzeForm.jsx      ← formularz, tab tekst/PDF, buduje FormData
            ├── MatchScore.jsx       ← "X z Y umiejętności", pasek postępu, 3 kolory wg progu
            ├── GapAnalysis.jsx      ← lista braków z badge kategorii
            ├── BulletPoints.jsx     ← bullet pointy + clipboard copy z feedbackiem 2s
            └── StreamingStatus.jsx  ← spinner podczas SSE
```

### Konwencje nazewnictwa

- **Backend:** CommonJS (`require` / `module.exports`), pliki `.js`
- **Frontend:** ES modules (`import` / `export default`), komponenty React jako `.jsx`, konfiguracja jako `.js`
- **SSE event types:** dokładnie `'score' | 'gaps' | 'bullets' | 'done' | 'error'` — ta sama wartość w `analyze.js` i w `switch` w `page.jsx`
- **Zod schemas:** sufiks `Schema` — `analysisSchema`, `gapSchema`, `bulletSchema`
- **Kategorie braków:** dokładnie `'Technologia' | 'Soft skill' | 'Certyfikat'` — ta sama wartość w Zod enum (`schemas.js`) i w `CATEGORY_COLORS` (`GapAnalysis.jsx`)
- **Env vars:** prefix `NEXT_PUBLIC_` tylko dla zmiennych które muszą być dostępne w przeglądarce

---

## Architektura

### Przepływ danych

```
[Przeglądarka]
  FormData (cvText lub cvFile + jobPosting)
    → POST /analyze (Railway)
      → multer: PDF trzymany w RAM jako buffer, nie trafia na dysk
      → walidacja wejścia: błąd 400 JSON przed otwarciem SSE
      → SSE: Content-Type: text/event-stream + flushHeaders()
      → keepalive: setInterval co 5s → ": keepalive\n\n"
      → analyzeCV()
          jeśli PDF → blok { type:"document", source:{type:"base64",...} }
          jeśli tekst → blok { type:"text", text:"CV kandydata:\n..." }
          + blok { type:"text", text:"Ogłoszenie:\n..." }
          → client.messages.stream() → akumuluje stream.on("text")
          → extractJSON() → JSON.parse() → analysisSchema.parse()
          → onEvent("score") → onEvent("gaps") → onEvent("bullets") → onEvent("done")
      → clearInterval + res.end()

[Przeglądarka — SSE reader w page.jsx]
  response.body.getReader() + TextDecoder + buffer split("\n")
  linie "data: " → JSON.parse → switch(event.type):
    "score"   → setResults(r => ({...r, matchScore: payload}))
    "gaps"    → setResults(r => ({...r, gaps: payload}))
    "bullets" → setResults(r => ({...r, bullets: payload}))
    "done"    → setStatus("done")
    "error"   → setErrorMessage + setStatus("error")
```

### Zależności między modułami

```
backend/src/index.js
  └── routes/analyze.js
        ├── lib/claude.js
        │     └── lib/schemas.js   ← analysisSchema
        └── multer (npm)

frontend/src/app/page.jsx
  ├── AnalyzeForm.jsx   → onSubmit(FormData)
  ├── MatchScore.jsx    → props: { matched: number, total: number }
  ├── GapAnalysis.jsx   → props: Array<{ skill, category, detail }>
  ├── BulletPoints.jsx  → props: Array<{ original?, rewritten }>
  └── StreamingStatus.jsx  → brak props
```

### Zmienne środowiskowe

| Zmienna | Gdzie | Opis |
|---|---|---|
| `ANTHROPIC_API_KEY` | backend `.env` + Railway | Klucz Anthropic |
| `CLAUDE_MODEL` | backend `.env` + Railway | Domyślnie `claude-sonnet-4-20250514` |
| `PORT` | backend `.env` + Railway | Lokalnie `3001`, Railway ustawia automatycznie |
| `FRONTEND_URL` | backend `.env` + Railway | Lokalnie `http://localhost:3000`, prod: URL Vercel |
| `NEXT_PUBLIC_API_URL` | frontend `.env.local` + Vercel | Lokalnie `http://localhost:3001`, prod: URL Railway |

---

## Zasady których przestrzegamy

### Robimy

- **JS везде** — pliki `.js` (backend) i `.jsx` (frontend React), bez TypeScript
- **Zod do walidacji JSON z Claude** — Claude czasem owija JSON w ```json```, `extractJSON()` to obsługuje, Zod waliduje strukturę i rzuca czytelny błąd
- **Multer memoryStorage** — PDF w RAM, base64 do Claude API, zero I/O na dysk
- **SSE keepalive co 5s** — Railway i proxy zamykają bezczynne połączenia; `: keepalive\n\n` temu zapobiega
- **Walidacja przed SSE** — błędy 400 zwracamy jako JSON zanim otworzymy SSE, bo po `flushHeaders()` nie można zmienić statusu HTTP
- **Progresywny render** — `score`, `gaps`, `bullets` to oddzielne eventy, UI renderuje każdy gdy przyjdzie

### NIE robimy

- **Nie używamy TypeScript** — decyzja świadoma, mniejszy narzut na MVP
- **Nie zapisujemy PDF na dysk** — `memoryStorage` w multer, brak uprawnień i cleanup na Railway
- **Nie używamy Vercel Functions do backendu** — limit 10s, Claude potrzebuje 15-25s; Railway rozwiązuje problem bez hacków
- **Nie pollingujemy** — SSE zamiast `/status/:jobId` co 2s; jedno połączenie, zero zbędnych requestów
- **Nie dodajemy logowania użytkowników** — poza scopem MVP (auth to 1-2 tygodnie pracy)
- **Nie budujemy edytora CV** — CVMatch generuje sugestie, użytkownik edytuje w swoim narzędziu

---

## Status

### Zbudowane i działa

- Formularz: wklejanie tekstu CV + upload PDF + wklejanie ogłoszenia
- Backend: POST /analyze z SSE streaming i keepalive co 5s
- Claude API: analiza CV vs ogłoszenie, zwraca strukturalny JSON
- Walidacja: Zod schema + extractJSON() na wypadek markdown w odpowiedzi
- UI wyników:
  - `MatchScore` — "X z Y umiejętności" z paskiem postępu (czerwony/żółty/zielony)
  - `GapAnalysis` — lista braków z badge kategorii
  - `BulletPoints` — przepisane fragmenty CV z przyciskiem Kopiuj
- Progresywny render — wyniki pojawiają się w UI w miarę jak Claude je generuje
- Test end-to-end: zwrócił 18/22 wynik przy pierwszym uruchomieniu

### W trakcie / do zrobienia przed deploym

- Deploy backend na Railway
- Deploy frontend na Vercel
- Aktualizacja multer 1.x → 2.x (zgłoszone podatności)
- CORS: zmiana `FRONTEND_URL` z `*` na URL Vercel po deployu

### Następne (MVP plan)

**Tydzień 2 — pozostało:**
- Few-shot examples w `SYSTEM_PROMPT` — iteracja promptu na prawdziwych CV
- Testy na min. 5 CV + 10 ogłoszeń z Pracuj.pl/LinkedIn

**Tydzień 3:**
- Token streaming — wyniki pojawiają się słowo po słowie zamiast bloku naraz
- Fix błędów UX wykrytych podczas testów

**Tydzień 4 (Should Have):**
- Historia analiz w Supabase (tabela: CV hash, ogłoszenie, wyniki)
- Sekcyjna ocena CV (Doświadczenie / Umiejętności / Wykształcenie)
- Learning roadmap — priorytetowa lista umiejętności do nauki
- Nagranie demo video (90 sekund, prawdziwe CV i ogłoszenie)
- README z GIF/screenshot i instrukcją uruchomienia
