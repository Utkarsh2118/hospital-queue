// ===== Elements =====
const errorBox = document.getElementById('errorBox');
const lookupPanel = document.getElementById('lookupPanel');
const lookupForm = document.getElementById('lookupForm');
const tokenNumberInput = document.getElementById('tokenNumberInput');
const lookupSubmitBtn = document.getElementById('lookupSubmitBtn');
const notReadyPanel = document.getElementById('notReadyPanel');
const notReadyMessage = document.getElementById('notReadyMessage');
const notReadyBackBtn = document.getElementById('notReadyBackBtn');
const ratingPanel = document.getElementById('ratingPanel');
const ratingDeptName = document.getElementById('ratingDeptName');
const ratingPatientName = document.getElementById('ratingPatientName');
const ratingForm = document.getElementById('ratingForm');
const starRating = document.getElementById('starRating');
const starRatingLabel = document.getElementById('starRatingLabel');
const feedbackComment = document.getElementById('feedbackComment');
const submitRatingBtn = document.getElementById('submitRatingBtn');
const thanksPanel = document.getElementById('thanksPanel');

document.getElementById('thanksIconSlot').innerHTML = iconSvg('checkCircle');

const RATING_LABELS = { 1: 'Not great', 2: 'Could be better', 3: 'Okay', 4: 'Good', 5: 'Excellent' };

let currentTokenNumber = null;
let selectedRating = 0;

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove('hidden');
}

function clearError() {
  errorBox.classList.add('hidden');
}

function showPanel(panel) {
  [lookupPanel, notReadyPanel, ratingPanel, thanksPanel].forEach((p) => p.classList.add('hidden'));
  panel.classList.remove('hidden');
}

// ===== Build the 5-star selector =====
for (let i = 1; i <= 5; i++) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'star-rating__star';
  btn.dataset.value = String(i);
  btn.innerHTML = iconSvg('star');
  btn.setAttribute('aria-label', `${i} star${i > 1 ? 's' : ''}`);
  btn.addEventListener('click', () => setRating(i));
  btn.addEventListener('mouseenter', () => paintStars(i));
  btn.addEventListener('mouseleave', () => paintStars(selectedRating));
  starRating.appendChild(btn);
}

function paintStars(count) {
  [...starRating.children].forEach((star, idx) => {
    star.classList.toggle('is-filled', idx < count);
  });
}

function setRating(value) {
  selectedRating = value;
  paintStars(value);
  starRatingLabel.textContent = RATING_LABELS[value] || '';
  submitRatingBtn.disabled = false;
}

// ===== Lookup a token, decide which panel to show =====
async function lookupAndShow(tokenNumber) {
  clearError();
  lookupSubmitBtn.disabled = true;
  lookupSubmitBtn.textContent = 'Checking…';
  try {
    const data = await api.get(`/queue/lookup/${encodeURIComponent(tokenNumber)}`);
    const token = data.token;
    currentTokenNumber = token.tokenNumber;

    if (token.status !== 'completed') {
      notReadyMessage.textContent =
        token.status === 'waiting' || token.status === 'in-progress'
          ? "This visit isn't marked complete yet — feedback opens right after your consultation."
          : 'Feedback isn\'t available for this token.';
      showPanel(notReadyPanel);
      return;
    }

    ratingDeptName.textContent = (token.department && token.department.name) || 'your department';
    ratingPatientName.textContent = token.patientName;
    selectedRating = 0;
    paintStars(0);
    starRatingLabel.textContent = 'Tap a star to rate';
    submitRatingBtn.disabled = true;
    feedbackComment.value = '';
    showPanel(ratingPanel);
  } catch (err) {
    showError(err.message || 'Could not find that token. Double-check the number and try again.');
    showPanel(lookupPanel);
  } finally {
    lookupSubmitBtn.disabled = false;
    lookupSubmitBtn.textContent = 'Find my visit';
  }
}

lookupForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const value = tokenNumberInput.value.trim();
  if (!value) return;
  lookupAndShow(value);
});

notReadyBackBtn.addEventListener('click', () => {
  clearError();
  lookupForm.reset();
  showPanel(lookupPanel);
  setTimeout(() => tokenNumberInput.focus(), 50);
});

ratingForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!selectedRating || !currentTokenNumber) return;
  clearError();
  submitRatingBtn.disabled = true;
  submitRatingBtn.textContent = 'Submitting…';
  try {
    await api.post('/feedback', {
      tokenNumber: currentTokenNumber,
      rating: selectedRating,
      comment: feedbackComment.value.trim(),
    });
    showPanel(thanksPanel);
    showToast('Thanks for your feedback!', 'success');
  } catch (err) {
    showError(err.message || 'Could not submit feedback. Please try again.');
    showToast(err.message || 'Could not submit feedback.', 'error');
  } finally {
    submitRatingBtn.disabled = false;
    submitRatingBtn.textContent = 'Submit feedback';
  }
});

// ===== Init — if a token number arrived via ?token=, skip straight to it =====
(function init() {
  const params = new URLSearchParams(window.location.search);
  const tokenFromUrl = params.get('token');
  if (tokenFromUrl) {
    tokenNumberInput.value = tokenFromUrl;
    lookupAndShow(tokenFromUrl);
  } else {
    showPanel(lookupPanel);
    setTimeout(() => tokenNumberInput.focus(), 50);
  }
})();
