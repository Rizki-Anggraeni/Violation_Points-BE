const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../models/authMiddleware');

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

module.exports = router;