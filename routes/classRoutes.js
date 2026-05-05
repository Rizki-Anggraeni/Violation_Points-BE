const express = require('express');
const router = express.Router();
const Class = require('../models/Class');
const authMiddleware = require('../models/authMiddleware');

router.use(authMiddleware);

// GET: Ambil semua data kelas
router.get('/', async (req, res) => {
    try {
        const classes = await Class.find();
        res.status(200).json(classes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET: Ambil satu kelas berdasarkan ID
router.get('/:id', async (req, res) => {
    try {
        const classData = await Class.findById(req.params.id);
        if (!classData) return res.status(404).json({ message: 'Kelas tidak ditemukan' });
        res.status(200).json(classData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST: Tambah kelas baru
router.post('/', async (req, res) => {
    try {
        const newClass = new Class(req.body);
        const savedClass = await newClass.save();
        res.status(201).json(savedClass);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// PUT: Update nama kelas
router.put('/:id', async (req, res) => {
    try {
        const updatedClass = await Class.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!updatedClass) return res.status(404).json({ message: 'Kelas tidak ditemukan' });
        res.status(200).json(updatedClass);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// DELETE: Hapus kelas
router.delete('/:id', async (req, res) => {
    try {
        const deletedClass = await Class.findByIdAndDelete(req.params.id);
        if (!deletedClass) return res.status(404).json({ message: 'Kelas tidak ditemukan' });
        res.status(200).json({ message: 'Kelas berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;