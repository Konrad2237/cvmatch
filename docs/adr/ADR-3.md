# ADR-3: Testy, Iteracja Promptu i Weighted Scoring — Tydzień 3

**Data:** 2026-05-15  
**Status:** Accepted  
**Dotyczy:** `backend/src/lib/claude.js`, `backend/src/lib/schemas.js`, `backend/src/app.js`, `backend/src/index.js`, `frontend/src/app/components/MatchScore.jsx`, `backend/tests/`

---

## 🤖 Kontekst dla Claude (przyszłe sesje)

### Nowe pliki względem ADR-2

```
cvmatch/
├── backend/
│   ├── src/
│   │   ├── app.js          ← EXPRESS SETUP (nowy) — importowalny bez listen()
│   │   ├── index.js        ← tylko app.listen(PORT) — split wymagany przez supertest
│   │   └── lib/
│   │       ├── claude.js   ← SYSTEM_PROMPT znacznie rozbudowany (patrz niżej)
│   │       └── schemas.js  ← matchScore schema zmieniona na weighted
│   └── tests/
│       ├── unit/
│       │   ├── extractJSON.test.js   ← 7 testów jednostkowych (bez API)
│       │   └── schemas.test.js       ← 14 testów jednostkowych Zod
│       └── integration/
│           └── analyze.test.js       ← 10 testów z mocked analyzeCV, supertest
```

**Dlaczego app.js/index.js split:** supertest importuje moduł bez uruchamiania serwera. Jeśli `listen()` jest w tym samym pliku co `app`, każdy `require('./app')` otwiera port — błąd `EADDRINUSE`. Rozwiązanie: `app.js` eksportuje `app`, `index.js` tylko wywołuje `app.listen()`.

### Aktualny SYSTEM_PROMPT — struktura i zasady

```
Framing: "oceń ile z nich kandydat realnie posiada — wnioskuj z opisów projektów
          i listy umiejętności w CV, nie szukaj dosłownych słów kluczowych"

ZADANIE 1 — matchScore:
  - każda technologia/umiejętność osobno, "React i Redux" = 2
  - bez soft skills behawioralnych (samodzielność, komunikatywność itp.)
  - alternatywy ("Playwright lub Cypress") = JEDNA umiejętność
  - tabela ekwiwalentów funkcjonalnych (n8n↔Make.com, pgvector↔Pinecone,
    LangGraph↔LangChain, Claude API↔OpenAI API, Railway↔Render, PostgreSQL↔MySQL)
  - skala punktowa wymaganych: 2 (bezpośrednio) / 1.5 (bliski odpowiednik)
    / 1 (ekosystem, wymaga nauki) / 0.5 (luźne powiązanie) / 0 (brak)
  - opcjonalne (mile widziane): 0 lub 1
  - Zasada OPCJONALNE + odpowiednik → optionalMatched += 1, nie dodawaj gap
  - Zasada OBOWIĄZKOWE + odpowiednik → requiredScore += 1, dodaj gap z [Wymagane]

ZADANIE 2 — gaps (min 5):
  - etykiety: [Wymagane] | [Mile widziane] | [Wymagane implicite]
  - [Wymagane implicite]: wymóg wynika z kontekstu roli, nie jest w sekcji wymagań
  - każdy gap: WHERE w ogłoszeniu + WHY brakuje + ocena transferowalności
  - 3 DOBRY/NIEDOZWOLONY few-shot examples

ZADANIE 3 — bullets (3-5):
  - 2 DOBRY/NIEDOZWOLONY few-shot examples

Format JSON: matchScore z 4 polami (patrz niżej)
```

### Schema matchScore (aktualna)

```js
// schemas.js
matchScore: z.object({
  requiredScore:   z.number().min(0),      // suma punktów, może być ułamkowa (np. 8.5)
  requiredTotal:   z.number().int().min(0), // liczba wymaganych umiejętności
  optionalMatched: z.number().int().min(0), // ile opcjonalnych kandydat posiada
  optionalTotal:   z.number().int().min(0), // ile opcjonalnych jest w ogłoszeniu (0 jeśli brak)
})
```

