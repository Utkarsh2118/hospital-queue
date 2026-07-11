const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema(
  {
    tokenNumber: { type: String, required: true }, // e.g. "G-014"
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    patientName: { type: String, required: true, trim: true },
    patientAge: { type: Number },
    patientPhone: { type: String, trim: true },
    symptoms: { type: String, trim: true, default: '' },
    priority: { type: String, enum: ['normal', 'emergency'], default: 'normal' },
    status: {
      type: String,
      enum: ['waiting', 'in-progress', 'completed', 'skipped', 'no-show'],
      default: 'waiting',
    },
    calledAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true } // createdAt = check-in time
);

// Compound index: fast lookup of today's waiting queue per department, priority-first
tokenSchema.index({ department: 1, status: 1, priority: 1, createdAt: 1 });

module.exports = mongoose.model('Token', tokenSchema);
