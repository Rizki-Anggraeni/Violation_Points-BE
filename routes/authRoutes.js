const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// POST: Register User Baru
router.post('/register', async (req, res) => {
    try {
        const { username, password, role, student_id, class_id } = req.body;

        // Cek apakah username sudah ada di database
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Username sudah digunakan' });
        }

        // Format data yang akan disimpan
        const userData = { username, password, role };
        if (class_id) userData.class_id = class_id;
        if (student_id) {
            // Jadikan array apabila input yang masuk berupa string tunggal
            userData.student_id = Array.isArray(student_id) ? student_id : [student_id];
        }

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