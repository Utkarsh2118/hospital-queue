const express = require('express');
const router = express.Router();
const {
  createUser,
  getUsers,
  deactivateUser,
  updateUser,
  resetPassword,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.post('/', protect, authorize('admin'), createUser);
router.get('/', protect, authorize('admin'), getUsers);
router.put('/:id', protect, authorize('admin'), updateUser);
router.put('/:id/reset-password', protect, authorize('admin'), resetPassword);
router.delete('/:id', protect, authorize('admin'), deactivateUser);

module.exports = router;
