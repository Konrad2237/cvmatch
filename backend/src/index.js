const express = require('express');
const cors = require('cors');
require('dotenv').config();

const analyzeRouter = require('./routes/analyze');

const app = express();
const PORT = process.env.PORT || 3001;

// TODO: restrict origin to Vercel URL in production
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
}));

app.use(express.json());

app.use('/analyze', analyzeRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`CVMatch backend running on port ${PORT}`);
});
