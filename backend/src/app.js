const express = require('express');
const cors = require('cors');
require('dotenv').config();

const analyzeRouter = require('./routes/analyze');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
}));

app.use(express.json());
app.use('/analyze', analyzeRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = app;
