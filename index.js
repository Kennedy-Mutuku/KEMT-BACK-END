const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const mongoose = require('mongoose');
const path = require('path');

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/kingdom_enlightenment')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

// Routes
const eventsRouter = require('./routes/events');
const profileRouter = require('./routes/profile');
app.use('/api/events', eventsRouter);
app.use('/api/profile', profileRouter);

app.get('/', (req, res) => {
  res.send('Kingdom Enlightenment Missions Team Backend is running!');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
