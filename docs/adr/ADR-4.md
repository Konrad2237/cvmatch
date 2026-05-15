# ADR-4: Per-skill Breakdown, Profil Użytkownika, Historia Analiz — Tydzień 4

**Data:** 2026-05-15  
**Status:** Accepted  
**Dotyczy:** `backend/src/lib/claude.js`, `backend/src/lib/schemas.js`, `frontend/src/app/page.jsx`, `frontend/src/app/components/MatchScore.jsx`, `frontend/src/app/components/AnalyzeForm.jsx`, `frontend/src/app/components/ProfileTab.jsx`, `frontend/src/app/components/HistoryTab.jsx`

---

## 🤖 Kontekst dla Claude (przyszłe sesje)

### Nowe pliki względem ADR-3

```
cvmatch/
├── backend/
│   └── src/lib/
│       ├── schemas.js   ← matchScore zmieniony — tylko breakdown arrays, bez agregat
│       └── claude.js    ← aggregates obliczane w JS po parsowaniu, nowe zasady zliczania
├── frontend/src/app/
│   ├── page.jsx         ← 3 zakładki (analiza/profil/historia), przycisk "Zapisz analizę"
│   └── components/
│       ├── MatchScore.jsx   ← per-skill breakdown chips, combined score (req+opt)
│       ├── AnalyzeForm.jsx  ← uproszczony — tylko ogłoszenie + tryb PDF, CV z profilu
│       ├── ProfileTab.jsx   ← CV textarea + chip input na dodatkowe umiejętności + Zapisz
│       └── HistoryTab.jsx   ← lista zapisanych analiz z localStorage, Wczytaj/Usuń
```

Usunięte: `backend/tests/claude.test.js` (zombie test — wywoływał real API bez asercji)

### Schemat matchScore — kluczowa zmiana

**Poprzedni (ADR-3):**
```js
matchScore: { requiredScore, requiredTotal, optionalMatched, optionalTotal }  // 4 liczby z modelu
```

**Obecny:**
```js
// Claude zwraca TYLKO:
matchScore: {
  requiredBreakdown: [{ skill: string, score: 0|0.5|1|1.5|2 }],
  optionalBreakdown: [{ skill: string, score: 0|1 }],
}

// JS oblicza po parsowaniu w analyzeCV():
requiredScore   = requiredBreakdown.reduce((s,i) => s+i.score, 0).toFixed(1)
requiredTotal   = requiredBreakdown.length
optionalMatched = optionalBreakdown.filter(i => i.score > 0).length
optionalTotal   = optionalBreakdown.length
```

**Dlaczego:** Model błędnie sumował (zwrócił 7.5 zamiast 16 przy poprawnym breakdown). Skoro mamy dane per-skill, sumowanie w JS jest deterministyczne i zawsze poprawne.

### SSE event flow (zaktualizowany)

```
onEvent('score', {
  requiredScore,    // obliczone w JS
  requiredTotal,    // obliczone w JS
  optionalMatched,  // obliczone w JS
  optionalTotal,    // obliczone w JS
  requiredBreakdown: [{ skill, score }],
  optionalBreakdown: [{ skill, score }],
})
onEvent('gaps',    [...])
onEvent('bullets', [...])
onEvent('done',    null)
```

### localStorage — klucze

```js
LS_CV    = 'cvmatch_cv_text'        // string — bazowe CV
LS_EXTRA = 'cvmatch_extra_skills'   // JSON array of strings — chipy umiejętności
LS_HISTORY = 'cvmatch_history'      // JSON array — max 20 wpisów, newest first
```

Struktura wpisu historii:
```js
{
  id: Date.now(),
  savedAt: ISO string,
  jobSnippet: string,  // pierwsza linia ogłoszenia, max 100 znaków
  results: { matchScore, gaps, bullets }
}
```

### Przepływ profilu przy analizie

