// ===== State =====
let departments = [];
let selectedDept = null;
let priority = 'normal';
let issuedToken = null;
let statusPollInterval = null;

// ===== Elements =====
const errorBox = document.getElementById('errorBox');
const deptGrid = document.getElementById('deptGrid');
const stepSelectDept = document.getElementById('stepSelectDept');
const stepForm = document.getElementById('stepForm');
const stepTicket = document.getElementById('stepTicket');
const selectedDeptName = document.getElementById('selectedDeptName');
const checkinForm = document.getElementById('checkinForm');
const submitBtn = document.getElementById('submitBtn');
const ticketContainer = document.getElementById('ticketContainer');
const trackLinkContainer = document.getElementById('trackLinkContainer');
const liveStatus = document.getElementById('liveStatus');
const priorityNormalBtn = document.getElementById('priorityNormal');
const priorityEmergencyBtn = document.getElementById('priorityEmergency');

const patientNameInput = document.getElementById('patientName');
const patientAgeInput = document.getElementById('patientAge');
const patientPhoneInput = document.getElementById('patientPhone');
const symptomsInput = document.getElementById('symptoms');

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove('hidden');
}

function clearError() {
  errorBox.classList.add('hidden');
}

function showStep(step) {
  stepSelectDept.classList.add('hidden');
  stepForm.classList.add('hidden');
  stepTicket.classList.add('hidden');
  step.classList.remove('hidden');

  // Auto-focus the first field of whichever step just became visible so
  // kiosk visitors can start typing (or pressing Enter through the form)
  // right away without having to tap into a field first.
  if (step === stepForm) {
    setTimeout(() => patientNameInput.focus(), 50);
  }
}

// ===== Skeleton loading while departments fetch =====
function renderSkeletons() {
  deptGrid.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const card = document.createElement('div');
    card.className = 'kiosk__dept-card';
    card.innerHTML = `
      <span class="skeleton-block skeleton-block--circle"></span>
      <span class="skeleton-block skeleton-block--text"></span>
      <span class="skeleton-block skeleton-block--text-sm"></span>
    `;
    deptGrid.appendChild(card);
  }
}

