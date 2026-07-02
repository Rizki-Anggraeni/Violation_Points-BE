const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Schedule = require('../models/Schedule');
const Violation = require('../models/Violation');
const ViolationRule = require('../models/ViolationRule');
const authMiddleware = require('../models/authMiddleware');
const User = require('../models/User');
const mongoose = require('mongoose');

router.use(authMiddleware);

// GET: Ambil semua presensi
router.get('/', async (req, res) => {
    try {
        let query = {};

        const dbUser = await User.findById(req.user.id || req.user._id);
        const userRole = dbUser ? dbUser.role : req.user.role;
        const studentId = dbUser ? dbUser.student_id : req.user.student_id;
        const classId = dbUser ? dbUser.class_id : req.user.class_id;

        if (userRole === 'orang_tua') {
            if (!studentId) return res.status(200).json([]);
            // Logika disederhanakan: Langsung gunakan student_id yang berisi ObjectId
            query.student_id = { $in: studentId };
        } else if (userRole === 'wali_kelas' || userRole === 'sekretaris') {
            if (!classId) {
                return res.status(200).json([]);
            }
            // Wali kelas & sekretaris hanya melihat presensi siswa dari kelasnya
            const studentsInClass = await Student.find({ class_id: classId }).select('_id');
            query.student_id = { $in: studentsInClass.map(s => s._id) };
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
        if (req.user.role === 'orang_tua') {
            const attendance = await Attendance.findOne({ _id: req.params.id, student_id: req.user.student_id });
            if (!attendance) return res.status(404).json({ message: 'Presensi tidak ditemukan atau bukan milik anak Anda' });
            return res.status(200).json(attendance);
        } else if (req.user.role === 'wali_kelas') {
            // Pastikan presensi yang dilihat wali kelas berasal dari siswa di kelasnya
            const attendance = await Attendance.findById(req.params.id).populate('student_id');
            if (!attendance || attendance.student_id.class_id.toString() !== req.user.class_id?.toString()) {
                return res.status(403).json({ message: 'Akses ditolak. Presensi ini bukan dari kelas Anda.' });
            }
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

        // Blokir akses Guru BK dan Orang Tua
        if (['guru_bk', 'orang_tua'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Akses ditolak. Anda tidak memiliki izin untuk menginput presensi.' });
        }

        // --- LOGIKA OTORISASI WAKTU UNTUK SEKRETARIS ---
        if (req.user.role === 'sekretaris') {
            const schedule = await Schedule.findById(schedule_id);
            if (!schedule) return res.status(404).json({ message: 'Jadwal tidak ditemukan' });

            if (schedule.class_id.toString() !== req.user.class_id?.toString()) {
                return res.status(403).json({ message: 'Akses ditolak. Anda hanya dapat mengisi presensi untuk kelas Anda sendiri.' });
            }

            // Gunakan zona waktu Indonesia (WIB)
            const wibTime = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
            const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
            const currentDay = days[wibTime.getDay()];
            if (schedule.day !== currentDay) {
                return res.status(400).json({ message: 'Presensi hanya dapat diisi pada hari yang sesuai dengan jadwal.' });
            }

            const currentMinutes = wibTime.getHours() * 60 + wibTime.getMinutes();
            const [startH, startM] = schedule.start_time.split(':').map(Number);
            const [endH, endM] = schedule.end_time.split(':').map(Number);
            const scheduleStart = startH * 60 + startM;
            const scheduleEnd = endH * 60 + endM;

            if (currentMinutes < scheduleStart || currentMinutes > (scheduleEnd + 60)) {
                return res.status(400).json({ message: `Input ditolak. Presensi hanya bisa diisi dari jam ${schedule.start_time} hingga 60 menit setelah jam ${schedule.end_time}.` });
            }
        }

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

        // Blokir akses Guru BK dan Orang Tua
        if (['guru_bk', 'orang_tua'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Akses ditolak. Anda tidak memiliki izin untuk mengubah presensi.' });
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

            // Cek batas waktu untuk update
            const schedule = await Schedule.findById(attendance.schedule_id._id);
            if (schedule) {
                // Gunakan zona waktu Indonesia (WIB)
                const wibTime = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
                const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                const currentDay = days[wibTime.getDay()];
                if (schedule.day !== currentDay) {
                    return res.status(400).json({ message: 'Update presensi hanya dapat dilakukan pada hari yang sama dengan jadwal.' });
                }

                const currentMinutes = wibTime.getHours() * 60 + wibTime.getMinutes();
                const [startH, startM] = schedule.start_time.split(':').map(Number);
                const [endH, endM] = schedule.end_time.split(':').map(Number);
                if (currentMinutes < (startH * 60 + startM) || currentMinutes > (endH * 60 + endM + 60)) {
                    return res.status(400).json({ message: `Update ditolak. Presensi hanya bisa diubah dari jam ${schedule.start_time} hingga 60 menit setelah jam ${schedule.end_time}.` });
                }
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