# CVMatch

Narzędzie do analizy CV względem ogłoszenia o pracę — zwraca wynik dopasowania, listę braków i przepisane bullet pointy gotowe do wklejenia.

---

## Spis treści

1. [Co robi](#co-robi)
2. [Funkcjonalności](#funkcjonalności)
3. [Technologie](#technologie)
4. [Jak to działa](#jak-to-działa)
5. [Struktura projektu](#struktura-projektu)
6. [Czego się nauczyłem](#czego-się-nauczyłem)
7. [Autor](#autor)

---

## Co robi

Wklejasz CV i ogłoszenie o pracę — w 30 sekund dostajesz konkretny feedback: ile wymaganych umiejętności masz i ile brakuje, listę braków z wyjaśnieniem dlaczego są ważne i jak bardzo są transferowalne, oraz gotowe fragmenty CV przepisane językiem konkretnego ogłoszenia do wklejenia bez edycji.

Zamiast zastanawiać się "dlaczego mnie nie zaproszono na rozmowę" — wiesz dokładnie co poprawić przed następną aplikacją.

---

## Funkcjonalności

- **Analiza CV vs ogłoszenie** — wklej tekst CV z zapisanego profilu lub wgraj PDF; wyniki w 20–30 sekund
- **Weighted score per umiejętność** — każda wymagana umiejętność oceniana w skali 0–2 pkt (bezpośrednie posiadanie, bliski odpowiednik, pokrewna technologia); opcjonalne 0–1 pkt
- **Per-skill breakdown** — kolorowe chipy przy każdej umiejętności: zielony (2/2) → limonkowy → żółty → pomarańczowy → szary (0/2)
- **Gap analysis** — minimum 5 braków z kategorią (Technologia / Soft skill / Certyfikat), etykietą ważności ([Wymagane] / [Mile widziane] / [Wymagane implicite]) i oceną transferowalności
- **Przepisane bullet pointy** — 3–5 fragmentów CV z słowami kluczowymi z ogłoszenia; przycisk "Kopiuj" przy każdym
- **Profil użytkownika** — zapisz CV raz w zakładce Profil; możliwość dopisania dodatkowych umiejętności nieujętych w formalnym CV jako osobne chipy
- **Historia analiz** — ręczny zapis wybranych wyników (max 20), podgląd i wczytanie bez ponownej analizy; dane w localStorage, bez backendu
- **Streaming wyników** — score → braki → bullet pointy pojawiają się sekcja po sekcji zamiast po 30 sekundach ciszy

---

## Technologie

| Narzędzie | Wersja | Do czego |
|---|---|---|
| Express.js | 4.19.2 | Backend HTTP + SSE streaming |
| Node.js | 18+ | Runtime backendu |
| @anthropic-ai/sdk | 0.30.0 | Klient Claude API |
| Claude Haiku | claude-haiku-4-5-20251001 | Model AI — analiza, gap analysis, bullet pointy |
| Multer | 2.1.1 | Upload PDF w pamięci RAM (memoryStorage) |
| Zod | 3.23.8 | Walidacja struktury JSON z Claude |
| Next.js | 14.2.5 | Frontend (App Router) |
| React | 18.3.1 | UI |
| Tailwind CSS | 3.4.10 | Stylowanie |
| Jest + Supertest | 29.7 + 7.2 | Testy jednostkowe i integracyjne (31 testów) |
| Render | — | Hosting backendu (free tier) |
| Vercel | — | Hosting frontendu |

---

## Jak to działa

### Flow od inputu do outputu

```
Przeglądarka
  → FormData (cvText z localStorage lub plik PDF + treść ogłoszenia)
  → POST /analyze

Backend (Express)
  → Walidacja wejścia — błędy 400 JSON wychodzą PRZED otwarciem SSE
  → SSE headers + flushHeaders()
  → Keepalive ": keepalive\n\n" co 5s — proxy i load balancery nie zrywają połączenia
  → analyzeCV()

Claude API
  → PDF jako base64 document lub tekst CV w content[]
  → Streaming przez client.messages.stream()
  → extractJSON() — usuwa markdown fences gdy Claude je doda
  → Zod waliduje strukturę odpowiedzi
  → Agregaty liczone w JS przez .reduce() i .filter()
    (model błędnie sumuje przy 10+ pozycjach wewnątrz długiego JSON-a)

SSE events → Przeglądarka
  → 'score'   — wynik + per-skill breakdown (pojawia się pierwszy)
  → 'gaps'    — lista braków
  → 'bullets' — przepisane bullet pointy
  → 'done'    — koniec strumienia
```

### Kluczowe decyzje techniczne

**Semantic reasoning, nie keyword matching** — prompt pyta "oceń czy kandydat posiada tę kompetencję", nie "sprawdź czy słowo jest w CV". Zmiana jednej linii wyeliminowała przypadki gdy "Claude API" lądowało w brakach mimo że CV zawierało "Anthropic API / Claude Haiku".

**Agregaty w JS, nie w modelu** — Claude zwraca tylko `requiredBreakdown[]` i `optionalBreakdown[]`; serwer liczy sumy przez `.reduce()` i `.filter()`. Model zwracał błędne agregaty (7.5 zamiast 16) przy 10+ pozycjach w środku długiego JSON-a.

**SSE zamiast pollingu** — Claude potrzebuje 15–25s na pełną analizę; Vercel Functions mają limit 10s na free planie. Osobny serwer Express na Render + SSE = jedno długożyjące połączenie bez timeoutów i zbędnych requestów.

**Walidacja wejścia przed SSE** — błędy HTTP 400 muszą wyjść przed `res.flushHeaders()`. Po otwarciu strumienia status HTTP jest już wysłany i nie można go zmienić — błąd walidacji po fakcie byłby niewidoczny dla klienta.

**localStorage zamiast bazy danych** — narzędzie dla jednego użytkownika; overhead własnej bazy (konto, schema, klucze, migracje) nieproporcjonalny do korzyści. Historia i profil działają offline, bez żadnego dodatkowego serwisu.

---

## Struktura projektu

```
cvmatch/
├── render.yaml                     ← konfiguracja deploy backendu na Render
├── .env.example                    ← wzorzec zmiennych środowiskowych
│
├── backend/
│   ├── src/
│   │   ├── app.js                  ← Express setup, CORS, routing — bez listen() (wymagane przez supertest)
│   │   ├── index.js                ← tylko app.listen(PORT)
│   │   ├── routes/
│   │   │   └── analyze.js          ← POST /analyze — walidacja, SSE, keepalive, analyzeCV()
│   │   └── lib/
│   │       ├── claude.js           ← SYSTEM_PROMPT, streaming, extractJSON(), agregaty w JS
│   │       └── schemas.js          ← Zod: requiredBreakdown[], optionalBreakdown[], gaps[], bullets[]
│   └── tests/
│       ├── unit/
│       │   ├── extractJSON.test.js ← 7 testów parsowania JSON z markdown fences
│       │   └── schemas.test.js     ← 14 testów Zod schema z fixtures
│       └── integration/
│           └── analyze.test.js     ← 10 testów SSE z mocked analyzeCV (supertest)
│
└── frontend/
    └── src/app/
        ├── page.jsx                ← 3 zakładki (Analiza/Profil/Historia), SSE fetch loop, zapis historii
        ├── layout.jsx              ← root layout, metadata
        └── components/
            ├── AnalyzeForm.jsx     ← toggle profil/PDF, buduje FormData, czyta localStorage przy submicie
            ├── MatchScore.jsx      ← combined score, pasek procentowy, per-skill breakdown chipy
            ├── GapAnalysis.jsx     ← lista braków z kolorowymi badge kategorii
            ├── BulletPoints.jsx    ← bullet pointy + przycisk Kopiuj z feedbackiem
            ├── ProfileTab.jsx      ← CV textarea + chip input na dodatkowe umiejętności → localStorage
            ├── HistoryTab.jsx      ← lista zapisanych analiz → localStorage
            └── StreamingStatus.jsx ← spinner podczas analizy
```

---

## Czego się nauczyłem

**Testowanie na prawdziwych danych jest niezastępowalne.**
Żadna analiza teoretyczna nie zastąpi uruchomienia narzędzia na prawdziwych CV z prawdziwych ogłoszeń. Dopiero wtedy widać że coś co działa na przykładowych danych — regularnie się myli na rzeczywistych. To zmieniło moje podejście do weryfikacji: najpierw prawdziwy przypadek, potem testy jednostkowe — nie odwrotnie.

**Decyzja "nie budujemy tego" jest równie ważna jak "budujemy".**
Learning roadmap, integracja z Supabase, rozszerzenie Chrome — każda z tych rzeczy była zaplanowana i każda została odrzucona. Najtrudniejsza część nie była techniczna — było nią przyznanie że coś co wydaje się wartościowe na papierze, nie dodaje wartości w praktyce. Wycięcie feature'u po jego zbudowaniu też jest postępem.

**Praca z AI API to bardziej eksperymentowanie niż inżynieria.**
Klasyczne API: daj input X, dostaniesz output Y. Model AI: output zależy od sformułowania, kolejności zdań, języka promptu. Przy każdej zmianie nie wiesz czy poprawa na jednym przypadku nie pogorszy wyników na innym. To zupełnie inna dyscyplina — wymaga iteracji na danych, nie tylko na kodzie.

**Działające end-to-end od pierwszego dnia przyspiesza wszystko.**
Surowy JSON w konsoli w Tygodniu 1 był lepszym punktem startowym niż dopracowana architektura bez weryfikacji. Każdy kolejny tydzień to ulepszanie czegoś co już działa — a nie kończenie czegoś co istnieje tylko w planach.

---

## Autor

**Konrad Pochwała**

[wizytowka-ivory.vercel.app](https://wizytowka-ivory.vercel.app)
