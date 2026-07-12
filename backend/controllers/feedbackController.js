const Feedback = require('../models/Feedback');
const Token = require('../models/Token');

// POST /api/feedback
// Public — a patient rates their visit using the token number on their
// ticket, once the doctor has marked that visit "completed". One rating
// per token; submitting again just updates the existing one.
exports.submitFeedback = async (req, res) => {
  try {
    const { tokenNumber, rating, comment } = req.body;

    if (!tokenNumber) return res.status(400).json({ message: 'Token number is required' });
    const numericRating = Number(rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: 'Rating must be a whole number from 1 to 5' });
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const token = await Token.findOne({
      tokenNumber: new RegExp(`^${tokenNumber}$`, 'i'),
      createdAt: { $gte: startOfDay },
    });

    if (!token) return res.status(404).json({ message: 'No token found with that number today' });
    if (token.status !== 'completed') {
      return res.status(400).json({ message: 'Feedback can only be submitted after the visit is completed' });
    }

    const feedback = await Feedback.findOneAndUpdate(
      { token: token._id },
      {
        token: token._id,
        tokenNumber: token.tokenNumber,
        department: token.department,
        rating: numericRating,
        comment: (comment || '').trim().slice(0, 500),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ feedback });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// GET /api/feedback/:departmentId/summary
// Doctor/admin — today's average rating + count + most recent comments,
// for a single department (mirrors the pattern used by queue stats).
exports.getFeedbackSummary = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const entries = await Feedback.find({
      department: departmentId,
      createdAt: { $gte: startOfDay },
    }).sort({ createdAt: -1 });

    const count = entries.length;
    const avgRating = count ? Math.round((entries.reduce((sum, e) => sum + e.rating, 0) / count) * 10) / 10 : null;

    res.json({ count, avgRating, recent: entries.slice(0, 10) });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
