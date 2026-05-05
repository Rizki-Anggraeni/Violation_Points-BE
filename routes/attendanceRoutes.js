const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const authMiddleware = require('../models/authMiddleware');

router.use(authMiddleware);

// GET: Ambil semua presensi
router.get('/', async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'ortu') {
            query.student_id = req.user.student_id;
        }
        const attendances = await Attendance.find(query)
            .populate('student_id', 'name nis')
            .populate('schedule_id', 'subject day')
            .populate('submitted_by', 'username role');
        res.status(200).json(attendances);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET: Ambil satu presensi berdasarkan ID
router.get('/:id', async (req, res) => {
    try {
        if (req.user.role === 'ortu') {
            const attendance = await Attendance.findOne({ _id: req.params.id, student_id: req.user.student_id });
            if (!attendance) return res.status(404).json({ message: 'Presensi tidak ditemukan atau bukan milik anak Anda' });
            return res.status(200).json(attendance);
        }
        const attendance = await Attendance.findById(req.params.id);
        if (!attendance) return res.status(404).json({ message: 'Presensi tidak ditemukan' });
        res.status(200).json(attendance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST: Tambah presensi baru
router.post('/', async (req, res) => {
    try {
        const { student_id, schedule_id, date, status } = req.body;
        // Ambil submitted_by dari token JWT (req.user.id)
        const attendance = new Attendance({ student_id, schedule_id, date, status, submitted_by: req.user.id });
        const savedAttendance = await attendance.save();
        res.status(201).json(savedAttendance);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// PUT: Update presensi
router.put('/:id', async (req, res) => {
    try {
        // Ambil data presensi yang ada untuk divalidasi terlebih dahulu
        const attendance = await Attendance.findById(req.params.id).populate({
            path: 'schedule_id',
            select: 'class_id' // Ambil class_id dari jadwal terkait
        });

        if (!attendance) {
            return res.status(404).json({ message: 'Data presensi tidak ditemukan' });
        }

        // --- LOGIKA OTORISASI UNTUK SEKRETARIS ---
        if (req.user.role === 'sekretaris') {
            // Pastikan user sekretaris punya info kelas di token-nya
            if (!req.user.class_id) {
                return res.status(403).json({ message: 'Akses ditolak. Data kelas untuk sekretaris tidak valid.' });
            }
            // Bandingkan kelas dari jadwal presensi dengan kelas milik sekretaris
            if (!attendance.schedule_id || attendance.schedule_id.class_id.toString() !== req.user.class_id.toString()) {
                return res.status(403).json({ message: 'Akses ditolak. Sekretaris hanya bisa mengubah presensi untuk kelasnya sendiri.' });
            }
        }
        // --- AKHIR LOGIKA OTORISASI ---

        // Lanjutkan proses update jika lolos otorisasi
        const updatedAttendance = await Attendance.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        res.status(200).json(updatedAttendance);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// DELETE (Opsional, hapus jika tidak diperlukan)
router.delete('/:id', async (req, res) => {
    try {
        const deletedAttendance = await Attendance.findByIdAndDelete(req.params.id);
        if (!deletedAttendance) return res.status(404).json({ message: 'Presensi tidak ditemukan' });
        res.status(200).json({ message: 'Presensi dihapus' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;