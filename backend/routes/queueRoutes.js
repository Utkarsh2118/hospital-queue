const express = require('express');
const router = express.Router();
const {
  checkIn,
  getQueue,
  callNext,
  skipToken,
  getTokenStatus,
  getStats,
  getHistory,
  lookupToken,
} = require('../controllers/queueController');
const { protect, authorize } = require('../middleware/auth');

// Public - patient kiosk
router.post('/checkin', checkIn);
router.get('/token/:tokenId', getTokenStatus);
router.get('/lookup/:tokenNumber', lookupToken);

// Public read - display screens can read without login
router.get('/:departmentId', getQueue);

// Protected - doctor/admin actions
router.post('/:departmentId/call-next', protect, authorize('doctor', 'admin'), callNext);
router.post('/token/:tokenId/skip', protect, authorize('doctor', 'admin'), skipToken);
router.get('/:departmentId/stats', protect, authorize('doctor', 'admin'), getStats);
router.get('/:departmentId/history', protect, authorize('doctor', 'admin'), getHistory);

module.exports = router;