// ===== Render department cards =====
function renderDepartments() {
  deptGrid.innerHTML = '';
  if (departments.length === 0) {
    deptGrid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <span class="icon-circle empty-state__icon">${iconSvg('inbox')}</span>
        <p class="empty-state__text">No departments are set up yet. Please ask reception for help.</p>
      </div>
    `;
    return;
  }
  departments.forEach((dept) => {
    const iconKey = getDepartmentIconKey(dept.name);
    const card = document.createElement('button');
    card.className = 'kiosk__dept-card';
    card.innerHTML = `
      <span class="icon-circle kiosk__dept-icon">${iconSvg(iconKey)}</span>
      <span class="kiosk__dept-name">${dept.name}</span>
      ${dept.roomNumber ? `<span class="kiosk__dept-room">${dept.roomNumber}</span>` : ''}
    `;
    card.addEventListener('click', () => selectDepartment(dept));
    deptGrid.appendChild(card);
  });
}

function selectDepartment(dept) {
  selectedDept = dept;
  selectedDeptName.textContent = dept.name;
  showStep(stepForm);
}

// ===== Priority toggle =====
priorityNormalBtn.addEventListener('click', () => {
  priority = 'normal';
  priorityNormalBtn.classList.add('is-active');
  priorityEmergencyBtn.classList.remove('is-active');
});

priorityEmergencyBtn.addEventListener('click', () => {
  priority = 'emergency';
  priorityEmergencyBtn.classList.add('is-active');
  priorityNormalBtn.classList.remove('is-active');
});

// ===== Back button =====
document.getElementById('backBtn').addEventListener('click', () => {
  showStep(stepSelectDept);
});

// ===== Inline field validation =====
// Each entry: element, its error-message element, and a validate function
// returning an error string (or '' if valid).
const fieldValidators = [
  {
    input: patientNameInput,
    errorEl: document.getElementById('patientNameError'),
    validate: (v) => {
      if (!v.trim()) return 'Please enter the patient name.';
      if (v.trim().length < 2) return 'Name looks too short.';
      return '';
    },
  },
  {
    input: patientAgeInput,
    errorEl: document.getElementById('patientAgeError'),
    validate: (v) => {
      if (!v) return ''; // optional
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0 || n > 120) return 'Enter a valid age (0–120).';
      return '';
    },
  },
  {
    input: patientPhoneInput,
    errorEl: document.getElementById('patientPhoneError'),
    validate: (v) => {
      if (!v.trim()) return ''; // optional
      const digits = v.replace(/[\s-]/g, '');
      if (!/^\+?\d{7,15}$/.test(digits)) return 'Enter a valid phone number.';
      return '';
    },
  },
];

function validateField(field) {
  const message = field.validate(field.input.value);
  if (message) {
    field.input.classList.add('field-invalid');
    field.errorEl.textContent = message;
    field.errorEl.classList.remove('hidden');
  } else {
    field.input.classList.remove('field-invalid');
    field.errorEl.classList.add('hidden');
  }
  return !message;
}

function validateForm() {
  // Run every validator (not just the first failure) so all problem
  // fields get a red border + message at once, before the request fires.
  let allValid = true;
  fieldValidators.forEach((field) => {
    if (!validateField(field)) allValid = false;
  });
  return allValid;
}

// Validate as the visitor moves on, and clear the error as soon as they
// start fixing it — friendlier than only validating on submit.
fieldValidators.forEach((field) => {
  field.input.addEventListener('blur', () => validateField(field));
  field.input.addEventListener('input', () => {
    if (field.input.classList.contains('field-invalid')) validateField(field);
  });
});

// ===== Auto-focus + Enter-to-next-field keyboard flow =====
const kioskTabOrder = [patientNameInput, patientAgeInput, patientPhoneInput, symptomsInput, submitBtn];

kioskTabOrder.forEach((el, i) => {
  if (el.tagName === 'TEXTAREA') return; // let Enter make a new line in the notes field
  el.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const next = kioskTabOrder[i + 1];
    if (next) {
      next.focus();
    } else {
      checkinForm.requestSubmit();
    }
  });
});

// ===== Check-in submit =====
checkinForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();

  if (!validateForm()) {
    showToast('Please fix the highlighted fields.', 'error');
    return;
  }

  const patientName = patientNameInput.value.trim();

  const payload = {
    departmentId: selectedDept._id,
    patientName,
    patientAge: patientAgeInput.value || undefined,
    patientPhone: patientPhoneInput.value.trim(),
    symptoms: symptomsInput.value.trim(),
    priority,
  };

  submitBtn.disabled = true;
  submitBtn.textContent = 'Getting your token…';

  try {
    const data = await api.post('/queue/checkin', payload);
    issuedToken = data.token;
    renderTicket();
    renderTrackLink();
    showStep(stepTicket);
    startStatusPolling();
    showToast(`Checked in — your token is ${issuedToken.tokenNumber}.`, 'success');
  } catch (err) {
    showError(err.message || 'Check-in failed. Please try again or ask reception for help.');
    showToast(err.message || 'Check-in failed. Please try again.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Get my token';
  }
});

// ===== Ticket rendering (the signature torn-ticket-stub visual) =====
function renderTicket() {
  const isEmergency = issuedToken.priority === 'emergency';
  ticketContainer.innerHTML = `
    <div class="ticket-stub ticket-stub--lg ${isEmergency ? 'ticket-stub--emergency' : ''}">
      <div class="ticket-stub__top">
        <span class="ticket-stub__label">Department</span>
        <span class="ticket-stub__dept">${selectedDept.name}</span>
        ${isEmergency ? '<span class="ticket-stub__flag">Priority</span>' : ''}
      </div>
      <div class="ticket-stub__perforation" aria-hidden="true">
        <span class="ticket-stub__notch ticket-stub__notch--left"></span>
        <span class="ticket-stub__notch ticket-stub__notch--right"></span>
      </div>
      <div class="ticket-stub__bottom">
        <span class="ticket-stub__label">Your token</span>
        <span class="ticket-stub__number">${issuedToken.tokenNumber}</span>
        <span class="ticket-stub__name">${issuedToken.patientName}</span>
      </div>
    </div>
  `;
}

// ===== Phone tracking link (no QR library — just the plain track.html URL,
// carrying the token number, that a visitor can also type in by hand) =====
function renderTrackLink() {
  const url = new URL('track.html', window.location.href);
  url.searchParams.set('token', issuedToken.tokenNumber);
  trackLinkContainer.innerHTML = `
    <p class="track-link">
      ${iconSvg('smartphone')}
      <span>Track on your phone: <a href="${url.toString()}" target="_blank" rel="noreferrer">${url.toString()}</a></span>
    </p>
  `;
}

// ===== Live queue position polling =====
function startStatusPolling() {
  pollTokenStatus();
  statusPollInterval = setInterval(pollTokenStatus, 8000);
}

function stopStatusPolling() {
  if (statusPollInterval) clearInterval(statusPollInterval);
  statusPollInterval = null;
}

async function pollTokenStatus() {
  try {
    const data = await api.get(`/queue/token/${issuedToken._id}`);
    renderLiveStatus(data.token.status, data.position);
  } catch {
    // Silent fail — the ticket itself is still valid.
  }
}

function renderLiveStatus(status, position) {
  liveStatus.classList.remove('hidden');
  if (status === 'waiting' && position) {
    liveStatus.innerHTML =
      position === 1
        ? '<span class="kiosk__live-dot"></span> You\'re next in line'
        : `<span class="kiosk__live-dot"></span> ${position - 1} ${position - 1 === 1 ? 'patient' : 'patients'} ahead of you`;
  } else if (status === 'in-progress') {
    liveStatus.innerHTML = 'Your turn — please proceed to the room now.';
  } else if (status === 'completed') {
    liveStatus.innerHTML = 'Visit marked as completed.';
    stopStatusPolling();
  }
}

// ===== Reset for next patient =====
document.getElementById('newCheckinBtn').addEventListener('click', () => {
  stopStatusPolling();
  selectedDept = null;
  issuedToken = null;
  priority = 'normal';
  priorityNormalBtn.classList.add('is-active');
  priorityEmergencyBtn.classList.remove('is-active');
  checkinForm.reset();
  fieldValidators.forEach((field) => {
    field.input.classList.remove('field-invalid');
    field.errorEl.classList.add('hidden');
  });
  liveStatus.classList.add('hidden');
  trackLinkContainer.innerHTML = '';
  clearError();
  showStep(stepSelectDept);
});

// ===== Init =====
(async function init() {
  renderSkeletons();
  try {
    departments = await api.get('/departments');
    renderDepartments();
  } catch {
    showError('Could not load departments. Please check the connection.');
    showToast('Could not load departments. Please check the connection.', 'error');
    deptGrid.innerHTML = '';
  }
})();
