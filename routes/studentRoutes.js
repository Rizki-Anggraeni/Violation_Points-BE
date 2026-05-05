const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const authMiddleware = require('../models/authMiddleware');

// Semua endpoint di bawah ini wajib menggunakan token JWT
router.use(authMiddleware);

// GET: Ambil semua data siswa
router.get('/', async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'ortu') {
            query._id = req.user.student_id;
        }
        const students = await Student.find(query).populate('class_id', 'name'); // Jika model Class sudah ada
        res.status(200).json(students);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET: Ambil satu siswa berdasarkan ID
router.get('/:id', async (req, res) => {
    try {
        // Cek jika role ortu mencoba akses data siswa lain
        if (req.user.role === 'ortu' && req.params.id !== req.user.student_id?.toString()) {
            return res.status(403).json({ message: 'Akses ditolak. Anda hanya bisa melihat data anak Anda sendiri.' });
        }
        const student = await Student.findById(req.params.id).populate('class_id');
        if (!student) return res.status(404).json({ message: 'Siswa tidak ditemukan' });
        res.status(200).json(student);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST: Tambah siswa baru
router.post('/', async (req, res) => {
    try {
        const student = new Student(req.body);
        const savedStudent = await student.save();
        res.status(201).json(savedStudent);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// PUT: Update siswa
router.put('/:id', async (req, res) => {
    try {
        const updatedStudent = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!updatedStudent) return res.status(404).json({ message: 'Siswa tidak ditemukan' });
        res.status(200).json(updatedStudent);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// DELETE: Hapus siswa
router.delete('/:id', async (req, res) => {
    try {
        const deletedStudent = await Student.findByIdAndDelete(req.params.id);
        if (!deletedStudent) return res.status(404).json({ message: 'Siswa tidak ditemukan' });
        res.status(200).json({ message: 'Siswa berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;