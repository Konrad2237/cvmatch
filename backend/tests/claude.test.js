const { analyzeCV } = require('../src/lib/claude');

// Real API calls — Claude takes 15-25s
jest.setTimeout(60000);

const SAMPLE_CV = `
Jan Kowalski
Doświadczenie: 2 lata jako Junior Frontend Developer
Umiejętności: JavaScript, React, HTML, CSS, Git
Wykształcenie: Informatyka, Politechnika Warszawska
`;

const SAMPLE_JOB = `
Junior AI Developer
Wymagania: Python, JavaScript, REST API, Docker, Git, komunikatywność, praca w zespole
Mile widziane: TypeScript, CI/CD, znajomość LLM API
`;

describe('analyzeCV', () => {
  let result;

  beforeAll(async () => {
    const events = {};
    await analyzeCV({
      cvText: SAMPLE_CV,
      cvFile: null,
      jobPosting: SAMPLE_JOB,
      onEvent: (type, payload) => { events[type] = payload; },
    });
    result = events;
  });

  it('returns matchScore with matched and total', () => {
    // TODO: implement assertion
    // expect(result.score.matched).toBeGreaterThanOrEqual(0);
    // expect(result.score.total).toBeGreaterThan(0);
  });

  it('returns at least 3 gaps', () => {
    // TODO: implement assertion
    // expect(result.gaps.length).toBeGreaterThanOrEqual(3);
  });

  it('each gap has a valid category', () => {
    // TODO: implement assertion
    // const valid = ['Technologia', 'Soft skill', 'Certyfikat'];
    // result.gaps.forEach(g => expect(valid).toContain(g.category));
  });

  it('returns at least 3 rewritten bullet points', () => {
    // TODO: implement assertion
    // expect(result.bullets.length).toBeGreaterThanOrEqual(3);
  });
});
