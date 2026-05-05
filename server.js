const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json()); 

// Auth Route
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

// Data Baru Sesuai Kamus Data (Terproteksi)
const classRoutes = require('./routes/classRoutes');
app.use('/api/classes', classRoutes);

const studentRoutes = require('./routes/studentRoutes');
app.use('/api/students', studentRoutes);

const scheduleRoutes = require('./routes/scheduleRoutes');
app.use('/api/schedules', scheduleRoutes);

const attendanceRoutes = require('./routes/attendanceRoutes');
app.use('/api/attendances', attendanceRoutes);

const violationRuleRoutes = require('./routes/violationRuleRoutes');
app.use('/api/violation-rules', violationRuleRoutes);

const violationRoutes = require('./routes/violationRoutes');
app.use('/api/violations', violationRoutes);

const mongoURI = process.env.MONGODB_URI;

mongoose.connect(mongoURI)
  .then(() => {
    console.log('Koneksi ke MongoDB Atlas berhasil!');
    
    app.listen(PORT, () => {
      console.log(`Server berjalan di http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Koneksi ke MongoDB gagal:', err);
  });

app.get('/', (req, res) => {
  res.json({ message: 'API Sistem Poin Pelanggaran Siswa berjalan' });
});