// ===== Elements =====
const errorBox = document.getElementById('errorBox');
const lookupPanel = document.getElementById('lookupPanel');
const lookupForm = document.getElementById('lookupForm');
const tokenNumberInput = document.getElementById('tokenNumberInput');
const lookupSubmitBtn = document.getElementById('lookupSubmitBtn');
const statusPanel = document.getElementById('statusPanel');
const ticketContainer = document.getElementById('ticketContainer');
const liveStatus = document.getElementById('liveStatus');

let currentToken = null;
let statusPollInterval = null;

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove('hidden');
}

function clearError() {
  errorBox.classList.add('hidden');
}

function showPanel(panel) {
  lookupPanel.classList.add('hidden');
  statusPanel.classList.add('hidden');
  panel.classList.remove('hidden');
}

function renderTicket(token) {
  const isEmergency = token.priority === 'emergency';
  const deptName = (token.department && token.department.name) || '';
  ticketContainer.innerHTML = `
    <div class="card token-card token-card--in ${isEmergency ? 'token-card--emergency' : ''}">
      <div class="token-card__header">
        <span class="badge badge--primary">${deptName}</span>
        ${isEmergency ? '<span class="badge badge--danger">Emergency</span>' : ''}
      </div>
      <div class="token-card__body">
        <span class="token-card__label">Your token</span>
        <span class="token-card__number num">${token.tokenNumber}</span>
        <span class="token-card__name">${token.patientName}</span>
      </div>
    </div>
  `;
}

const TIMELINE_STEPS = [
  { key: 'waiting', label: 'Waiting' },
  { key: 'in-progress', label: 'With doctor' },
  { key: 'completed', label: 'Completed' },
];

function renderTimeline(status) {
  const timeline = document.getElementById('statusTimeline');
  if (!timeline) return;

  if (status === 'skipped') {
    timeline.innerHTML = `
      <div class="track-timeline__alert">
        <span class="badge badge--warning">Skipped</span>
        <span>Please see reception to be re-added to the queue.</span>
      </div>
    `;
    return;
  }

  const currentIndex = TIMELINE_STEPS.findIndex((s) => s.key === status);
  timeline.innerHTML = `
    <ol class="track-timeline__steps">
      ${TIMELINE_STEPS.map((step, i) => {
        let stateClass = '';
        if (i < currentIndex) stateClass = 'is-done';
        else if (i === currentIndex) stateClass = 'is-active';
        return `
          <li class="track-timeline__step ${stateClass}">
            <span class="track-timeline__dot"></span>
            <span class="track-timeline__label">${step.label}</span>
          </li>
        `;
      }).join('')}
    </ol>
  `;
}

const AVG_MINUTES_PER_PATIENT = 6;

function renderLiveStatus(status, position) {
  renderTimeline(status);
  liveStatus.classList.remove('hidden');
  if (status === 'waiting' && position) {
    const ahead = position - 1;
    const etaMinutes = ahead * AVG_MINUTES_PER_PATIENT;
    const etaText = ahead > 0 ? ` · <span class="kiosk__eta">~${etaMinutes} min</span>` : '';
    liveStatus.innerHTML =
      position === 1
        ? `<span class="live-dot"></span> You're next in line${etaText}`
        : `<span class="live-dot"></span> ${ahead} ${ahead === 1 ? 'patient' : 'patients'} ahead of you${etaText}`;
  } else if (status === 'in-progress') {
    liveStatus.innerHTML = '<span class="live-dot"></span> Your turn — please proceed to the room now.';
  } else if (status === 'completed') {
    const feedbackUrl = new URL('feedback.html', window.location.href);
    if (currentToken) feedbackUrl.searchParams.set('token', currentToken.tokenNumber);
    liveStatus.innerHTML = `Visit marked as completed. <a class="kiosk__feedback-link" href="${feedbackUrl.toString()}">Rate your visit →</a>`;
    stopStatusPolling();
  } else if (status === 'skipped') {
    liveStatus.classList.add('hidden');
    stopStatusPolling();
  }
}

function startStatusPolling(tokenNumber) {
  stopStatusPolling();
  pollTokenStatus(tokenNumber);
  statusPollInterval = setInterval(() => pollTokenStatus(tokenNumber), 8000);
}

function stopStatusPolling() {
  if (statusPollInterval) clearInterval(statusPollInterval);
  statusPollInterval = null;
}

async function pollTokenStatus(tokenNumber) {
  try {
    const data = await api.get(`/queue/lookup/${encodeURIComponent(tokenNumber)}`);
    currentToken = data.token;
    renderLiveStatus(data.token.status, data.position);
  } catch {
    // Silent fail on background polls — the last known status stays on screen.
  }
}

async function lookupAndShow(tokenNumber) {
  clearError();
  lookupSubmitBtn.disabled = true;
  lookupSubmitBtn.textContent = 'Checking…';
  try {
    const data = await api.get(`/queue/lookup/${encodeURIComponent(tokenNumber)}`);
    currentToken = data.token;
    renderTicket(data.token);
    renderLiveStatus(data.token.status, data.position);
    showPanel(statusPanel);
    startStatusPolling(tokenNumber);
  } catch (err) {
    showError(err.message || 'Could not find that token. Double-check the number and try again.');
    showToast(err.message || 'Token not found.', 'error');
  } finally {
    lookupSubmitBtn.disabled = false;
    lookupSubmitBtn.textContent = 'Check status';
  }
}

lookupForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const value = tokenNumberInput.value.trim();
  if (!value) return;
  lookupAndShow(value);
});

document.getElementById('lookupAnotherBtn').addEventListener('click', () => {
  stopStatusPolling();
  currentToken = null;
  liveStatus.classList.add('hidden');
  lookupForm.reset();
  clearError();
  showPanel(lookupPanel);
  setTimeout(() => tokenNumberInput.focus(), 50);
});

// ===== Init — if a token number arrived via ?token=, skip straight to it =====
(function init() {
  const params = new URLSearchParams(window.location.search);
  const tokenFromUrl = params.get('token');
  if (tokenFromUrl) {
    tokenNumberInput.value = tokenFromUrl;
    lookupAndShow(tokenFromUrl);
  } else {
    setTimeout(() => tokenNumberInput.focus(), 50);
  }
})();
