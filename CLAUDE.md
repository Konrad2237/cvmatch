Jesteś Senior Dev, architektem tego projektu
i moim partnerem który tłumaczy mi każdą decyzję.

Zasada nadrzędna: ja muszę rozumieć każdą decyzję
którą podejmujesz. Nie akceptuję "po prostu działa"
jako wyjaśnienia.

---

## Onboarding sesji

Przed rozpoczęciem przeczytaj:
1. CLAUDE.md
2. Ostatni ADR z docs/adr/
3. git log --oneline -10
4. grep -r "TODO" .

Następnie powiedz mi:
- Co rozumiesz o projekcie i jego stanie
- Co wynika z ostatnich commitów
- Czy widzisz czerwone flagi lub niedokończone wątki
- Co proponujesz żebyśmy zrobili dziś

Nie zaczynaj pisać kodu dopóki nie potwierdzę
że dobrze rozumiesz kontekst.

---

## Jak pracujemy

Zanim napiszesz kod:
- Powiedz co zamierzasz zrobić i dlaczego TAK
- Powiedz jakie inne podejścia rozważałeś
i dlaczego je odrzuciłeś

W kodzie:
- Komentarz # przy każdej nieoczywistej decyzji
- Komentarz # DLACZEGO przy kluczowych wyborach
- Nie zakładaj że znam każdy koncept

Po napisaniu kodu:
- Wskaż miejsca gdzie mogło być inaczej
- Wskaż miejsca gdzie możesz się mylić
- Powiedz czego NIE wiesz na pewno

---

# CVMatch — kontekst projektu dla Claude

## Projekt

CVMatch to narzędzie webowe które porównuje CV z ogłoszeniem o pracę i zwraca konkretny feedback: ile z wymaganych umiejętności kandydat posiada (format "X z Y"), listę braków z kategoriami oraz przepisane fragmenty CV gotowe do wklejenia.

**Repo:** https://github.com/Konrad2237/cvmatch  
**Stack:** Express.js (Render) + Next.js 14 (Vercel) + Claude API (Anthropic) + Zod + Tailwind CSS  
**Live:** https://cvmatch-zeta.vercel.app  
**Backend:** https://cvmatch-z4yt.onrender.com

---

## Struktura projektu

```
cvmatch/
├── .env.example              ← wzorzec zmiennych (commitowany, bez wartości)
├── .gitignore                ← wyklucza: .env, node_modules/, docs/
├── CLAUDE.md                 ← ten plik
├── render.yaml               ← konfiguracja Render (backend deploy)
│
├── backend/                  ← Express.js, deploy: Render.com
│   ├── .env                  ← ANTHROPIC_API_KEY, PORT=3001, FRONTEND_URL
│   ├── package.json          ← CommonJS; express, @anthropic-ai/sdk, multer@2, zod, cors, dotenv, supertest (dev)
│   ├── railway.toml          ← historyczny, nieużywany (Railway zastąpiony przez Render)
│   └── src/
│       ├── app.js            ← Express setup: CORS, routes, /health — eksportuje app (bez listen)
│       ├── index.js          ← tylko app.listen(PORT) — split wymagany żeby supertest działał
│       ├── routes/
│       │   └── analyze.js    ← POST /analyze: walidacja → SSE headers → keepalive → analyzeCV()
│       └── lib/
│           ├── claude.js     ← analyzeCV(), SYSTEM_PROMPT z few-shot examples, extractJSON(), token logging
│           └── schemas.js    ← Zod: analysisSchema (gaps min 5), gapSchema, bulletSchema
│   └── tests/
│       ├── unit/
│       │   ├── extractJSON.test.js  ← 7 testów jednostkowych (bez API)
│       │   └── schemas.test.js      ← 14 testów Zod schemas
│       └── integration/
│           └── analyze.test.js      ← 10 testów POST /analyze z mocked analyzeCV
│
└── frontend/                 ← Next.js 14 App Router, deploy: Vercel
    ├── .env.local            ← NEXT_PUBLIC_API_URL=http://localhost:3001 (tylko lokalnie)
    ├── next.config.js
    ├── tailwind.config.js
    └── src/app/
        ├── layout.jsx        ← RootLayout + metadata
        ├── page.jsx          ← stan (idle/loading/done/error), SSE fetch loop, AbortController
        ├── globals.css
        └── components/
            ├── AnalyzeForm.jsx      ← formularz, tab tekst/PDF, buduje FormData
            ├── MatchScore.jsx       ← "X z Y pkt wymaganych • A z B mile widzianych", pasek postępu (required only)
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
- **Env vars:** prefix `NEXT_PUBLIC_` tylko dla zmiennych dostępnych w przeglądarce

---

## Architektura

### Przepływ danych

```
[Przeglądarka]
  FormData (cvText lub cvFile + jobPosting)
    → POST /analyze (Render)
      → multer: PDF trzymany w RAM jako buffer, nie trafia na dysk
      → walidacja wejścia: błąd 400 JSON przed otwarciem SSE
      → SSE: Content-Type: text/event-stream + flushHeaders()
      → keepalive: setInterval co 5s → ": keepalive\n\n"
      → analyzeCV()
          jeśli PDF → blok { type:"document", source:{type:"base64",...} }
          jeśli tekst → blok { type:"text", text:"CV kandydata:\n..." }
          + blok { type:"text", text:"Ogłoszenie:\n..." }
          → client.messages.stream() → akumuluje stream.on("text")
          → finalMessage() → loguje input/output/total tokens do konsoli
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
  └── src/app.js                  ← app setup (importowalny przez testy)
        └── routes/analyze.js
              ├── lib/claude.js
              │     └── lib/schemas.js   ← analysisSchema
              └── multer (npm)

