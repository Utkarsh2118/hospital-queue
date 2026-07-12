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
    <div class="ticket-stub ticket-stub--lg ticket-print-in ${isEmergency ? 'ticket-stub--emergency' : ''}">
      <div class="ticket-stub__top">
        <span class="ticket-stub__label">Department</span>
        <span class="ticket-stub__dept">${deptName}</span>
        ${isEmergency ? '<span class="ticket-stub__flag">Priority</span>' : ''}
      </div>
      <div class="ticket-stub__perforation" aria-hidden="true">
        <span class="ticket-stub__notch ticket-stub__notch--left"></span>
        <span class="ticket-stub__notch ticket-stub__notch--right"></span>
      </div>
      <div class="ticket-stub__bottom">
        <span class="ticket-stub__label">Your token</span>
        <span class="ticket-stub__number">${token.tokenNumber}</span>
        <span class="ticket-stub__name">${token.patientName}</span>
      </div>
    </div>
  `;
}

const AVG_MINUTES_PER_PATIENT = 6;

function renderLiveStatus(status, position) {
  liveStatus.classList.remove('hidden');
  if (status === 'waiting' && position) {
    const ahead = position - 1;
    const etaMinutes = ahead * AVG_MINUTES_PER_PATIENT;
    const etaText = ahead > 0 ? ` · <span class="kiosk__eta">~${etaMinutes} min</span>` : '';
    liveStatus.innerHTML =
      position === 1
        ? `<span class="kiosk__live-dot"></span> You're next in line${etaText}`
        : `<span class="kiosk__live-dot"></span> ${ahead} ${ahead === 1 ? 'patient' : 'patients'} ahead of you${etaText}`;
  } else if (status === 'in-progress') {
    liveStatus.innerHTML = 'Your turn — please proceed to the room now.';
  } else if (status === 'completed') {
    const feedbackUrl = new URL('feedback.html', window.location.href);
    if (currentToken) feedbackUrl.searchParams.set('token', currentToken.tokenNumber);
    liveStatus.innerHTML = `Visit marked as completed. <a class="kiosk__feedback-link" href="${feedbackUrl.toString()}">Rate your visit →</a>`;
    stopStatusPolling();
  } else if (status === 'skipped') {
    liveStatus.innerHTML = 'This token was skipped. Please see reception.';
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