```
ProfileTab zapisuje → LS_CV + LS_EXTRA
AnalyzeForm.handleSubmit() → czyta LS_CV + LS_EXTRA z localStorage
  → jeśli skills.length > 0: fullCv = cvText + "\n\n---\nDodatkowe umiejętności:\n- skill1\n- skill2"
  → formData.append('cvText', fullCv)
```

Tryb PDF nie obsługuje profilu (plik binarny nie pasuje do localStorage).

### Zasady zliczania umiejętności w prompcie (nowe w Week 4)

Stara reguła `"React i Redux = 2"` powodowała że model rozbijał opisowe wymagania na wiele pozycji niespójnie. Nowa zasada:
- Jeden bullet point w ogłoszeniu = jedna pozycja w breakdownie
- Wyjątek: bullet wymienia kilka niezależnych NARZĘDZI → rozdziel ("Python oraz Docker" = 2)
- NIE rozbijaj opisowych kompetencji ("praca z agentami AI, code assistantami" = 1)

### Combined score w MatchScore.jsx

```js
totalScore = requiredScore + optionalMatched
totalMax   = requiredTotal * 2 + optionalTotal
pct        = Math.round(totalScore / totalMax * 100)
// Wyświetlane: "16 z 28 pkt łącznie • 57% dopasowania"
```

Poprzednio pasek i procent liczyły tylko z wymaganych.

### Co próbowaliśmy i nie zadziałało