**Ważne:** `requiredScore` musi być liczbą z kropką (`8.5`), nie przecinkiem (`8,5`). Polskojęzyczny prompt sprawia że model domyślnie używa polskiej notacji dziesiętnej — prompt explicite mówi "używaj kropki jako separatora". Zod przyjmuje obie, ale `JSON.parse("8,5")` rzuca błąd.

### MatchScore.jsx — nowe wyświetlanie

```
"8.5 z 12 pkt wymaganych • 2 z 4 mile widzianych"
pasek postępu = requiredScore / (requiredTotal * 2) * 100
sekcja "mile widzianych" ukryta gdy optionalTotal === 0
```

### Przepływ danych SSE (zaktualizowany)

```
onEvent('score', {
  requiredScore: 8.5,
  requiredTotal: 6,
  optionalMatched: 2,
  optionalTotal: 4
})
onEvent('gaps',    [...])
onEvent('bullets', [...])
onEvent('done',    null)
```

### max_tokens

`max_tokens: 4096` — zmienione z 2048 po tym jak rozbudowany prompt (opisy transferowalności + etykiety [Wymagane]) generował dłuższe outputy i JSON obcinał się w połowie na pozycji ~5485.

### Co próbowaliśmy i nie zadziałało

**1. `"sprawdź ile z nich jest w CV"` jako framing ZADANIE 1**  
Powodował keyword matching — model szukał dosłownych słów, nie oceniał kompetencji. "Claude" jako gap mimo że CV zawierało "Anthropic API / Claude Haiku". "CI/CD pipeline" jako gap mimo że CV opisywało testy automatyczne. Naprawka: zmiana framingu na "wnioskuj z opisów projektów".

**2. `"doświadczenie i wiedzę"` jako phrasing w framingu**  
"Doświadczenie" po polsku to też "praca zawodowa" (wojsko, handel) — model mógłby wnioskować z doświadczenia zawodowego zamiast z projektów technicznych. Zmienione na "opisy projektów i listę umiejętności".

**3. Reguła "nie dodawaj do gaps umiejętności które sam opisujesz jako spełnione"**  
Band-aid na objaw (Test 4: "Claude" w gaps z opisem "wymóg spełniony"). Przyczyna była głębsza — keyword matching. Usunięta na rzecz naprawienia źródłowego problemu (framing).

**4. `max_tokens: 2048`**  
Za mały po rozbudowie promptu. JSON obcinał się w połowie tablicy `gaps`.

**5. Polski separator dziesiętny**  
Prompt po polsku → model pisał `8,5` zamiast `8.5` w JSON → `JSON.parse` rzucał błąd. Naprawka: explicite "używaj kropki jako separatora" w dwóch miejscach promptu.

---

## 👤 Dla mnie (ludzki język)

### Kontekst

Tydzień 3 miał trzy równoległe wątki: zbudować testy żeby zmiany promptu nie psuły aplikacji nieświadomie, przeprowadzić 10 prawdziwych analiz CV żeby zobaczyć co prompt robi źle, i wdrożyć poprawki wynikające z tych obserwacji. Na koniec doszedł czwarty wątek: weighted scoring, bo binarny wynik "umiem/nie umiem" nie oddawał rzeczywistości.

### Kluczowe decyzje

**1. app.js/index.js split dla testowalności**

Zanim napisałem testy, odkryłem że nie mogę importować aplikacji Express bez uruchomienia serwera — `listen()` było w tym samym pliku co setup. Supertest potrzebuje dostępu do `app` bez otwierania portu. Split na dwa pliki to standard Node.js, ale trzeba to wiedzieć.

**2. Mocki zamiast prawdziwego Claude API w testach**

Testy integracyjne mogłyby wywoływać prawdziwe API i sprawdzać "czy Claude zwrócił co najmniej 5 braków". Problem: 10 testów × 8948 tokenów = ~90K tokenów przy każdym `npm test`. Przy cenie Haiku to ~$0.10 za test run, ale ważniejsze że testy byłyby niedeterministyczne (Claude może zwrócić różne wyniki). Mocki testują **kontrakt** (czy aplikacja poprawnie parsuje i strumieniuje), nie **model**.

**3. 10 testów w dwóch rundach zamiast jednorazowej iteracji**

