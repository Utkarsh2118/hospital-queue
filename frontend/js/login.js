const errorBox = document.getElementById('errorBox');
const infoBox = document.getElementById('infoBox');
const otpPanel = document.getElementById('otpPanel');
const otpPrompt = document.getElementById('otpPrompt');
const otpCodeInput = document.getElementById('otpCodeInput');
const otpVerifyBtn = document.getElementById('otpVerifyBtn');
const otpBackBtn = document.getElementById('otpBackBtn');

let pendingLogin = null;

// ===== Role tabs + 3D card flip =====
// Purely a sign-in orientation choice — the server still returns the
// account's real role. If they don't match, we say so honestly instead
// of silently sending the person to a portal they didn't ask for.
let selectedRole = 'doctor';

const flipInner = document.getElementById('loginFlipInner');
const faceDoctor = document.querySelector('.login__face--doctor');
const faceAdmin = document.querySelector('.login__face--admin');
const roleTabs = document.querySelectorAll('.login__role-tab');

// Icon badges + tab icons, set from icons.js so the flip card and the
// rest of the app share one icon source.
document.querySelector('.login__mark--doctor').innerHTML = iconSvg('plus');
document.querySelector('.login__mark--admin').innerHTML = iconSvg('shield');
document.getElementById('roleTabDoctor').querySelector('.login__role-tab-icon').innerHTML = iconSvg('plus');
document.getElementById('roleTabAdmin').querySelector('.login__role-tab-icon').innerHTML = iconSvg('shield');

// Faces are absolutely positioned (so the flip pivots in place instead
// of the card resizing mid-turn) — that takes them out of flow, so the
// wrapper needs an explicit height. Measure the taller face and lock it.
function syncFlipHeight() {
  const h = Math.max(faceDoctor.offsetHeight, faceAdmin.offsetHeight);
  if (h > 0) flipInner.style.height = `${h}px`;
}
syncFlipHeight();
window.addEventListener('resize', syncFlipHeight);
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(syncFlipHeight);
}

function setFaceInteractive(face, isActive) {
  face.querySelectorAll('input, button, a').forEach((el) => {
    if (isActive) {
      el.removeAttribute('tabindex');
    } else {
      el.setAttribute('tabindex', '-1');
    }
  });
  face.querySelectorAll('input[data-required-when-active]').forEach((el) => {
    el.required = isActive;
  });
}

function setRole(role) {
  if (role === selectedRole) return;
  selectedRole = role;

  roleTabs.forEach((tab) => {
    const isActive = tab.getAttribute('data-role') === role;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });

  flipInner.classList.toggle('is-flipped', role === 'admin');
  faceDoctor.setAttribute('aria-hidden', String(role !== 'doctor'));
  faceAdmin.setAttribute('aria-hidden', String(role !== 'admin'));
  setFaceInteractive(faceDoctor, role === 'doctor');
  setFaceInteractive(faceAdmin, role === 'admin');

  errorBox.classList.add('hidden');
  infoBox.classList.add('hidden');
  if (!pendingLogin) otpPanel.classList.add('hidden');
}

roleTabs.forEach((tab) => {
  tab.addEventListener('click', () => setRole(tab.getAttribute('data-role')));
});

// ===== Password visibility toggle (one per face) =====
document.querySelectorAll('.password-toggle').forEach((btn) => {
  const targetInput = document.getElementById(btn.getAttribute('data-target'));
  const iconSlot = btn.querySelector('.password-toggle-icon-slot');
  iconSlot.innerHTML = iconSvg('eye');

  btn.addEventListener('click', () => {
    const isHidden = targetInput.type === 'password';
    targetInput.type = isHidden ? 'text' : 'password';
    iconSlot.innerHTML = iconSvg(isHidden ? 'eyeOff' : 'eye');
    btn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
    btn.setAttribute('aria-pressed', String(isHidden));
  });
});

// If already signed in, skip straight to the right dashboard.
(function redirectIfLoggedIn() {
  const user = auth.getUser();
  if (user) {
    window.location.href = user.role === 'admin' ? 'admin.html' : 'dashboard.html';
  }
})();

