const express = require('express');
const router = express.Router();
const Violation = require('../models/Violation');
const ViolationRule = require('../models/ViolationRule');
const Student = require('../models/Student');
const authMiddleware = require('../models/authMiddleware');

router.use(authMiddleware);

// Middleware proteksi khusus untuk wali kelas dan sekretaris
const classRestrictedGuard = (req, res, next) => {
    const { role } = req.user;
    const isReadRequest = req.method === 'GET';

    // Wali kelas dan sekretaris hanya bisa membaca data pelanggaran
    if ((role === 'wali_kelas' || role === 'sekretaris') && !isReadRequest) {
        return res.status(403).json({ message: 'Akses ditolak. Anda hanya diizinkan untuk melihat data.' });
    }
    next();
};
router.use(classRestrictedGuard);

// GET: Ambil semua riwayat pelanggaran
router.get('/', async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'orang_tua') {
            query.student_id = req.user.student_id;
        } else if (req.user.role === 'wali_kelas' || req.user.role === 'sekretaris') {
            // Wali kelas dan sekretaris hanya melihat pelanggaran siswa dari kelasnya
            const studentsInClass = await Student.find({ class_id: req.user.class_id }).select('_id');
            query.student_id = { $in: studentsInClass.map(s => s._id) };
        }
        const violations = await Violation.find(query)
            .populate('student_id', 'name nis')
            .populate('rule_id', 'violation_name points category')
            .populate('reported_by', 'username role');
        res.status(200).json(violations);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET: Ambil riwayat berdasarkan ID
router.get('/:id', async (req, res) => {
    try {
        if (req.user.role === 'orang_tua') {
            const violation = await Violation.findOne({ _id: req.params.id, student_id: req.user.student_id });
            if (!violation) return res.status(404).json({ message: 'Riwayat pelanggaran tidak ditemukan atau bukan milik anak Anda' });
            return res.status(200).json(violation);
        } else if (req.user.role === 'wali_kelas' || req.user.role === 'sekretaris') {
            // Pastikan data riwayat pelanggaran ini adalah murid dari kelas yang diampu/diikuti
            const violation = await Violation.findById(req.params.id).populate('student_id');
            if (!violation || violation.student_id.class_id.toString() !== req.user.class_id?.toString()) {
                return res.status(403).json({ message: 'Akses ditolak. Pelanggaran ini bukan dari kelas Anda.' });
            }
            return res.status(200).json(violation);
        }
        const violation = await Violation.findById(req.params.id);
        if (!violation) return res.status(404).json({ message: 'Riwayat pelanggaran tidak ditemukan' });
        res.status(200).json(violation);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST: Catat Pelanggaran & Tambah Poin
router.post('/', async (req, res) => {
    try {
        const { student_id, rule_id, date, description } = req.body;

        // Ambil data referensi rule untuk poin
        const rule = await ViolationRule.findById(rule_id);
        if (!rule) return res.status(404).json({ message: 'Aturan pelanggaran tidak ditemukan' });

        // Ambil data student dan update total_points
        const student = await Student.findById(student_id);
        if (!student) return res.status(404).json({ message: 'Data siswa tidak ditemukan' });
        
        student.total_points += rule.points;
        await student.save();

        // Simpan riwayat dengan reported_by dari token
        const violation = new Violation({ student_id, rule_id, date, description, reported_by: req.user.id });
        const savedViolation = await violation.save();

        res.status(201).json({ message: 'Pelanggaran dicatat', violation: savedViolation, total_points: student.total_points });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// PUT: Update data riwayat (Hati-hati: poin siswa belum otomatis disesuaikan di logika dasar ini)
router.put('/:id', async (req, res) => {
    try {
        const updatedViolation = await Violation.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!updatedViolation) return res.status(404).json({ message: 'Riwayat tidak ditemukan' });
        res.status(200).json(updatedViolation);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// DELETE
router.delete('/:id', async (req, res) => {
    try {
        const deletedViolation = await Violation.findByIdAndDelete(req.params.id);
        if (!deletedViolation) return res.status(404).json({ message: 'Riwayat tidak ditemukan' });
        res.status(200).json({ message: 'Riwayat berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;