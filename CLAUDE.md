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
    claude.js     ← SYSTEM_PROMPT + analyzeCV() + extractJSON()
    schemas.js    ← Zod: matchScore (requiredScore/Total + optionalMatched/Total), gaps, bullets

backend/tests/
  unit/extractJSON.test.js   ← 7 testów
  unit/schemas.test.js       ← 14 testów
  integration/analyze.test.js ← 10 testów (mocked analyzeCV, supertest)

frontend/src/app/
  page.jsx                   ← SSE fetch loop, stan idle/loading/done/error
  components/
    AnalyzeForm.jsx           ← formularz tekst/PDF
    MatchScore.jsx            ← "X z Y pkt wymaganych • A z B mile widzianych"
    GapAnalysis.jsx           ← lista braków z badge kategorii
    BulletPoints.jsx          ← bullet pointy + clipboard
```

Konwencje: backend `.js` CommonJS, frontend `.jsx` ES modules. Bez TypeScript.

---

## Zasady (nieoczywiste — oczywiste są w ADRach)

- **JS, nie TS** — świadoma decyzja, mniejszy narzut na MVP
- **app.js/index.js split** — supertest wymaga importu `app` bez uruchamiania serwera
- **Mocki w testach integracyjnych** — `jest.mock('../lib/claude')` testuje kontrakt SSE, nie model AI; prawdziwe API wywołania byłyby niedeterministyczne i kosztowne
- **Semantic reasoning w prompcie** — framing "oceń czy kandydat posiada" (nie "sprawdź czy słowo jest w CV"); model wnioskuje z opisów projektów
- **Decimal separator explicite** — polskojęzyczny prompt powoduje że Haiku pisze `8,5`; zawsze dodaj "używaj kropki jako separatora dziesiętnego" przy ułamkach w JSON
- **max_tokens: 4096** — rozbudowany prompt z opisami transferowalności generuje dłuższe odpowiedzi; 2048 obcina JSON w połowie
- **Walidacja przed SSE** — błędy 400 muszą wyjść przed `flushHeaders()`, bo po otwarciu SSE nie można zmienić HTTP status
- **testycv/ nigdy do repo** — prywatne CV w .gitignore, nie usuwać tej reguły

---

## Historia decyzji → ADRy

| ADR | Co opisuje |
|---|---|
| ADR-1 | Architektura MVP: SSE streaming, Multer memoryStorage, Zod schema, struktura frontendu |
| ADR-2 | Few-shot examples w prompcie, Haiku zamiast Sonnet, Render zamiast Railway |
| ADR-3 | Testy (31), iteracja promptu na 10 CV, weighted scoring, semantic reasoning |

---

## Status

### Produkcja (działa)

- POST /analyze: SSE streaming, keepalive co 5s, Zod validation
- SYSTEM_PROMPT: semantic reasoning, functional equivalents, [Wymagane]/[Mile widziane]/[Wymagane implicite], few-shot examples
- Weighted scoring: requiredScore (0–2 per skill, ułamkowy) + optionalMatched/Total
- 31 testów: unit (extractJSON, schemas) + integration (mocked Claude)

### Tydzień 4 — następne

- Breakdown "za co dostałem punkty" — lista wymaganych z ich punktacją obok gaps
- Historia analiz w Supabase
- Profil użytkownika w localStorage (zapisane CV, bez wklejania za każdym razem)
- Learning roadmap — priorytetowa lista umiejętności do nauki
- README z GIF/screenshot
