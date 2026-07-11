const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true }, // e.g. "General OPD"
    code: { type: String, required: true, unique: true, trim: true, uppercase: true }, // e.g. "GEN"
    roomNumber: { type: String, default: '' },
    tokenPrefix: { type: String, required: true, uppercase: true }, // e.g. "G" -> G001
    lastTokenNumber: { type: Number, default: 0 }, // used to auto-increment tokens, resets daily via cron/logic
    lastResetDate: { type: String, default: () => new Date().toISOString().slice(0, 10) },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Department', departmentSchema);
