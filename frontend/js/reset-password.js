const errorBox = document.getElementById('errorBox');
const infoBox = document.getElementById('infoBox');
const resetForm = document.getElementById('resetForm');
const submitBtn = document.getElementById('submitBtn');
const passwordInput = document.getElementById('password');
const passwordConfirmInput = document.getElementById('passwordConfirm');

// ===== Password visibility toggle (matches login.html behavior) =====
const togglePasswordBtn = document.getElementById('togglePasswordBtn');
const passwordToggleIconSlot = document.getElementById('passwordToggleIconSlot');
passwordToggleIconSlot.innerHTML = iconSvg('eye');
togglePasswordBtn.addEventListener('click', () => {
  const isHidden = passwordInput.type === 'password';
  passwordInput.type = isHidden ? 'text' : 'password';
  passwordToggleIconSlot.innerHTML = iconSvg(isHidden ? 'eyeOff' : 'eye');
  togglePasswordBtn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
  togglePasswordBtn.setAttribute('aria-pressed', String(isHidden));
});

const token = new URLSearchParams(window.location.search).get('token');

if (!token) {
  errorBox.textContent = 'This reset link is missing its token. Please request a new one from the forgot-password page.';
  errorBox.classList.remove('hidden');
  resetForm.querySelectorAll('input, button').forEach((el) => (el.disabled = true));
}

resetForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBox.classList.add('hidden');
  infoBox.classList.add('hidden');

  if (passwordInput.value !== passwordConfirmInput.value) {
    errorBox.textContent = "Passwords don't match.";
    errorBox.classList.remove('hidden');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Updating…';

  try {
    const data = await api.post(`/auth/reset-password/${encodeURIComponent(token)}`, {
      password: passwordInput.value,
    });
    infoBox.textContent = data.message || 'Password updated. You can now sign in.';
    infoBox.classList.remove('hidden');
    resetForm.reset();
    resetForm.querySelectorAll('input, button').forEach((el) => (el.disabled = true));
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1800);
  } catch (err) {
    errorBox.textContent = err.message || 'Could not reset your password. The link may have expired.';
    errorBox.classList.remove('hidden');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Update password';
  }
});