function showOtpStage(maskedEmail, userId, rememberMe) {
  pendingLogin = { userId, rememberMe };
  otpPrompt.textContent = `We sent a 6-digit code to ${maskedEmail}. Enter it below to finish signing in.`;
  infoBox.textContent = `A verification code was sent to ${maskedEmail}.`;
  infoBox.classList.remove('hidden');
  otpPanel.classList.remove('hidden');
  otpCodeInput.value = '';
  otpCodeInput.focus();
}

async function handleLoginSubmit(role, fields, submitBtn, submitLabel) {
  errorBox.classList.add('hidden');
  infoBox.classList.add('hidden');
  otpPanel.classList.add('hidden');

  const email = fields.email.value.trim();
  const password = fields.password.value;
  const rememberMe = fields.rememberMe.checked;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Checking…';

  try {
    const result = await auth.login(email, password, rememberMe);

    if (result && result.otpRequired) {
      showOtpStage(result.maskedEmail, result.userId, result.rememberMe);
      submitBtn.disabled = false;
      submitBtn.textContent = submitLabel;
      return;
    }

    const user = result;
    const destination = user.role === 'admin' ? 'admin.html' : 'dashboard.html';

    if (user.role !== role) {
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
    submitBtn.textContent = submitLabel;
  }
}

const loginFormDoctor = document.getElementById('loginFormDoctor');
const doctorSubmitBtn = loginFormDoctor.querySelector('.login__submit');
loginFormDoctor.addEventListener('submit', (e) => {
  e.preventDefault();
  handleLoginSubmit(
    'doctor',
    {
      email: document.getElementById('doctorEmail'),
      password: document.getElementById('doctorPassword'),
      rememberMe: document.getElementById('doctorRememberMe'),
    },
    doctorSubmitBtn,
    'Sign in as Doctor'
  );
});

const loginFormAdmin = document.getElementById('loginFormAdmin');
const adminSubmitBtn = loginFormAdmin.querySelector('.login__submit');
loginFormAdmin.addEventListener('submit', (e) => {
  e.preventDefault();
  handleLoginSubmit(
    'admin',
    {
      email: document.getElementById('adminEmail'),
      password: document.getElementById('adminPassword'),
      rememberMe: document.getElementById('adminRememberMe'),
    },
    adminSubmitBtn,
    'Sign in as Admin'
  );
});

otpCodeInput.addEventListener('input', () => {
  otpCodeInput.value = otpCodeInput.value.replace(/\D/g, '').slice(0, 6);
});

otpVerifyBtn.addEventListener('click', async () => {
  if (!pendingLogin) return;

  const code = otpCodeInput.value.trim();
  if (!/^\d{6}$/.test(code)) {
    errorBox.textContent = 'Enter the 6-digit verification code.';
    errorBox.classList.remove('hidden');
    return;
  }

  errorBox.classList.add('hidden');
  otpVerifyBtn.disabled = true;
  otpVerifyBtn.textContent = 'Verifying…';

  try {
    const user = await auth.verifyOtp(pendingLogin.userId, code, pendingLogin.rememberMe);
    const destination = user.role === 'admin' ? 'admin.html' : 'dashboard.html';
    if (user.role !== selectedRole) {
      infoBox.textContent = `This account is registered as ${user.role === 'admin' ? 'an admin' : 'a doctor'}. Redirecting you there now…`;
      infoBox.classList.remove('hidden');
      setTimeout(() => {
        window.location.href = destination;
      }, 1400);
      return;
    }
    window.location.href = destination;
  } catch (err) {
    errorBox.textContent = err.message || 'Verification failed. Please try again.';
    errorBox.classList.remove('hidden');
  } finally {
    otpVerifyBtn.disabled = false;
    otpVerifyBtn.textContent = 'Verify code';
  }
});

otpBackBtn.addEventListener('click', () => {
  pendingLogin = null;
  otpPanel.classList.add('hidden');
  infoBox.classList.add('hidden');
  errorBox.classList.add('hidden');
  otpCodeInput.value = '';
});