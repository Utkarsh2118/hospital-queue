const express = require('express');
const router = express.Router();
const { submitFeedback, getFeedbackSummary } = require('../controllers/feedbackController');
const { protect, authorize } = require('../middleware/auth');

// Public - patient rates their completed visit
router.post('/', submitFeedback);

// Protected - doctor/admin dashboard summary
router.get('/:departmentId/summary', protect, authorize('doctor', 'admin'), getFeedbackSummary);

module.exports = router;
