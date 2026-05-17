const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['orang_tua', 'wali_kelas', 'guru_bk', 'admin', 'sekretaris'],
    required: true
  },
  class_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  }, // ID Kelas untuk user dengan role 'sekretaris'
  student_id: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    default: []
  }] // ID Siswa khusus untuk user dengan role 'orang_tua'
}, {
  timestamps: true
});

// Middleware Mongoose untuk enkripsi password sebelum disimpan
userSchema.pre('save', async function () {
  // Hanya jalankan enkripsi jika password diubah atau user baru dibuat
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

module.exports = mongoose.model('User', userSchema);