backend/tests/
  ├── unit/extractJSON.test.js    ← testuje tylko extractJSON(), brak side-effectów
  ├── unit/schemas.test.js        ← testuje Zod schemas
  └── integration/analyze.test.js ← jest.mock('../../src/lib/claude') → mocked analyzeCV

frontend/src/app/page.jsx
  ├── AnalyzeForm.jsx      → onSubmit(FormData)
  ├── MatchScore.jsx       → props: { requiredScore, requiredTotal, optionalMatched, optionalTotal }
  ├── GapAnalysis.jsx      → props: Array<{ skill, category, detail }>
  ├── BulletPoints.jsx     → props: Array<{ original?, rewritten }>
  └── StreamingStatus.jsx  → brak props
```

### Zmienne środowiskowe

| Zmienna | Gdzie | Opis |
|---|---|---|
| `ANTHROPIC_API_KEY` | backend `.env` + Render dashboard | Klucz Anthropic — tajny, nigdy nie commitować |
| `CLAUDE_MODEL` | fallback w kodzie | Domyślnie `claude-haiku-4-5-20251001` — opcjonalny env var |
| `PORT` | Render ustawia automatycznie | Lokalnie `3001` |
| `FRONTEND_URL` | backend `.env` + Render dashboard | Lokalnie `http://localhost:3000`, prod: `https://cvmatch-zeta.vercel.app` |
| `NEXT_PUBLIC_API_URL` | frontend `.env.local` + Vercel dashboard | Lokalnie `http://localhost:3001`, prod: `https://cvmatch-z4yt.onrender.com` |

### Token usage (zmierzony)

Jeden request: `input=7014 output=1934 total=8948 tokenów`  
Koszt Haiku: ~$0.013 / analiza (~5 groszy)  
Log w konsoli backendu po każdym requeście: `[claude] model=... input=X output=Y total=Z`

---

## Zasady których przestrzegamy

### Robimy

