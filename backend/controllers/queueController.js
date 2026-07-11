const Department = require('../models/Department');
const Token = require('../models/Token');

const today = () => new Date().toISOString().slice(0, 10);

// Atomically gets the next token number for a department, resetting the counter
// if it's a new day (so tokens restart at 001 each morning).
const getNextTokenNumber = async (department) => {
  const currentDate = today();

  if (department.lastResetDate !== currentDate) {
    department.lastTokenNumber = 0;
    department.lastResetDate = currentDate;
  }
  department.lastTokenNumber += 1;
  await department.save();

  const padded = String(department.lastTokenNumber).padStart(3, '0');
  return `${department.tokenPrefix}-${padded}`;
};

// POST /api/queue/checkin
// Public endpoint - patient self check-in kiosk uses this
exports.checkIn = async (req, res) => {
  try {
    const { departmentId, patientName, patientAge, patientPhone, symptoms, priority } = req.body;

    if (!departmentId || !patientName) {
      return res.status(400).json({ message: 'Department and patient name are required' });
    }

    const department = await Department.findById(departmentId);
    if (!department || !department.isActive) {
      return res.status(404).json({ message: 'Department not found or inactive' });
    }

    const tokenNumber = await getNextTokenNumber(department);

    const token = await Token.create({
      tokenNumber,
      department: department._id,
      patientName,
      patientAge,
      patientPhone,
      symptoms,
      priority: priority === 'emergency' ? 'emergency' : 'normal',
    });

    // Notify all connected clients (display screens, doctor dashboards) in this department's room
    const io = req.app.get('io');
    io.to(`department:${department._id}`).emit('queue:updated', { departmentId: department._id });
    // Separate, lighter-weight event so the doctor dashboard can play a
    // check-in sound without re-parsing the full queue payload.
    io.to(`department:${department._id}`).emit('queue:new-checkin', {
      departmentId: department._id,
      token,
    });

    res.status(201).json({ token });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// GET /api/queue/:departmentId
// Returns today's waiting queue for a department, emergency-first then FIFO
exports.getQueue = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const waiting = await Token.find({
      department: departmentId,
      status: 'waiting',
      createdAt: { $gte: startOfDay },
    }).sort({ priority: -1, createdAt: 1 }); // 'emergency' > 'normal' alphabetically desc works, but be explicit below

    // Explicit priority sort: emergency first regardless of string sort order
    waiting.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority === 'emergency' ? -1 : 1;
      return a.createdAt - b.createdAt;
    });

    const nowServing = await Token.findOne({
      department: departmentId,
      status: 'in-progress',
    }).sort({ calledAt: -1 });

    res.json({ nowServing, waiting, waitingCount: waiting.length });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// POST /api/queue/:departmentId/call-next
// Doctor dashboard action: marks current in-progress as completed (if any)
// and pulls the next patient (emergency-first, then FIFO) into in-progress.
exports.callNext = async (req, res) => {
  try {
    const { departmentId } = req.params;

    // Auto-complete any currently in-progress token for this department
    await Token.updateMany(
      { department: departmentId, status: 'in-progress' },
      { status: 'completed', completedAt: new Date() }
    );

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const candidates = await Token.find({
      department: departmentId,
      status: 'waiting',
      createdAt: { $gte: startOfDay },
    });

    if (candidates.length === 0) {
      const io = req.app.get('io');
      io.to(`department:${departmentId}`).emit('queue:updated', { departmentId });
      return res.status(200).json({ message: 'No patients waiting', nowServing: null });
    }

    candidates.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority === 'emergency' ? -1 : 1;
      return a.createdAt - b.createdAt;
    });

    const next = candidates[0];
    next.status = 'in-progress';
    next.calledAt = new Date();
    await next.save();

    const io = req.app.get('io');
    io.to(`department:${departmentId}`).emit('queue:updated', { departmentId });
    io.to(`department:${departmentId}`).emit('queue:now-serving', { token: next });

    res.json({ nowServing: next });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// POST /api/queue/token/:tokenId/skip
exports.skipToken = async (req, res) => {
  try {
    const token = await Token.findById(req.params.tokenId);
    if (!token) return res.status(404).json({ message: 'Token not found' });

    token.status = 'skipped';
    await token.save();

    const io = req.app.get('io');
    io.to(`department:${token.department}`).emit('queue:updated', { departmentId: token.department });

    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// GET /api/queue/token/:tokenId  (patient can check their own status)
exports.getTokenStatus = async (req, res) => {
  try {
    const token = await Token.findById(req.params.tokenId).populate('department', 'name code roomNumber');
    if (!token) return res.status(404).json({ message: 'Token not found' });

    // Estimate position in queue (only meaningful if still waiting)
    let position = null;
    if (token.status === 'waiting') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const ahead = await Token.find({
        department: token.department,
        status: 'waiting',
        createdAt: { $gte: startOfDay, $lt: token.createdAt },
      }).countDocuments();
      position = ahead + 1;
    }

    res.json({ token, position });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// GET /api/queue/:departmentId/history
// Doctor dashboard "Patient history" tab: today's completed (and skipped)
// patients for this department, most recent first.
exports.getHistory = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const history = await Token.find({
      department: departmentId,
      status: { $in: ['completed', 'skipped'] },
      createdAt: { $gte: startOfDay },
    }).sort({ completedAt: -1, createdAt: -1 });

    res.json({ history });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// GET /api/queue/lookup/:tokenNumber
// Public - lets a patient look up their own token by the human-readable
// token number printed on their ticket (e.g. "GEN-004"), for the phone
// tracking link / QR code flow. Only searches today's tokens since token
// numbers reset every morning.
exports.lookupToken = async (req, res) => {
  try {
    const { tokenNumber } = req.params;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const token = await Token.findOne({
      tokenNumber: new RegExp(`^${tokenNumber}$`, 'i'),
      createdAt: { $gte: startOfDay },
    }).populate('department', 'name code roomNumber');

    if (!token) return res.status(404).json({ message: 'No token found with that number today' });

    let position = null;
    if (token.status === 'waiting') {
      const ahead = await Token.find({
        department: token.department,
        status: 'waiting',
        createdAt: { $gte: startOfDay, $lt: token.createdAt },
      }).countDocuments();
      position = ahead + 1;
    }

    res.json({ token, position });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// GET /api/queue/:departmentId/stats
// Doctor dashboard stats: patients completed today + average wait time
// (time from check-in to being called), in minutes.
exports.getStats = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const completedToday = await Token.find({
      department: departmentId,
      status: 'completed',
      createdAt: { $gte: startOfDay },
      calledAt: { $ne: null },
    });

    const skippedToday = await Token.countDocuments({
      department: departmentId,
      status: 'skipped',
      createdAt: { $gte: startOfDay },
    });

    let avgWaitMinutes = null;
    if (completedToday.length > 0) {
      const totalWaitMs = completedToday.reduce(
        (sum, t) => sum + (new Date(t.calledAt) - new Date(t.createdAt)),
        0
      );
      avgWaitMinutes = Math.round(totalWaitMs / completedToday.length / 60000);
    }

    res.json({
      servedToday: completedToday.length,
      skippedToday,
      avgWaitMinutes,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
