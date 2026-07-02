const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Student = require('../models/Student'); // Impor model Student

// POST: Register User Baru
router.post('/register', async (req, res) => {
    try {
        const { username, password, role, student_nis, class_id } = req.body;

        // Cek apakah username sudah ada di database
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Username sudah digunakan' });
        }

        const userData = { username, password, role };

        // --- ALUR VALIDASI NIS KHUSUS UNTUK ORANG TUA ---
        if (role === 'orang_tua') {
            // 1. Validasi input awal
            if (!student_nis || !Array.isArray(student_nis) || student_nis.length === 0) {
                return res.status(400).json({ message: 'Data NIS anak wajib diisi.' });
            }

            // Bersihkan dan filter NIS yang kosong
            const validNisList = student_nis.map(n => n.trim()).filter(n => n !== '');
            if (validNisList.length === 0) {
                return res.status(400).json({ message: 'Data NIS anak wajib diisi.' });
            }

            // 2. Cari semua siswa berdasarkan array NIS menggunakan $in
            const students = await Student.find({ nis: { $in: validNisList } });

            // 3. Validasi Kuantitas: Pastikan semua NIS yang diinput ditemukan
            if (students.length !== validNisList.length) {
                const foundNis = students.map(s => s.nis);
                const notFoundNis = validNisList.filter(nis => !foundNis.includes(nis));
                return res.status(400).json({ message: `NIS berikut tidak terdaftar di sistem: ${notFoundNis.join(', ')}!` });
            }

            // 4. Validasi Duplikasi: Cek apakah ada siswa yang sudah terhubung dengan akun ortu lain
            const studentIds = students.map(s => s._id);
            const existingParent = await User.findOne({ role: 'orang_tua', student_id: { $in: studentIds } });
            if (existingParent) {
                return res.status(400).json({ message: 'Salah satu NIS sudah terdaftar di akun orang tua lain!' });
            }

            // 5. Jika lolos semua validasi, masukkan array ObjectId ke dalam userData
            userData.student_id = studentIds;
        }

        if (class_id) userData.class_id = class_id;

        const newUser = new User(userData);
        const savedUser = await newUser.save(); // Password otomatis dienkripsi oleh model User

        res.status(201).json({
            message: 'User berhasil didaftarkan',
            user: { id: savedUser._id, username: savedUser.username, role: savedUser.role, student_id: savedUser.student_id, class_id: savedUser.class_id }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST: Login User
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Cari user berdasarkan username
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ message: 'Username atau password salah' });
        }

        // Cek kecocokan password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Username atau password salah' });
        }

        // Buat JWT Token
        const token = jwt.sign(
            { id: user._id, role: user.role, class_id: user.class_id, student_id: user.student_id },
            process.env.JWT_SECRET,
            { expiresIn: '1d' } // Token berlaku selama 1 hari
        );

        res.status(200).json({ message: 'Login berhasil', token });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;