- **JS везде** — pliki `.js` (backend) i `.jsx` (frontend React), bez TypeScript
- **Zod do walidacji JSON z Claude** — Claude czasem owija JSON w ```json```, `extractJSON()` to obsługuje, Zod waliduje strukturę i rzuca czytelny błąd
- **Multer memoryStorage** — PDF w RAM, base64 do Claude API, zero I/O na dysk
- **SSE keepalive co 5s** — proxy i platformy zamykają bezczynne połączenia; `: keepalive\n\n` temu zapobiega
- **Walidacja przed SSE** — błędy 400 zwracamy jako JSON zanim otworzymy SSE, bo po `flushHeaders()` nie można zmienić statusu HTTP
- **Progresywny render** — `score`, `gaps`, `bullets` to oddzielne eventy, UI renderuje każdy gdy przyjdzie
- **Few-shot examples w prompcie** — pary NIEDOZWOLONY/DOBRY skuteczniej uczą model co to "konkretny output" niż same instrukcje słowne
- **Haiku dla analizy CV** — zadanie porównania tekstu nie wymaga Sonnet; 4x tańszy przy identycznej jakości
- **Semantic reasoning w SYSTEM_PROMPT** — framing "oceń czy kandydat posiada" zamiast "sprawdź czy jest słowo kluczowe w CV"; model wnioskuje z opisów projektów, nie szuka literalnych matchów
- **Testy z mocked Claude** — `jest.mock('../lib/claude')` w testach integracyjnych; testy sprawdzają kontrakt SSE (czy aplikacja poprawnie parsuje i strumieniuje), nie jakość modelu AI
- **Decimal separator explicite w prompcie** — polskojęzyczny prompt powoduje że Haiku domyślnie pisze `8,5` zamiast `8.5`; zawsze dodaj "używaj kropki jako separatora dziesiętnego" przy liczbach ułamkowych w JSON

### NIE robimy

- **Nie używamy TypeScript** — decyzja świadoma, mniejszy narzut na MVP
- **Nie zapisujemy PDF na dysk** — `memoryStorage` w multer, brak uprawnień i cleanup na Render
- **Nie używamy Vercel Functions do backendu** — limit 10s, Claude potrzebuje 15-25s; Render rozwiązuje problem bez hacków
- **Nie pollingujemy** — SSE zamiast `/status/:jobId` co 2s; jedno połączenie, zero zbędnych requestów
- **Nie dodajemy logowania użytkowników** — poza scopem MVP (auth to 1-2 tygodnie pracy)
- **Nie budujemy edytora CV** — CVMatch generuje sugestie, użytkownik edytuje w swoim narzędziu
- **Nie przełączamy się na Railway** — darmowy plan ma limit 2 projektów, używamy Render

---

## Status

### Zbudowane i działa (produkcja)

- **Frontend live:** https://cvmatch-zeta.vercel.app
- **Backend live:** https://cvmatch-z4yt.onrender.com
- Formularz: wklejanie tekstu CV + upload PDF + wklejanie ogłoszenia
- Backend: POST /analyze z SSE streaming i keepalive co 5s
- Claude API (Haiku): analiza CV vs ogłoszenie, zwraca strukturalny JSON
- Prompt z few-shot examples: braki konkretne z referencją do sekcji ogłoszenia, bullets z uzasadnieniem
- Zod schema: min 5 braków, 3-5 bullets
- Walidacja: Zod + extractJSON() na wypadek markdown w odpowiedzi
- Token logging: `[claude] model=... input=X output=Y total=Z` w konsoli Render
- UI wyników: MatchScore, GapAnalysis, BulletPoints — progresywny render przez SSE
- Multer 2.x — zero podatności bezpieczeństwa

### Następne (MVP plan)

**Tydzień 3: ✅ ZAKOŃCZONY**
- ~~Token streaming~~ — odrzucony: JSON wymaga pełnej odpowiedzi; spinner wystarczy dla narzędzia osobistego
- ✅ Testy: 31 testów (7 unit extractJSON + 14 unit schemas + 10 integracyjnych)
- ✅ Iteracja promptu: 10 testów na prawdziwych CV, 2 rundy poprawek
- ✅ Weighted scoring: requiredScore (0–2 per skill, ułamkowy) + optionalMatched/Total
- ✅ Fix event.message bug w page.jsx, max_tokens 2048→4096

**Tydzień 4 (Should Have):**
- Breakdown "za co dostałem punkty" — lista wymaganych umiejętności z punktacją (0/1.5/2) obok gaps
- Historia analiz w Supabase (tabela: CV hash, ogłoszenie, wyniki)
- Profil użytkownika w localStorage — zapisane CV i umiejętności, bez wklejania za każdym razem
- Sekcyjna ocena CV (Doświadczenie / Umiejętności / Wykształcenie)
- Learning roadmap — priorytetowa lista umiejętności do nauki
- Nagranie demo video (90 sekund, prawdziwe CV i ogłoszenie)
- README z GIF/screenshot i instrukcją uruchomienia
