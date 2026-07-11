const Department = require('../models/Department');

// GET /api/departments  (public - patient kiosk needs this to pick a department)
exports.getDepartments = async (req, res) => {
  try {
    const departments = await Department.find({ isActive: true }).sort({ name: 1 });
    res.json(departments);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// POST /api/departments  (admin only)
exports.createDepartment = async (req, res) => {
  try {
    const { name, code, roomNumber, tokenPrefix } = req.body;
    if (!name || !code || !tokenPrefix) {
      return res.status(400).json({ message: 'name, code and tokenPrefix are required' });
    }
    const department = await Department.create({ name, code, roomNumber, tokenPrefix });
    res.status(201).json(department);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Department with this name/code already exists' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// PUT /api/departments/:id  (admin only)
exports.updateDepartment = async (req, res) => {
  try {
    const department = await Department.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!department) return res.status(404).json({ message: 'Department not found' });
    res.json(department);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// DELETE /api/departments/:id  (admin only) - soft delete
exports.deactivateDepartment = async (req, res) => {
  try {
    const department = await Department.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!department) return res.status(404).json({ message: 'Department not found' });
    res.json({ message: 'Department deactivated', department });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
