const errorBox = document.getElementById('errorBox');
const loginForm = document.getElementById('loginForm');
const submitBtn = document.getElementById('submitBtn');

// ===== Password visibility toggle =====
const passwordInput = document.getElementById('password');
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

// If already signed in, go directly to landing page.
(function redirectIfLoggedIn() {
  const user = auth.getUser();
  if (user) {
    window.location.href = 'landing.html';
  }
})();

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBox.classList.add('hidden');

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Signing in…';

  try {
    await auth.login(email, password);
    window.location.href = 'landing.html';
  } catch (err) {
    errorBox.textContent = err.message || 'Login failed. Please try again.';
    errorBox.classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign in';
  }
});
