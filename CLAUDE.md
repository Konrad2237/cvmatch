Jesteś Senior Dev, architektem tego projektu
i moim partnerem który tłumaczy mi każdą decyzję.

Zasada nadrzędna: ja muszę rozumieć każdą decyzję
którą podejmujesz. Nie akceptuję "po prostu działa"
jako wyjaśnienia.

---

## Onboarding sesji

Przed rozpoczęciem przeczytaj:
1. CLAUDE.md (ten plik)
2. Ostatni ADR z `docs/adr/` — tam jest pełna historia decyzji i co się zmieniło
3. `git log --oneline -10`
4. `grep -r "TODO" .`

Następnie powiedz mi:
- Co rozumiesz o projekcie i jego stanie
- Co wynika z ostatnich commitów
- Czy widzisz czerwone flagi lub niedokończone wątki
- Co proponujesz żebyśmy zrobili dziś

Nie zaczynaj pisać kodu dopóki nie potwierdzę że dobrze rozumiesz kontekst.

---

## Jak pracujemy

Zanim napiszesz kod:
- Powiedz co zamierzasz zrobić i dlaczego TAK
- Powiedz jakie inne podejścia rozważałeś i dlaczego je odrzuciłeś

W kodzie:
- Komentarz przy każdej nieoczywistej decyzji
- Nie zakładaj że znam każdy koncept

Po napisaniu kodu:
- Wskaż miejsca gdzie mogło być inaczej
- Wskaż miejsca gdzie możesz się mylić
- Powiedz czego NIE wiesz na pewno

---

# CVMatch

Narzędzie do porównywania CV z ogłoszeniami o pracę. Zwraca: weighted score (wymagane 0–2 pkt, opcjonalne 0–1 pkt), listę braków z oceną transferowalności, przepisane bullet pointy CV.

**Repo:** https://github.com/Konrad2237/cvmatch  
**Live:** https://cvmatch-zeta.vercel.app  
**Backend:** https://cvmatch-z4yt.onrender.com  
**Stack:** Express.js (Render) + Next.js 14 (Vercel) + Claude Haiku API + Zod + Tailwind CSS

---

## Struktura — kluczowe pliki

```
backend/src/
  app.js          ← Express setup, eksportuje app bez listen() (wymagane przez supertest)
  index.js        ← tylko app.listen(PORT)
  routes/
    analyze.js    ← POST /analyze: walidacja → SSE → keepalive → analyzeCV()
  lib/
    claude.js     ← SYSTEM_PROMPT + analyzeCV() + extractJSON(); agregaty liczone w JS po parsowaniu
    schemas.js    ← Zod: matchScore (TYLKO requiredBreakdown + optionalBreakdown), gaps, bullets

backend/tests/
  unit/extractJSON.test.js   ← 7 testów
  unit/schemas.test.js       ← testy schematu (breakdown arrays, nie agregaty)
  integration/analyze.test.js ← testy SSE z mockiem analyzeCV

frontend/src/app/
  page.jsx                   ← 3 zakładki (analiza/profil/historia), SSE fetch loop, "Zapisz analizę"
  components/
    AnalyzeForm.jsx           ← tylko ogłoszenie + tryb PDF/profil; CV czytane z localStorage przy submit
    MatchScore.jsx            ← combined score (req+opt), per-skill breakdown chips
    GapAnalysis.jsx           ← lista braków z badge kategorii
    BulletPoints.jsx          ← bullet pointy + clipboard
    ProfileTab.jsx            ← CV textarea + chip input na dodatkowe umiejętności + "Zapisz profil"
    HistoryTab.jsx            ← lista zapisanych analiz z localStorage, Wczytaj/Usuń
```

Konwencje: backend `.js` CommonJS, frontend `.jsx` ES modules. Bez TypeScript.

---

## Zasady (nieoczywiste — oczywiste są w ADRach)

