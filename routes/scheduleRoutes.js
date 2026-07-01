const express = require('express');
const router = express.Router();
const Schedule = require('../models/Schedule');
const User = require('../models/User');
const Student = require('../models/Student');
const authMiddleware = require('../models/authMiddleware');

router.use(authMiddleware);

// GET: Ambil semua jadwal
router.get('/', async (req, res) => {
    try {
        let query = {};
        const dbUser = await User.findById(req.user.id || req.user._id);
        const userRole = dbUser ? dbUser.role : req.user.role;
        const classId = dbUser ? dbUser.class_id : req.user.class_id;

        // Filter agar sekretaris dan wali kelas hanya mendapat jadwal kelasnya
        if (userRole === 'sekretaris' || userRole === 'wali_kelas') {
            if (!classId) {
                return res.status(200).json([]); // Jika belum di-assign kelas, kembalikan kosong
            }
            query.class_id = classId;
        } else if (userRole === 'orang_tua') {
            // Jika orang tua, cari kelas dari siswa pertama yang terhubung
            const studentId = dbUser.student_id && dbUser.student_id.length > 0 ? dbUser.student_id[0] : null;
            if (!studentId) {
                return res.status(200).json([]);
            }
            const student = await Student.findById(studentId).select('class_id');
            if (!student || !student.class_id) {
                return res.status(200).json([]);
            }
            query.class_id = student.class_id;
        }
        const schedules = await Schedule.find(query).populate('class_id');
        res.status(200).json(schedules);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET: Ambil satu jadwal berdasarkan ID
router.get('/:id', async (req, res) => {
    try {
        const schedule = await Schedule.findById(req.params.id).populate('class_id');
        if (!schedule) return res.status(404).json({ message: 'Jadwal tidak ditemukan' });
        res.status(200).json(schedule);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST: Tambah jadwal baru
router.post('/', async (req, res) => {
    try {
        const schedule = new Schedule(req.body);
        const savedSchedule = await schedule.save();
        res.status(201).json(savedSchedule);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// PUT: Update jadwal
router.put('/:id', async (req, res) => {
    try {
        const updatedSchedule = await Schedule.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!updatedSchedule) return res.status(404).json({ message: 'Jadwal tidak ditemukan' });
        res.status(200).json(updatedSchedule);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// DELETE: Hapus jadwal
router.delete('/:id', async (req, res) => {
    try {
        const deletedSchedule = await Schedule.findByIdAndDelete(req.params.id);
        if (!deletedSchedule) return res.status(404).json({ message: 'Jadwal tidak ditemukan' });
        res.status(200).json({ message: 'Jadwal berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;