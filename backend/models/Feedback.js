const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    token: { type: mongoose.Schema.Types.ObjectId, ref: 'Token', required: true, unique: true }, // one rating per visit
    tokenNumber: { type: String, required: true }, // kept denormalized for quick display
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, default: '', maxlength: 500 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Feedback', feedbackSchema);
