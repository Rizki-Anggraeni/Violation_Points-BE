const express = require('express');
const router = express.Router();
const ViolationRule = require('../models/ViolationRule');
const authMiddleware = require('../models/authMiddleware');

router.use(authMiddleware);

// Middleware untuk memastikan hanya role tertentu yang bisa mengubah data.
const checkModificationRole = (req, res, next) => {
    const { role } = req.user;
    const isModificationRequest = ['POST', 'PUT', 'DELETE'].includes(req.method);

    // Role yang diizinkan untuk melakukan modifikasi (POST, PUT, DELETE)
    const allowedRolesForModification = ['admin', 'guru_bk'];

    if (isModificationRequest && !allowedRolesForModification.includes(role)) {
        return res.status(403).json({ message: 'Anda tidak memiliki izin untuk mengubah data aturan pelanggaran.' });
    }
    next();
};
router.use(checkModificationRole);

// GET: Ambil semua data aturan pelanggaran
router.get('/', async (req, res) => {
    try {
        const rules = await ViolationRule.find();
        res.status(200).json(rules);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET: Ambil aturan pelanggaran berdasar ID
router.get('/:id', async (req, res) => {
    try {
        const rule = await ViolationRule.findById(req.params.id);
        if (!rule) return res.status(404).json({ message: 'Aturan tidak ditemukan' });
        res.status(200).json(rule);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST: Tambah aturan pelanggaran baru
router.post('/', async (req, res) => {
    try {
        const rule = new ViolationRule(req.body);
        const savedRule = await rule.save();
        res.status(201).json(savedRule);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// PUT: Update aturan pelanggaran
router.put('/:id', async (req, res) => {
    try {
        const updatedRule = await ViolationRule.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!updatedRule) return res.status(404).json({ message: 'Aturan tidak ditemukan' });
        res.status(200).json(updatedRule);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// DELETE: Hapus aturan pelanggaran
router.delete('/:id', async (req, res) => {
    try {
        const deletedRule = await ViolationRule.findByIdAndDelete(req.params.id);
        if (!deletedRule) return res.status(404).json({ message: 'Aturan tidak ditemukan' });
        res.status(200).json({ message: 'Aturan berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;