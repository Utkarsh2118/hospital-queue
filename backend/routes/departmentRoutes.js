const express = require('express');
const router = express.Router();
const {
  getDepartments,
  createDepartment,
  updateDepartment,
  deactivateDepartment,
} = require('../controllers/departmentController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', getDepartments);
router.post('/', protect, authorize('admin'), createDepartment);
router.put('/:id', protect, authorize('admin'), updateDepartment);
router.delete('/:id', protect, authorize('admin'), deactivateDepartment);

module.exports = router;
