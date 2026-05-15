const { z } = require('zod');

const gapSchema = z.object({
  skill: z.string(),
  // Exactly three allowed categories — matches badge colors in frontend
  category: z.enum(['Technologia', 'Soft skill', 'Certyfikat']),
  detail: z.string(), // e.g. "Docker — wymagany w pkt 2 ogłoszenia, brak w sekcji Umiejętności"
});

const bulletSchema = z.object({
  original: z.string().optional(), // matching line from CV, if any
  rewritten: z.string(),           // Claude's rewritten version
});

const analysisSchema = z.object({
  matchScore: z.object({
    matched: z.number().int().min(0), // e.g. 9
    total: z.number().int().min(0),   // e.g. 14
  }),
  gaps: z.array(gapSchema).min(3),
  bullets: z.array(bulletSchema).min(3).max(5),
  // TODO (Week 4): sectionScores, learningRoadmap
});

module.exports = { analysisSchema, gapSchema, bulletSchema };
