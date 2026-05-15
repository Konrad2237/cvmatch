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

const skillScoreSchema = z.object({
  skill: z.string(),
  score: z.number().min(0).max(2),
});

// requiredScore, requiredTotal, optionalMatched, optionalTotal are computed
// from breakdown in JS after parsing — not trusted from model output
const analysisSchema = z.object({
  matchScore: z.object({
    requiredBreakdown: z.array(skillScoreSchema),
    optionalBreakdown: z.array(skillScoreSchema),
  }),
  gaps:    z.array(gapSchema).min(5),
  bullets: z.array(bulletSchema).min(3).max(5),
});

module.exports = { analysisSchema, gapSchema, bulletSchema };