**1. Learning roadmap jako ZADANIE 4 w prompcie**
Dodane, przetestowane, usunięte. Roadmap był ogólnikowy (TypeScript jako #1 priorytet — oczywiste), wydłużał czas analizy i output tokenów. Wycięty z promptu, schematu i frontendu. Jeśli wróci — osobne wywołanie API, nie część głównej analizy.

**2. max_tokens: 4096 przy roadmap**
Roadmap + cały poprzedni output = ~11602 znaki = przekroczenie limitu. JSON obcinał się w połowie. Zwiększone do 6000. Po usunięciu roadmap 6000 zostawione jako bezpieczny bufor (rzeczywisty output ~3000-3500 tokenów).

**3. `requiredScore` zwracany przez model**
Model zwrócił 7.5 zamiast 16 przy poprawnym breakdown. Agregaty przeniesione do JS — problem wyeliminowany strukturalnie, nie przez prompt engineering.

**4. Auto-save zamiast przycisku**
Pierwotna wersja CV profilu miała auto-save przy każdej zmianie. Zmienione na explicit "Zapisz profil" na życzenie użytkownika.

**5. Supabase dla historii analiz**
Odrzucone na rzecz localStorage — za duży overhead (konto, schema, klucze, deployment config) dla narzędzia osobistego.

---

## 👤 Dla mnie (ludzki język)

### Kontekst

Tydzień 4 miał jeden główny temat: zrobić narzędzie wygodniejszym w codziennym użyciu. Trzy rzeczy które bolały przed tygodniem 4: musisz wklejać CV przy każdej analizie, nie wiesz konkretnie za co dostałeś punkty (tylko suma), i nie możesz wrócić do poprzednich wyników. Plus jeden discovery w trakcie: model błędnie sumował requiredScore.

### Decyzje

**1. Per-skill breakdown jako osobna lista, nie rozszerzenie gaps**

Breakdown mógłby być wbudowany w gaps (dodać `score` do każdego gap-u). Odrzucone bo gaps zawierają tylko BRAKUJĄCE umiejętności — breakdown ma WSZYSTKIE, łącznie z tymi które masz (2/2). To różne listy z różnymi celami. Breakdown pokazuje "za co dostałem punkty", gaps pokazuje "czego brakuje i dlaczego".

**2. Agregaty w JS, nie w modelu**

To była oczywista decyzja po tym jak model zwrócił 7.5 zamiast 16. Skoro mamy listę per-skill z indywidualnymi scorami, sumowanie to trzy linijki JS. Model jest dobry w ocenie semantycznej ("czy ten kandydat posiada tę umiejętność?"), fatalny w arytmetyce gdy ma dużo pozycji. Zawsze przenoś obliczenia do kodu gdy tylko masz dane.

**3. Profil w localStorage, nie w stanie Reacta**

CV zmienia się rzadko — bezsensowne wklejanie za każdym razem. localStorage to najprostsza persystencja bez backendu. Dodatkowe umiejętności jako chipy zamiast wolnego tekstu — łatwiejsze zarządzanie: dodajesz jedno narzędzie, nie edytujesz bloku tekstu.

**4. Historia ręczna (przycisk), nie automatyczna**

Auto-save każdej analizy szybko zaśmieciłby historię testami. Explicit "Zapisz analizę" daje kontrolę. Max 20 wpisów żeby localStorage się nie rozpuchł.

**5. Roadmap wycięty**

Zbudowany, przetestowany, wyrzucony. Roadmap był technicznie poprawny (TypeScript → Angular → NestJS dla oferty z TypeScript/Angular) ale oczywisty — nie dawał nowej wiedzy. Prawdziwa wartość CVMatch jest w breakdown (za co konkretnie punkty) i gaps (dlaczego brakuje). Roadmap to było "OK a teraz się naucz" — co każdy już wie.

### Alternatywy które odrzucono

| Decyzja | Odrzucona alternatywa | Powód |
|---|---|---|
| Agregaty w JS | Lepszy prompt żeby model liczył poprawnie | Prompt engineering nie gwarantuje arytmetyki |
| localStorage dla historii | Supabase | Overhead nieproporcjonalny do korzyści dla narzędzia osobistego |
| Chip input na dodatkowe umiejętności | Wolny textarea | Łatwiejsze zarządzanie pojedynczymi wpisami |
| Jeden bullet = jedna pozycja | "React i Redux = 2" wszędzie | Stara reguła powodowała rozbijanie opisowych kompetencji, wariancję requiredTotal |
| Combined score (req+opt) | Tylko required w pasku | Optional też są częścią oceny — combined daje pełniejszy obraz |

### Konsekwencje dla projektu

**Dobre:**
- Score jest zawsze arytmetycznie poprawny — eliminacja klasy błędów
- Użytkownik widzi konkretnie co ma (2/2) i co ma częściowo (1.5/2) — breakdown jest główną wartością
- Nie trzeba wklejać CV przy każdej analizie — profil pamięta
- Historia analiz pozwala porównać wyniki dla różnych ofert bez re-analizy
- Prompt jest krótszy (usunięty roadmap, usunięte 4 pola aggregat z formatu JSON)

**Do uwagi:**
- Combined score (req+opt) to inna metryka niż poprzedni procent z samych wymaganych — wyniki % nie są porównywalne z analizami sprzed tygodn 4
- max_tokens: 6000 — rzeczywisty output to ~3000-3500 tokenów; 6000 to bezpieczny bufor, można by zbić do 4500 jeśli koszty będą problemem
- Profil działa tylko w trybie tekstowym — tryb PDF nie korzysta z profilu (plik binarny nie pasuje do localStorage)
- requiredTotal wciąż może się różnić między wywołaniami o ±1-2 pozycje — zasada "jeden bullet = jedna pozycja" zmniejsza wariancję ale jej nie eliminuje

### Czego się nauczyłem

Przenoś obliczenia do kodu zawsze gdy to możliwe. Model jest dobry w reasoning, fatalny w liczeniu — szczególnie gdy ma 10+ pozycji do zsumowania i robi to w środku długiego JSON-a. Mamy breakdowny, mamy JS, nie potrzebujemy modelu do `array.reduce()`.

Roadmap to dobry przykład feature który wygląda wartościowo na papierze ale po przetestowaniu na realnych danych okazuje się oczywisty. Zamiast budować "co się uczyć" — buduj "dlaczego brakuje i jak bardzo" (transferowalność w gaps). To jest nieoczywiste, to jest wartość.
