const User = require('../models/User');

// POST /api/users  (admin only) - create doctor or admin account
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'name, email, password and role are required' });
    }
    if (role === 'doctor' && !department) {
      return res.status(400).json({ message: 'department is required for doctor accounts' });
    }

    const user = await User.create({ name, email, password, role, department: department || null });
    res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'A user with this email already exists' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// GET /api/users  (admin only)
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').populate('department', 'name code');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// DELETE /api/users/:id  (admin only) - soft deactivate
exports.deactivateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deactivated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// PUT /api/users/:id  (admin only) - currently just toggles isActive
// (reactivating a previously-deactivated doctor account)
exports.updateUser = async (req, res) => {
  try {
    const { isActive } = req.body;
    const update = {};
    if (typeof isActive === 'boolean') update.isActive = isActive;

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true })
      .select('-password')
      .populate('department', 'name code');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// PUT /api/users/:id/reset-password  (admin only) - basic "forgot password"
// flow: since there's no email/SMS infra here, the admin sets a new
// temporary password directly and shares it with the doctor.
exports.resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 4) {
      return res.status(400).json({ message: 'A new password (min 4 characters) is required' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.password = password; // pre('save') hook hashes it
    await user.save();
    res.json({ message: 'Password reset' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
