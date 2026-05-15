PLAN PREZENTACJI PORTFOLIO — CVMatch
=====================================

## 1. README.md

**Pierwszy akapit:**

  # CVMatch

  Wklejasz CV i ogłoszenie o pracę — dostajesz konkretne informacje:
  ile z wymaganych umiejętności już masz (np. "9 z 14"), co dokładnie
  brakuje i gotowe przepisane fragmenty CV zoptymalizowane pod to
  ogłoszenie. Bez ogólników, bez "rozważ dodanie słów kluczowych" —
  tekst gotowy do wklejenia.

**Struktura sekcji README:**

  # CVMatch
  [badge: Node.js] [badge: Next.js] [badge: Claude API] [badge: Railway]

  > Jedna linia — czym jest projekt

  ## Demo
  [GIF pokazujący 30 sekund działania — NAJWAŻNIEJSZY element]

  ## Problem który rozwiązuje
  2-3 zdania o problemie kandydatów

  ## Jak to działa
  Diagram przepływu: CV + ogłoszenie → API → wyniki

  ## Funkcje
  - Wynik "X z Y wymaganych umiejętności"
  - Gap analysis z kategoriami (Technologia / Soft skill / Certyfikat)
  - Przepisane bullet pointy gotowe do wklejenia
  - Streaming wyników przez SSE

  ## Stos technologiczny
  | Technologia          | Zastosowanie                                        |
  |----------------------|-----------------------------------------------------|
  | Claude API (Anthropic) | Analiza semantyczna CV, generowanie sugestii      |
  | Express.js + Railway | Backend, obsługa SSE, brak limitu timeout           |
  | Next.js + Vercel     | Frontend, routing, deploy                           |
  | localStorage         | Historia analiz (bez backendu, persystencja lokalna) |
  | Tailwind CSS + shadcn/ui | UI                                              |

  ## Uruchomienie lokalne
  (konkretne komendy instalacji i uruchomienia)

  ## Architektura
  Krótki opis podziału backend/frontend + dlaczego Railway zamiast Vercel Functions

  ## Co nauczyłem się budując ten projekt
  (pokazuje refleksję i że naprawdę to zrobiłeś)

**Jak opisać technologie — wzorzec:**

  NIE: "używam AI do analizy"
  TAK: "Claude API (Anthropic) analizuje semantyczne dopasowanie CV do
        ogłoszenia i generuje ustrukturyzowany JSON z brakami i sugestiami.
        Natywna obsługa PDF przez Claude API eliminuje potrzebę osobnej
        biblioteki do parsowania dokumentów."

  Wzorzec: konkretna technologia + konkretne zastosowanie + konkretny problem który rozwiązuje.

---

## 2. Demo

**Format: wideo (nie live demo)**

  Wideo zawsze działa, nie wymaga klucza API na produkcji, można edytować.
  Hostuj na YouTube (unlisted), wklej link w README jako klikalny GIF/thumbnail.

**Scenariusz (90 sekund):**

  0:00 - 0:05  Pokaż pustą stronę z formularzem
  0:05 - 0:15  "To jest moje prawdziwe CV" — wklej CV (skopiowane wcześniej)
  0:15 - 0:25  "To ogłoszenie z Pracuj.pl na Junior AI Developer" — wklej ogłoszenie
  0:25 - 0:30  Kliknij "Analizuj" — pokaż spinner / SSE w trakcie
  0:30 - 0:50  Wyniki pojawiają się na bieżąco (streaming)
               Zatrzymaj się na "9 z 14 wymaganych umiejętności" — podkreśl głosem
  0:50 - 1:05  Gap analysis — przeczytaj jeden konkretny brak z kategorią
               np. "Docker — wymagany w pkt 2 ogłoszenia, brak w sekcji Umiejętności"
  1:05 - 1:25  Przepisany bullet point — "to wklejam bezpośrednio do CV"
               Kliknij "Kopiuj"
  1:25 - 1:30  Zakończ lub pokaż learning roadmap

**Zasady nagrywania:**
  - Prawdziwe CV i prawdziwe ogłoszenie — nie przykładowe dane
  - Mów co i dlaczego robisz podczas nagrywania
  - Zoom na kluczowe wyniki (powiększ czcionkę przed nagraniem)
  - Maksymalnie 2 minuty — po 2 minutach rekruter przestaje oglądać

---

## 3. Opis techniczny na rozmowie

