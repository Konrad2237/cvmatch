const express = require('express');
const multer = require('multer');
const { analyzeCV } = require('../lib/claude');

const router = express.Router();

// PDF stays in memory — buffer passed directly to Claude API
const upload = multer({ storage: multer.memoryStorage() });

// POST /analyze
// Accepts: multipart/form-data
//   cvText     — plain text CV     (required if no cvFile)
//   cvFile     — PDF upload        (required if no cvText)
//   jobPosting — job posting text  (always required)
// Returns: text/event-stream (SSE)
//   data: {"type":"score",  "payload":{"requiredScore":8,"requiredTotal":6,"optionalMatched":2,"optionalTotal":4}}
//   data: {"type":"gaps",   "payload":[...]}
//   data: {"type":"bullets","payload":[...]}
//   data: {"type":"done"}
//   data: {"type":"error",  "message":"..."}
router.post('/', upload.single('cvFile'), async (req, res) => {
  const { cvText, jobPosting } = req.body;
  const cvFile = req.file; // { buffer, mimetype, originalname } | undefined

  // Validate inputs before opening SSE — errors here return normal JSON 400
  if (!cvText?.trim() && !cvFile) {
    return res.status(400).json({ error: 'Wymagane CV — wklej tekst lub wgraj PDF.' });
  }
  if (!jobPosting?.trim()) {
    return res.status(400).json({ error: 'Wymagane ogłoszenie o pracę.' });
  }

  // Open SSE connection
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send ": keepalive" every 5s so Railway/Vercel/browsers don't close the connection
  const keepalive = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 5000);

  function send(type, payload) {
    const data = payload !== null && payload !== undefined
      ? { type, payload }
      : { type };
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  function finish() {
    clearInterval(keepalive);
    res.end();
  }

  try {
    await analyzeCV({
      cvText: cvText?.trim() || null,
      cvFile: cvFile?.buffer || null,
      mimetype: cvFile?.mimetype || null,
      jobPosting: jobPosting.trim(),
      onEvent: (type, payload) => send(type, payload),
    });
  } catch (err) {
    // analyzeCV already emitted 'error' event via onEvent — just log server-side
    console.error('[analyze] Claude error:', err.message);
  } finally {
    finish();
  }
});

module.exports = router;
