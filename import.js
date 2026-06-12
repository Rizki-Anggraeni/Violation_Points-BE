const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();
const User = require('./models/User');
const Student = require('./models/Student');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    console.log('Terhubung ke MongoDB. Mulai memproses JSON...');
    
    try {
        // Pastikan Anda sudah membuat file data.json di folder yang sama
        const fileData = fs.readFileSync('./data.json', 'utf-8');
        const assignments = JSON.parse(fileData);

        for (let item of assignments) {
            const { username_ortu, student_nis } = item;
            
            const user = await User.findOne({ username: username_ortu, role: 'orang_tua' });
            if (!user) {
                console.log(`[Gagal] Akun ortu '${username_ortu}' tidak ditemukan.`);
                continue;
            }

            const students = await Student.find({ nis: { $in: student_nis } }).select('_id');
            if (students.length === 0) {
                console.log(`[Gagal] NIS siswa untuk ortu '${username_ortu}' tidak valid.`);
                continue;
            }

            user.student_id = students.map(s => s._id);
            await user.save();
            console.log(`[Berhasil] ${students.length} siswa ditugaskan ke ortu '${username_ortu}'.`);
        }
        console.log('Proses selesai!');
    } catch (error) {
        console.error('Terjadi kesalahan:', error.message);
    } finally {
        mongoose.connection.close();
        process.exit();
    }
});