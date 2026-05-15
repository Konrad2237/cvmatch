// Testy dla modułu extractJSON
// Uruchom: npx jest tests/unit/extractJSON.test.js
const { extractJSON } = require('../../src/lib/claude');

describe('extractJSON', () => {
  it('returns bare JSON string unchanged', () => {
    const input = '{"a":1,"b":"x"}';
    expect(extractJSON(input)).toBe(input);
  });

  it('strips ```json code fence', () => {
    const input = '```json\n{"a":1}\n```';
    expect(extractJSON(input)).toBe('{"a":1}');
  });

  it('strips ``` code fence without language label', () => {
    const input = '```\n{"a":1}\n```';
    expect(extractJSON(input)).toBe('{"a":1}');
  });

  it('extracts JSON object from surrounding text', () => {
    const input = 'Oto wynik:\n{"a":1}\nKoniec.';
    expect(extractJSON(input)).toBe('{"a":1}');
  });

  it('handles nested objects', () => {
    const input = '{"outer":{"inner":1}}';
    expect(extractJSON(input)).toBe(input);
  });

  it('returns trimmed text when no JSON object found', () => {
    expect(extractJSON('  plain text  ')).toBe('plain text');
  });

  it('returns empty string for empty input', () => {
    expect(extractJSON('')).toBe('');
  });
});
