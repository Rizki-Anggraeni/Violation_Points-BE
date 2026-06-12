const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();
const ViolationRule = require('./models/ViolationRule');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    console.log('Terhubung ke MongoDB. Mulai memproses JSON Aturan Pelanggaran...');
    
    try {
        // Membaca file rules.json di folder yang sama
        const fileData = fs.readFileSync('./rules.json', 'utf-8');
        const rules = JSON.parse(fileData);

        // Menyimpan banyak data ke database sekaligus
        const result = await ViolationRule.insertMany(rules);
        
        console.log(`[Berhasil] ${result.length} jenis aturan pelanggaran baru telah ditambahkan ke database.`);
    } catch (error) {
        console.error('Terjadi kesalahan:', error.message);
    } finally {
        mongoose.connection.close();
        process.exit();
    }
});