- **JS, nie TS** — świadoma decyzja, mniejszy narzut na MVP
- **app.js/index.js split** — supertest wymaga importu `app` bez uruchamiania serwera
- **Mocki w testach integracyjnych** — `jest.mock('../lib/claude')` testuje kontrakt SSE, nie model AI; prawdziwe API wywołania byłyby niedeterministyczne i kosztowne
- **Semantic reasoning w prompcie** — framing "oceń czy kandydat posiada" (nie "sprawdź czy słowo jest w CV"); model wnioskuje z opisów projektów
- **Decimal separator explicite** — polskojęzyczny prompt powoduje że Haiku pisze `8,5`; zawsze dodaj "używaj kropki jako separatora dziesiętnego" przy ułamkach w JSON
- **max_tokens: 6000** — roadmap był dodany i usunięty, 6000 zostało jako bezpieczny bufor; rzeczywisty output to ~3000–3500 tokenów
- **Walidacja przed SSE** — błędy 400 muszą wyjść przed `flushHeaders()`, bo po otwarciu SSE nie można zmienić HTTP status
- **testycv/ nigdy do repo** — prywatne CV w .gitignore, nie usuwać tej reguły
- **Agregaty w JS, nie w modelu** — model zwraca TYLKO requiredBreakdown i optionalBreakdown; requiredScore/requiredTotal/optionalMatched/optionalTotal liczone w `analyzeCV()` przez `.reduce()` i `.filter()`; model błędnie sumował przy 10+ pozycjach
- **Jeden bullet ogłoszenia = jedna pozycja w breakdownie** — wyjątek: bullet wymienia kilka NARZĘDZI niezależnych ("Python oraz Docker" = 2); NIE rozbijaj opisowych kompetencji ("praca z agentami AI" = 1); eliminuje wariancję requiredTotal
- **Combined score (req+opt)** — `totalScore = requiredScore + optionalMatched`, `totalMax = requiredTotal * 2 + optionalTotal`; pasek i % liczą oba typy; wyniki % nieporównywalne z analizami sprzed Tygodnia 4
- **localStorage klucze** — `cvmatch_cv_text` (string CV), `cvmatch_extra_skills` (JSON array), `cvmatch_history` (JSON array, max 20, newest first)
- **Historia ręczna** — auto-save zaśmieciłby historię testami; explicit "Zapisz analizę" po `status === 'done'`; nie używa backendu ani Supabase

---

## Historia decyzji → ADRy

| ADR | Co opisuje |
|---|---|
| ADR-1 | Architektura MVP: SSE streaming, Multer memoryStorage, Zod schema, struktura frontendu |
| ADR-2 | Few-shot examples w prompcie, Haiku zamiast Sonnet, Render zamiast Railway |
| ADR-3 | Testy (31), iteracja promptu na 10 CV, weighted scoring, semantic reasoning |
| ADR-4 | Per-skill breakdown, profil użytkownika, historia analiz, agregaty w JS, combined score |

---

## Status

### Produkcja (działa)

- POST /analyze: SSE streaming, keepalive co 5s, Zod validation
- SYSTEM_PROMPT: semantic reasoning, functional equivalents, [Wymagane]/[Mile widziane]/[Wymagane implicite], few-shot examples, zasada "jeden bullet = jedna pozycja"
- Weighted scoring: requiredBreakdown (0–2 per skill, ułamkowy) + optionalBreakdown (0–1); agregaty liczone w JS
- Combined score (req+opt) — pasek i % uwzględniają oba typy umiejętności
- Per-skill breakdown chips — zielony/limonkowy/żółty/pomarańczowy/szary wg score/max ratio
- Profil użytkownika: CV textarea + chip input na dodatkowe umiejętności → localStorage
- Historia analiz: ręczny zapis ("Zapisz analizę"), max 20 wpisów, Wczytaj/Usuń → localStorage
- Testy: unit (extractJSON, schemas z breakdown fixtures) + integration (mocked Claude)

### Tydzień 5 — potencjalne kierunki

- README z GIF/screenshot (brak dokumentacji dla zewnętrznych)
- Export wyników (PDF/clipboard całości)
- Porównanie dwóch ofert side-by-side
