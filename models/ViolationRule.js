const mongoose = require('mongoose');

const violationRuleSchema = new mongoose.Schema({
  violation_name: {
    type: String,
    required: true
  },
  points: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    enum: ['Ringan', 'Sedang', 'Berat'],
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ViolationRule', violationRuleSchema);