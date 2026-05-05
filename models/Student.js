const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  nis: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  class_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  total_points: {
    type: Number,
    default: 0
  },
  parrent_phone: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Student', studentSchema);