Pierwsza runda (5 testów) dała listę 4 problemów. Zamiast od razu wdrożyć wszystkie poprawki i liczyć że zadziałały, najpierw wdrożyłem zmiany, potem zrobiłem drugą rundę 5 testów żeby zweryfikować. To pozwoliło zobaczyć co rzeczywiście się poprawiło (grupowanie alternatyw, etykiety, transferowalność) a co nadal nie działało (keyword matching, "Claude" w gaps).

**4. Semantic reasoning zamiast band-aidu**

W Teście 4 pojawił się konkretny błąd: "Claude" w gaps z opisem "wymóg jest w pełni spełniony" — sprzeczność. Pierwsza myśl: dodaj regułę "nie wrzucaj do gaps czego opisujesz jako spełnione". Odrzuciłem bo to gaszenie pożaru zamiast zapobiegania. Prawdziwa przyczyna: model szukał słowa "Claude" i nie znalazł go dosłownie (CV miało "Anthropic API"). Naprawa: zmiana framingu z keyword matching na reasoning.

**5. Weighted scoring z ułamkami**

Binarne "umiem/nie umiem" kłamie. Kandydat z LangGraph zamiast LangChain nie ma 0/2 — ma może 1.5/2. Skala 0/0.5/1/1.5/2 dla wymaganych plus 0/1 dla opcjonalnych oddaje realne dopasowanie. Opcjonalne nie wchodzą do sumy wymaganych — inaczej ogłoszenie bez sekcji "mile widziane" dawałoby zawyżone wyniki.

**6. Token streaming — odrzucony**

Zaplanowany w Tygodniu 3. Odrzucony: JSON musi być kompletny żeby go sparsować więc streaming nie da "wyniki pojawiają się słowo po słowie". Mamy już progresywny render przez SSE (score → gaps → bullets). Spinner z napisem "może to zająć 20-30 sekund" wystarczy dla narzędzia osobistego.

### Alternatywy które odrzucono

| Decyzja | Odrzucona alternatywa | Powód |
|---|---|---|
| Semantic reasoning framing | Band-aid "nie dodawaj spełnionych gapów" | Leczyło objaw, nie przyczynę |
| "opisy projektów i listy umiejętności" | "doświadczenie i wiedzę" | "Doświadczenie" po polsku = praca zawodowa — ambiguity |
| Mocki w testach | Prawdziwe wywołania API | Niedeterministyczne + kosztowne ($0.10/run) |
| Decimal 8.5 z kropką | Pozwolić modelowi na 8,5 | Polish notation breaks JSON.parse |
| Token streaming dropped | Implementacja token streaming | JSON wymaga pełnej odpowiedzi — streaming by nic nie dał |

### Konsekwencje dla projektu

**Dobre:**
- 31 testów jednostkowych i integracyjnych — prompt można zmieniać bez strachu
- Score jest teraz meaningful: 8.5 z 12 pkt mówi więcej niż 9 z 14
- Model reasoning zamiast keyword matching — działa też dla nieoczywistych dopasowań
- [Wymagane implicite] jako trzecia etykieta — inteligentniejsza analiza ogłoszeń

**Do uwagi:**
- matchScore z 4 polami to breaking change — stara wersja miała 2 pola. Render deployuje z main automatycznie, ale jeśli ktokolwiek inny miałby frontend z inną wersją backendową — błąd schematu Zod
- requiredScore może być nieoczekiwanie ułamkowy w edge cases — MatchScore.jsx wyświetla to poprawnie, ale warto sprawdzić w testach UI
- testycv/ nigdy nie trafia do repo — prywatne CV w .gitignore

### Czego się nauczyłem

Keyword matching vs semantic reasoning to fundamentalna różnica w prompt engineeringu. Instrukcja "sprawdź czy jest w CV" kieruje model do szukania słów. Instrukcja "oceń czy kandydat posiada tę kompetencję" kieruje model do wnioskowania. Ta sama wiedza modelu, zupełnie inne zachowanie — zmiana jednej linii promptu.

Testy na prawdziwych danych (10 CV × ogłoszenia z Pracuj.pl) dały więcej insightów niż tydzień analizy teoretycznej. 4 systematyczne problemy promptu wyszły po 5 testach. Żaden nie wyszedłby bez prawdziwego inputu.
