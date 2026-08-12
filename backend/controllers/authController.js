const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { sendPasswordResetEmail, sendOtpEmail } = require('../utils/emailService');
const { generateOtp, hashOtp } = require('../utils/otpService');

const generateToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role, department: user.department },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  department: user.department,
});

const maskEmail = (email) => {
  const [local, domain] = email.split('@');
  const visible = local.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(local.length - 2, 1))}@${domain}`;
};

// POST /api/auth/login
// Step 1 of 2: verifies email + password, then emails a 6-digit code to
// the account's own email address. Does NOT issue a token yet — the
// client must call /verify-otp with the code to actually sign in.
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email }).populate('department', 'name code');
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const { code, codeHash, expires } = generateOtp();
    user.otpCodeHash = codeHash;
    user.otpExpires = expires;
    await user.save();

    await sendOtpEmail(user.email, code);

    res.json({
      otpRequired: true,
      userId: user._id,
      maskedEmail: maskEmail(user.email),
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// POST /api/auth/verify-otp
// Step 2 of 2: checks the emailed code. Only on success does this issue
// the real JWT — this is the actual "login" from the client's point of view.
exports.verifyOtp = async (req, res) => {
  try {
    const { userId, code } = req.body;
    if (!userId || !code) {
      return res.status(400).json({ message: 'userId and code are required' });
    }

    const user = await User.findById(userId).populate('department', 'name code');
    if (!user || !user.isActive || !user.otpCodeHash || !user.otpExpires) {
      return res.status(401).json({ message: 'Invalid request' });
    }

    if (user.otpExpires < new Date()) {
      return res.status(401).json({ message: 'Code expired. Please sign in again.' });
    }

    if (hashOtp(code) !== user.otpCodeHash) {
      return res.status(401).json({ message: 'Incorrect code' });
    }

    // One-time use — clear it immediately so it can't be replayed.
    user.otpCodeHash = null;
    user.otpExpires = null;
    await user.save();

    const token = generateToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password').populate('department', 'name code');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const RESET_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

// POST /api/auth/forgot-password
// Always returns a generic success message — never reveals whether an
// email is actually registered, so this endpoint can't be used to
// enumerate staff accounts.
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const genericResponse = {
      message: 'If that email is registered, a password reset link has been sent.',
    };

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.isActive) {
      return res.json(genericResponse);
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetPasswordTokenHash = tokenHash;
    user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await user.save();

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${clientUrl.replace(/\/$/, '')}/reset-password.html?token=${rawToken}`;

    await sendPasswordResetEmail(user.email, resetUrl);

    res.json(genericResponse);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// POST /api/auth/reset-password/:token
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: 'This reset link is invalid or has expired. Please request a new one.' });
    }

    user.password = password; // pre-save hook re-hashes this
    user.resetPasswordTokenHash = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ message: 'Password updated. You can now sign in with your new password.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};