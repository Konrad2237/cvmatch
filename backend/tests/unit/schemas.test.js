// Testy dla modułu schemas
// Uruchom: npx jest tests/unit/schemas.test.js
const { analysisSchema, gapSchema, bulletSchema } = require('../../src/lib/schemas');

const VALID_GAP = {
  skill: 'Docker',
  category: 'Technologia',
  detail: 'Ogłoszenie wymaga Docker (sekcja Wymagania) — brak w CV',
};

const VALID_BULLET = {
  original: 'Pracowałem z React',
  rewritten: 'Budowałem interfejsy w React 18 — odpowiada wymaganiu z ogłoszenia',
};

function validAnalysis(overrides = {}) {
  return {
    matchScore: { matched: 8, total: 12 },
    gaps: Array(5).fill(VALID_GAP),
    bullets: Array(3).fill(VALID_BULLET),
    ...overrides,
  };
}

describe('gapSchema', () => {
  it('accepts valid gap', () => {
    expect(() => gapSchema.parse(VALID_GAP)).not.toThrow();
  });

  it('accepts all three valid categories', () => {
    ['Technologia', 'Soft skill', 'Certyfikat'].forEach(category => {
      expect(() => gapSchema.parse({ ...VALID_GAP, category })).not.toThrow();
    });
  });

  it('rejects unknown category', () => {
    expect(() => gapSchema.parse({ ...VALID_GAP, category: 'Inne' })).toThrow();
  });

  it('rejects missing skill', () => {
    const { skill, ...rest } = VALID_GAP;
    expect(() => gapSchema.parse(rest)).toThrow();
  });

  it('rejects missing detail', () => {
    const { detail, ...rest } = VALID_GAP;
    expect(() => gapSchema.parse(rest)).toThrow();
  });
});

describe('bulletSchema', () => {
  it('accepts bullet with original', () => {
    expect(() => bulletSchema.parse(VALID_BULLET)).not.toThrow();
  });

  it('accepts bullet without original (field is optional)', () => {
    const { original, ...rest } = VALID_BULLET;
    expect(() => bulletSchema.parse(rest)).not.toThrow();
  });

  it('rejects missing rewritten', () => {
    const { rewritten, ...rest } = VALID_BULLET;
    expect(() => bulletSchema.parse(rest)).toThrow();
  });
});

describe('analysisSchema', () => {
  it('accepts valid full analysis', () => {
    expect(() => analysisSchema.parse(validAnalysis())).not.toThrow();
  });

  it('rejects fewer than 5 gaps', () => {
    expect(() => analysisSchema.parse(validAnalysis({ gaps: Array(4).fill(VALID_GAP) }))).toThrow();
  });

  it('rejects fewer than 3 bullets', () => {
    expect(() => analysisSchema.parse(validAnalysis({ bullets: Array(2).fill(VALID_BULLET) }))).toThrow();
  });

  it('rejects more than 5 bullets', () => {
    expect(() => analysisSchema.parse(validAnalysis({ bullets: Array(6).fill(VALID_BULLET) }))).toThrow();
  });

  it('rejects negative matched', () => {
    expect(() => analysisSchema.parse(validAnalysis({ matchScore: { matched: -1, total: 10 } }))).toThrow();
  });

  it('passes when matched > total — known gap, schema has no .refine() guard', () => {
    expect(() => analysisSchema.parse(validAnalysis({ matchScore: { matched: 15, total: 10 } }))).not.toThrow();
  });
});