**30-sekundowy elevator pitch:**

  "Zbudowałem narzędzie które porównuje CV z ogłoszeniem o pracę i daje
  konkretny feedback zamiast ogólnych porad. Dajesz mu CV i ogłoszenie,
  a ono mówi ile z wymaganych umiejętności masz, czego dokładnie brakuje
  i przepisuje konkretne fragmenty CV pod to ogłoszenie. Backend w
  Express.js na Railway, frontend w Next.js na Vercel, analiza przez
  Claude API od Anthropic. Główne wyzwanie techniczne to obsługa długich
  odpowiedzi AI przez SSE — żeby użytkownik nie patrzył na białą stronę
  przez 20 sekund."

**Decyzje architektoniczne do podkreślenia:**

  1. Backend na Railway zamiast Vercel Functions
     Vercel Functions mają limit 10 sekund, Claude API odpowiada 15-25 sekund.
     Zamiast hacków z Edge Runtime — Express.js na Railway jako długo działający
     serwer. Prostsze i bardziej przewidywalne.

  2. SSE keepalive zamiast pollingu
     Co 5 sekund wysyłam ": keepalive" żeby połączenie nie padło.
     Użytkownik widzi że coś się dzieje. Polling generowałby zbędne requesty
     i opóźnienie.

  3. Zod schema validation dla JSON z Claude
     Claude czasem dodaje markdown wokół JSON lub zmienia strukturę.
     Zamiast JSON.parse z try/catch — Zod schema, Claude musi zwrócić
     dokładnie ten format lub wywołanie rzuca obsługiwany błąd.

**Problemy i rozwiązania (historia do opowiedzenia):**

  Problem → Claude timeout na Vercel
  Rozwiązanie → Railway + SSE keepalive

  Problem → Claude zwraca niestabilny JSON
  Rozwiązanie → Zod schema + structured output

  Problem → Sugestie były za generyczne
  Rozwiązanie → few-shot examples w prompcie (iterowałem ~15 razy)

**Jak mówić o AI bez buzzwordów:**

  NIE: "projekt wykorzystuje AI do analizy"
  TAK: "Napisałem prompt który każe Claude'owi przeanalizować semantyczne
        pokrycie między sekcjami CV a wymaganiami ogłoszenia. Iterowałem
        prompt około 15 razy — główny problem był taki, że Claude dawał za
        ogólne sugestie. Rozwiązanie: few-shot examples w prompcie które
        pokazują mu co to znaczy 'konkretny' feedback."

  Rekruter słyszy: iteracja, inżynieria, rozwiązywanie problemów.

---

## 4. Repozytorium GitHub — checklist

**Struktura plików:**

  cvmatch/
  ├── README.md                  ← z GIF/screenshot i instrukcją uruchomienia
  ├── .env.example               ← wszystkie klucze bez wartości (commituj)
  ├── .gitignore
  ├── backend/
  │   ├── package.json
  │   ├── src/
  │   │   ├── index.js           ← serwer Express
  │   │   ├── routes/analyze.js
  │   │   └── lib/claude.js
  │   └── tests/
  │       └── unit/extractJSON.test.js     ← minimum 1 test
  └── frontend/
      ├── package.json
      └── ...Next.js struktura

**Jak powinien wyglądać git log:**

  DOBRZE:
  feat: add SSE keepalive to prevent timeout on long analyses
  feat: add gap analysis with category badges
  feat: implement PDF upload via Claude API native document support
  feat: add match score "X of Y skills" format
  feat: add analyze form with CV and job posting inputs
  chore: setup Express backend with Railway deployment
  init: project structure and dependencies

  ŹLE:
  fix / update / changes / asdf / working now / finally

  Wzorzec: jeden commit = jedna konkretna zmiana, prefix feat:/fix:/chore:

**.gitignore — co musi być:**

  # env
  .env
  .env.local
  .env.*.local

  # dependencies
  node_modules/

  # Next.js
  .next/
  out/

  # build
  dist/
  build/

  # OS
  .DS_Store
  Thumbs.db

  # IDE
  .vscode/
  .idea/

**Testy — minimum:**

  // backend/tests/unit/extractJSON.test.js
  describe("extractJSON", () => {
    it("strips markdown fences and returns valid JSON string", () => {
      const input = "```json\n{\"key\": \"value\"}\n```";
      expect(JSON.parse(extractJSON(input))).toEqual({ key: "value" });
    });

    it("returns bare JSON unchanged", () => {
      const input = '{"key": "value"}';
      expect(extractJSON(input)).toBe(input);
    });
  });

  Jeden działający test > brak testów.
  Pokazuje że wiesz że testy istnieją i umiesz je napisać.
