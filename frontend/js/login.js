const errorBox = document.getElementById('errorBox');
const infoBox = document.getElementById('infoBox');

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

// ===== Shared submit handler for both faces =====
async function handleLoginSubmit(role, fields, submitBtn, submitLabel) {
  errorBox.classList.add('hidden');
  infoBox.classList.add('hidden');

  const email = fields.email.value.trim();
  const password = fields.password.value;
  const rememberMe = fields.rememberMe.checked;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Signing in…';

  try {
    const user = await auth.login(email, password, rememberMe);
    const destination = user.role === 'admin' ? 'admin.html' : 'dashboard.html';

    if (user.role !== role) {
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