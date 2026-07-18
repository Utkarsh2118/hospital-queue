const errorBox = document.getElementById('errorBox');
const infoBox = document.getElementById('infoBox');
const loginForm = document.getElementById('loginForm');
const submitBtn = document.getElementById('submitBtn');
const rememberMeInput = document.getElementById('rememberMe');

// ===== Role tabs =====
// Purely a sign-in orientation choice — the server still returns the
// account's real role. If they don't match, we say so honestly instead
// of silently sending the person to a portal they didn't ask for.
let selectedRole = 'doctor';
const roleTabs = document.querySelectorAll('.login__role-tab');
roleTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    roleTabs.forEach((t) => {
      t.classList.remove('is-active');
      t.setAttribute('aria-selected', 'false');
    });
    tab.classList.add('is-active');
    tab.setAttribute('aria-selected', 'true');
    selectedRole = tab.getAttribute('data-role');
  });
});

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

// If already signed in, skip straight to the right dashboard.
(function redirectIfLoggedIn() {
  const user = auth.getUser();
  if (user) {
    window.location.href = user.role === 'admin' ? 'admin.html' : 'dashboard.html';
  }
})();

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBox.classList.add('hidden');
  infoBox.classList.add('hidden');

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const rememberMe = rememberMeInput.checked;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Signing in…';

  try {
    const user = await auth.login(email, password, rememberMe);
    const destination = user.role === 'admin' ? 'admin.html' : 'dashboard.html';

    if (user.role !== selectedRole) {
      // Valid credentials, just not the portal they picked — tell them
      // plainly and send them to the account they actually have.
      infoBox.textContent = `This account is registered as ${user.role === 'admin' ? 'an admin' : 'a doctor'}. Redirecting you there now…`;
      infoBox.classList.remove('hidden');
      setTimeout(() => {
        window.location.href = destination;
      }, 1400);
    } else {
      window.location.href = destination;
    }
  } catch (err) {
    errorBox.textContent = err.message || 'Login failed. Please try again.';
    errorBox.classList.remove('hidden');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign in';
  }
});
