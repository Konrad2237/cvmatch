# CVMatch

![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?logo=node.js&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=next.js&logoColor=white)
![Claude API](https://img.shields.io/badge/Claude_API-Haiku-D97706?logo=anthropic&logoColor=white)
![License](https://img.shields.io/badge/licencja-MIT-blue)

Wklejasz CV i ogłoszenie o pracę — dostajesz konkretny feedback w 30 sekund: ile z wymaganych umiejętności już masz, czego dokładnie brakuje i gotowe fragmenty CV przepisane pod to ogłoszenie.

Kandydaci często wysyłają to samo CV do dziesiątek ofert i nie wiedzą, dlaczego nie dostają odpowiedzi. CVMatch wskazuje konkretne luki — nie "rozważ dodanie słów kluczowych", ale "Docker wymagany w punkcie 3 ogłoszenia, brak w CV i żadnym projekcie". Każde wykryte braki mają ocenę transferowalności: jeśli znasz LangGraph zamiast LangChain, narzędzie powie ci czy ta różnica ma znaczenie dla tej konkretnej roli. Bullet pointy gotowe do wklejenia są przepisane z twoich oryginalnych opisów — żadnego generycznego AI-speak.

## Demo

> 📹 **[Obejrzyj demo na YouTube](#)** ← link do nagrania

![Demo GIF](docs/demo.gif)

---

## Spis treści

- [Funkcjonalności](#funkcjonalności)
- [Stos technologiczny](#stos-technologiczny)
- [Architektura](#architektura)
- [Wymagania](#wymagania)
- [Instalacja i uruchomienie lokalne](#instalacja-i-uruchomienie-lokalne)
- [Zmienne środowiskowe](#zmienne-środowiskowe)
- [Użycie](#użycie)
- [Struktura projektu](#struktura-projektu)
- [Testowanie](#testowanie)
- [Deployment](#deployment)
- [Czego się nauczyłem](#czego-się-nauczyłem)
- [Licencja](#licencja)

---

## Funkcjonalności

- **Weighted score per umiejętność** — każda wymagana umiejętność punktowana 0–2 (posiadasz / częściowy odpowiednik / brak), opcjonalne 0–1; aggregaty liczone w JS po parsowaniu, nie przez model
- **Per-skill breakdown** — kolorowe chipy pokazują za co konkretnie dostałeś punkty (zielony = 2/2, szary = 0/2)
- **Gap analysis z transferowalnością** — każdy brak oznaczony jako [Wymagane] / [Mile widziane] / [Wymagane implicite] z oceną czy pokrewna technologia wystarczy
- **Przepisane bullet pointy** — 3–5 fragmentów CV zoptymalizowanych pod słowa kluczowe ogłoszenia, zachowując twój styl i fakty
- **Streaming wyników przez SSE** — wyniki pojawiają się na bieżąco zamiast po 20 sekundach ciszy; keepalive co 5s zapobiega zerwaniu połączenia
- **Profil użytkownika** — CV i dodatkowe umiejętności zapisane lokalnie; nie musisz wklejać CV przy każdej analizie
- **Historia analiz** — ręczny zapis wyników (max 20), możliwość powrotu do poprzednich bez re-analizy
- **Obsługa PDF** — wgrywasz plik PDF zamiast kopiować tekst; Claude API natywnie czyta dokument bez osobnej biblioteki

---

## Stos technologiczny

| Technologia | Zastosowanie |
|---|---|
| **Claude API (Anthropic) — Haiku** | Semantyczna analiza dopasowania CV do ogłoszenia, generowanie gap analysis i bullet pointów; natywna obsługa PDF eliminuje potrzebę parsera |
| **Express.js** | Backend jako długo działający serwer; obsługa SSE i keepalive (Vercel Functions mają limit 10s, Claude odpowiada 15–25s) |
| **Next.js 14** | Frontend; routing app directory, Server Components, deploy jedną komendą na Vercel |
| **Zod** | Walidacja schematu JSON zwracanego przez Claude; zamiast `try/catch` na `JSON.parse` — schema rzuca obsługiwany błąd gdy model zmieni strukturę |
| **Tailwind CSS** | Stylowanie UI |
| **Render** | Hosting backendu — brak limitu timeout, persistentny proces |
| **Vercel** | Hosting frontendu |
| **localStorage** | Persystencja profilu i historii analiz po stronie klienta — bez backendu |

---

## Architektura

```
┌─────────────────┐         POST /analyze (multipart)          ┌──────────────────────┐
│  Next.js        │  ─────────────────────────────────────────► │  Express.js          │
│  Vercel         │                                             │  Render              │
│                 │  ◄─────────────── SSE stream ─────────────  │                      │
│  SSE fetch loop │    data: {type:"score",  payload:{...}}     │  Zod validation      │
│  per-event      │    data: {type:"gaps",   payload:[...]}     │  analyzeCV()         │
│  rendering      │    data: {type:"bullets",payload:[...]}     │  keepalive co 5s     │
│                 │    data: {type:"done"}                      │                      │
└─────────────────┘                                             └──────────┬───────────┘
                                                                           │
                                                                           ▼
                                                                  ┌────────────────┐
                                                                  │  Claude API    │
                                                                  │  (Haiku)       │
                                                                  │  streaming     │
                                                                  └────────────────┘
```

**Kluczowe decyzje architektoniczne:**

- **Backend na Render zamiast Vercel Functions** — Functions mają limit 10 sekund; Claude odpowiada 15–25s. Render jako długo działający serwer rozwiązuje problem bez hacków z Edge Runtime.
- **SSE zamiast pollingu** — keepalive (`: keepalive` co 5s) trzyma połączenie; użytkownik widzi wyniki pojawiające się na bieżąco.
- **Agregaty w JS, nie w modelu** — Claude zwraca tylko tablice breakdown per umiejętność; `requiredScore`, `requiredTotal` itd. liczone przez `.reduce()` i `.filter()` po parsowaniu. Model błędnie sumował przy 10+ pozycjach.
- **Zod schema** — Claude czasem opakowuje JSON w markdown lub zmienia strukturę; Zod wymusza dokładny format i rzuca obsługiwany błąd zamiast crashować w losowym miejscu.

---

## Wymagania

- **Node.js** v18 lub nowszy
- **npm** v9 lub nowszy
- **Klucz API Anthropic** — konto na [console.anthropic.com](https://console.anthropic.com)

---

## Instalacja i uruchomienie lokalne

### 1. Sklonuj repozytorium

```bash
git clone https://github.com/Konrad2237/cvmatch.git
cd cvmatch
```

### 2. Backend

```bash
cd backend
npm install
cp ../.env.example .env
# Uzupełnij ANTHROPIC_API_KEY w pliku .env
npm run dev
```

Backend startuje na `http://localhost:3001`.

### 3. Frontend

```bash
cd ../frontend
npm install
# Stwórz plik .env.local z jedną zmienną:
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local
npm run dev
```

Frontend startuje na `http://localhost:3000`.

---

## Zmienne środowiskowe

### Backend (`.env`)

| Zmienna | Wymagana | Opis |
|---|---|---|
| `ANTHROPIC_API_KEY` | tak | Klucz API z console.anthropic.com |
| `FRONTEND_URL` | tak | URL frontendu (CORS); lokalnie `http://localhost:3000` |
| `CLAUDE_MODEL` | nie | Domyślnie `claude-haiku-4-5-20251001` |

### Frontend (`.env.local`)

| Zmienna | Wymagana | Opis |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | tak | URL backendu; lokalnie `http://localhost:3001` |

---

## Użycie

### Podstawowe

1. Otwórz aplikację w przeglądarce
2. Przejdź do zakładki **Profil** — wklej swoje CV i zapisz
3. Wróć do zakładki **Analiza** — wklej ogłoszenie o pracę (tylko wymagania, bez opisu firmy)
4. Kliknij **Analizuj** — wyniki streamują na bieżąco
5. Po zakończeniu kliknij **Zapisz analizę** jeśli chcesz wrócić do wyników później

### Upload PDF

Zamiast profilu tekstowego możesz wgrać CV jako plik PDF — przełącznik "Wgraj PDF" w formularzu analizy. Tryb PDF nie korzysta z profilu zapisanego w localStorage.

### Historia

Zakładka **Historia** przechowuje do 20 zapisanych analiz. Możesz wczytać poprzednie wyniki bez ponownego wywołania API.

---

## Struktura projektu

```
cvmatch/
├── .env.example                    ← zmienne środowiskowe (bez wartości)
├── .gitignore
├── docs/
│   └── adr/
│       ├── ADR-1.md                ← architektura MVP, SSE, Zod
│       ├── ADR-2.md                ← few-shot examples, Haiku, Render
│       ├── ADR-3.md                ← testy, iteracja promptu, weighted scoring
│       └── ADR-4.md                ← per-skill breakdown, profil, historia, agregaty w JS
├── backend/
│   ├── package.json
│   ├── railway.toml
│   └── src/
│       ├── app.js                  ← Express setup, eksportuje app bez listen()
│       ├── index.js                ← wyłącznie app.listen(PORT)
│       ├── routes/
│       │   └── analyze.js          ← POST /analyze: walidacja → SSE → keepalive → analyzeCV()
│       └── lib/
│           ├── claude.js           ← SYSTEM_PROMPT + analyzeCV() + extractJSON()
│           └── schemas.js          ← Zod: matchScore (breakdown arrays), gaps, bullets
│   └── tests/
│       ├── unit/
│       │   ├── extractJSON.test.js ← 7 przypadków: fenced JSON, bare JSON, edge cases
│       │   └── schemas.test.js     ← walidacja schematu Zod z fixture'ami breakdown
│       └── integration/
│           └── analyze.test.js     ← SSE flow z mockiem analyzeCV
└── frontend/
    ├── package.json
    ├── next.config.js
    ├── tailwind.config.js
    └── src/app/
        ├── layout.jsx
        ├── page.jsx                ← 3 zakładki, SSE fetch loop, zapis historii
        ├── globals.css
        └── components/
            ├── AnalyzeForm.jsx     ← ogłoszenie + tryb PDF/profil; CV z localStorage
            ├── MatchScore.jsx      ← combined score, per-skill breakdown chips
            ├── GapAnalysis.jsx     ← lista braków z badge kategorii
            ├── BulletPoints.jsx    ← bullet pointy + kopiowanie do schowka
            ├── ProfileTab.jsx      ← CV textarea + chip input + zapis do localStorage
            ├── HistoryTab.jsx      ← lista zapisanych analiz, Wczytaj/Usuń
            └── StreamingStatus.jsx ← animacja podczas ładowania
```

---

## Testowanie

Testy są tylko po stronie backendu (31 przypadków).

```bash
cd backend
npm test
```

### Uruchamianie wybranych testów

```bash
# Tylko unit testy
npm test -- --testPathPattern=unit

# Tylko testy extractJSON
npm test -- --testPathPattern=extractJSON

# Tylko testy integracyjne
npm test -- --testPathPattern=integration
```

### Co jest testowane

| Plik | Rodzaj | Co sprawdza |
|---|---|---|
| `extractJSON.test.js` | unit | Wycinanie JSON z markdown fences, bare JSON, edge cases |
| `schemas.test.js` | unit | Walidacja schematu Zod: breakdowny, gaps, bullets |
| `analyze.test.js` | integration | Kontrakt SSE: kolejność eventów, struktura payloadu — z mockiem `analyzeCV` |

Testy integracyjne mockują `analyzeCV` — testują kontrakt SSE, nie model AI. Prawdziwe wywołania API byłyby niedeterministyczne i kosztowne.

---

## Deployment

Projekt działa na dwóch osobnych serwisach.

### Backend — Render

1. Utwórz nowy **Web Service** na [render.com](https://render.com)
2. Wskaż katalog `backend/` jako root
3. Build command: `npm install`
4. Start command: `npm start`
5. Dodaj zmienne środowiskowe: `ANTHROPIC_API_KEY`, `FRONTEND_URL`

### Frontend — Vercel

1. Importuj repozytorium na [vercel.com](https://vercel.com)
2. Ustaw **Root Directory** na `frontend`
3. Dodaj zmienną środowiskową: `NEXT_PUBLIC_API_URL` → URL backendu z Render

Po deploymencie zaktualizuj `FRONTEND_URL` w Render na URL frontendu z Vercel (wymagane dla CORS).

---

## Czego się nauczyłem

**Przenoś obliczenia do kodu zawsze gdy to możliwe.** Claude jest dobry w reasoning semantycznym ("czy kandydat posiada tę umiejętność?"), ale fatalny w arytmetyce przy 10+ pozycjach — zwrócił 7.5 zamiast 16 przy poprawnym breakdown. Rozwiązanie: model zwraca tylko dane per-element, JS liczy sumy przez `.reduce()`.

**Prompt engineering to iteracja, nie jednorazowe napisanie.** Zanim system prompt osiągnął obecną formę, przeszedł ~15 iteracji. Główny problem: zbyt ogólne sugestie ("rozważ dodanie umiejętności technicznych"). Rozwiązanie: few-shot examples pokazujące kontrast DOBRY/NIEDOZWOLONY, zasada "jeden bullet ogłoszenia = jedna pozycja w breakdown", tablice funkcjonalnych odpowiedników.

**Architektura SSE jest prostsza niż polling i daje lepszy UX.** Keepalive co 5 sekund (`}: keepalive`) trzyma połączenie podczas długich odpowiedzi Claude. Polling generowałby zbędne requesty i opóźnienie między chunkami.

**Walidacja wejść przed otwarciem SSE.** Po wywołaniu `res.flushHeaders()` nie można zmienić HTTP status — błędy 400 muszą wychodzić przed tym momentem. Odkryłem to debugując błędy walidacji które przechodziły do klienta jako status 200 z eventem `error`.

---

## Licencja

[MIT](LICENSE)
