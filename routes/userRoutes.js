const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Student = require('../models/Student');
const authMiddleware = require('../models/authMiddleware');
const bcrypt = require('bcryptjs');

router.use(authMiddleware);

// Middleware untuk membatasi akses hanya untuk admin dan guru_bk
const assignGuard = (req, res, next) => {
    if (!['admin', 'guru_bk'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Akses ditolak. Anda tidak memiliki izin untuk aksi ini.' });
    }
    next();
};

// GET: Ambil daftar user dengan role wali_kelas dan sekretaris
router.get('/staff', assignGuard, async (req, res) => {
    try {
        const users = await User.find({ role: { $in: ['wali_kelas', 'sekretaris'] } })
            .populate('class_id', 'name')
            .select('-password');
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PUT: Assign kelas ke user (One to One)
router.put('/:id/assign-class', assignGuard, async (req, res) => {
    try {
        const { class_id } = req.body;
        const user = await User.findById(req.params.id);
        
        if (!user) return res.status(404).json({ message: 'User tidak ditemukan' });
        
        if (!['wali_kelas', 'sekretaris'].includes(user.role)) {
             return res.status(400).json({ message: 'Hanya bisa mengatur kelas untuk akun wali kelas dan sekretaris' });
        }

        // Cek aturan One-to-One: Pastikan tidak ada akun dengan role yang sama yang sudah memegang kelas ini
        if (class_id) {
            const existingUser = await User.findOne({ role: user.role, class_id: class_id, _id: { $ne: user._id } });
            if (existingUser) {
                return res.status(400).json({ message: `Kelas ini sudah memiliki ${user.role.replace('_', ' ')} yang bertugas.` });
            }
        }

        user.class_id = class_id || null;
        await user.save();

        res.status(200).json({ message: 'Kelas berhasil di-assign', user: { id: user._id, username: user.username, role: user.role, class_id: user.class_id } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PUT: Assign siswa ke akun orang_tua (Disempurnakan)
router.put('/:id/assign-student', assignGuard, async (req, res) => {
    try {
        let { student_id } = req.body;
        const user = await User.findById(req.params.id);
        
        if (!user) return res.status(404).json({ message: 'User tidak ditemukan' });
        if (user.role !== 'orang_tua') return res.status(400).json({ message: 'Hanya bisa mengatur data siswa untuk akun dengan role orang_tua' });

        if (student_id) {
            const isArray = Array.isArray(student_id);
            const firstVal = isArray ? student_id[0] : student_id;
            
            // Jika yang diinputkan adalah NIS (bukan ObjectId 24 karakter)
            if (firstVal && !firstVal.match(/^[0-9a-fA-F]{24}$/)) {
                const targetNis = isArray ? student_id : [student_id];
                const students = await Student.find({ nis: { $in: targetNis } }).select('_id');
                
                if (students.length === 0) return res.status(404).json({ message: 'Siswa dengan NIS tersebut tidak ditemukan di database' });
                student_id = students.map(s => s._id);
            } else if (!isArray && student_id) {
                student_id = [student_id];
            }
        }

        user.student_id = student_id || [];
        await user.save();

        res.status(200).json({ message: 'Siswa berhasil dihubungkan', user: { id: user._id, username: user.username, student_id: user.student_id } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PUT: Mengubah password pengguna yang sedang login
router.put('/change-password', async (req, res) => {
    try {
        const { old_password, new_password } = req.body;
        const userId = req.user.id || req.user._id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User tidak ditemukan' });
        }

        // Cek kecocokan password lama
        const isMatch = await bcrypt.compare(old_password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Password lama salah' });
        }

        // Ubah dengan password baru (otomatis terenkripsi lewat middleware User.js)
        user.password = new_password;
        await user.save();

        res.status(200).json({ message: 'Password berhasil diubah' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;