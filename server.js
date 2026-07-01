// 1. IMPORT FIREBASE (Gaya Modern Modular)
const { initializeApp } = require('firebase-admin/app');
const { cert } = require('firebase-admin/app'); 
const { getMessaging } = require('firebase-admin/messaging'); // <-- Pakai ini buat gantiin admin.messaging
const serviceAccount = require('./firebase-config.json');

// 2. INITIALIZE FIREBASE (Wajib di awal sebelum dipanggil)
initializeApp({
  credential: cert(serviceAccount)
});

// 3. IMPORT CORE LIBRARY & CONFIG
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 4. MIDDLEWARE
app.use(cors());
app.use(express.json()); 

// 5. ROUTES
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

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

// Base Route
app.get('/', (req, res) => {
  res.json({ message: 'API Sistem Poin Pelanggaran Siswa berjalan' });
});

// 6. KONEKSI DATABASE & JALANKAN SERVER
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