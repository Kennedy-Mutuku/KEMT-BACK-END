const express  = require('express');
const cors     = require('cors');
const dotenv   = require('dotenv');
const mongoose = require('mongoose');
const path     = require('path');

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Database ─────────────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/kingdom_enlightenment')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB connection error:', err.message));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/admin',       require('./routes/admin'));
app.use('/api/contact',     require('./routes/contact'));
app.use('/api/events',      require('./routes/events'));
app.use('/api/messages',    require('./routes/messages'));
app.use('/api/bible-groups',require('./routes/bibleGroups'));
app.use('/api/teams',       require('./routes/teams'));
app.use('/api/gallery',     require('./routes/gallery'));
app.use('/api/donate',      require('./routes/donate'));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send('Kingdom Enlightenment Missions Team — Backend API is running.');
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\nServer running on port ${PORT}`);
  console.log(`M-Pesa environment: ${process.env.MPESA_ENV || 'sandbox'}\n`);
});
