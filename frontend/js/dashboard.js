const user = auth.requireRole('doctor');
// requireRole already redirects to login.html if not authorized; guard further code.
if (user) {
  const departmentId = user.department && user.department._id;

  document.getElementById('deptName').textContent = (user.department && user.department.name) || 'Department';
  document.getElementById('welcomeTitle').textContent = `Welcome, Dr. ${user.name}`;
  document.getElementById('usersIconSlot').innerHTML = iconSvg('users');
  document.getElementById('clockIconSlot').innerHTML = iconSvg('clock');
  document.getElementById('skipIconSlot').innerHTML = iconSvg('skipForward');
  document.getElementById('arrowIconSlot').innerHTML = iconSvg('arrowRight');
  document.getElementById('historyIconSlot').innerHTML = iconSvg('history');

  const errorBox = document.getElementById('errorBox');
  const nowServingCard = document.getElementById('nowServingCard');
  const callNextBtn = document.getElementById('callNextBtn');
  const waitingList = document.getElementById('waitingList');
  const historyList = document.getElementById('historyList');
  const tabWaiting = document.getElementById('tabWaiting');
  const tabHistory = document.getElementById('tabHistory');
  const queueCount = document.getElementById('queueCount');
  const skipModalOverlay = document.getElementById('skipModalOverlay');
  const skipModalMessage = document.getElementById('skipModalMessage');
  const skipConfirmBtn = document.getElementById('skipConfirmBtn');
  const skipCancelBtn = document.getElementById('skipCancelBtn');
  const soundToggleBtn = document.getElementById('soundToggleBtn');

  let actionLoading = false;
  let skipTarget = null;
  let activeTab = 'waiting';

  // ===== Sound alert (Web Audio API beep — no audio file needed) =====
  let soundEnabled = localStorage.getItem('mq_sound_enabled') !== 'off';
  updateSoundButton();

  function updateSoundButton() {
    soundToggleBtn.textContent = soundEnabled ? '🔔 Sound on' : '🔕 Sound off';
    soundToggleBtn.setAttribute('aria-pressed', String(soundEnabled));
  }

  soundToggleBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    localStorage.setItem('mq_sound_enabled', soundEnabled ? 'on' : 'off');
    updateSoundButton();
  });

  function playBeep() {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.4);
      oscillator.onended = () => ctx.close();
    } catch {
      // Web Audio unsupported / blocked — fail silently, toast still shows.
    }
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
  }
  function clearError() {
    errorBox.classList.add('hidden');
  }

  async function fetchQueue() {
    try {
      const data = await api.get(`/queue/${departmentId}`);
      renderNowServing(data.nowServing);
      renderWaitingList(data.waiting);
    } catch {
      showError('Could not load the queue. Retrying…');
    }
  }

  async function fetchStats() {
    try {
      const data = await api.get(`/queue/${departmentId}/stats`);
      document.getElementById('statServed').textContent = data.servedToday;
      document.getElementById('statAvgWait').textContent =
        data.avgWaitMinutes !== null ? `${data.avgWaitMinutes}m` : '—';
      document.getElementById('statSkipped').textContent = data.skippedToday;
    } catch {
      // Stats are non-critical; fail silently.
    }
  }

  async function fetchHistory() {
    historyList.innerHTML = '<p class="dash__now-empty">Loading…</p>';
    try {
      const data = await api.get(`/queue/${departmentId}/history`);
      renderHistoryList(data.history);
    } catch (err) {
      historyList.innerHTML = '';
      showToast(err.message || 'Could not load patient history.', 'error');
    }
  }

  function renderNowServing(token) {
    if (!token) {
      nowServingCard.innerHTML = '<p class="dash__now-empty">No patient in progress</p>';
      return;
    }
    nowServingCard.innerHTML = `
      <div class="dash__now-card">
        <span class="dash__now-number">${token.tokenNumber}</span>
        <span class="dash__now-name">${token.patientName}</span>
        ${token.priority === 'emergency' ? '<span class="dash__now-flag">Priority</span>' : ''}
      </div>
    `;
  }

  function renderWaitingList(waiting) {
    queueCount.textContent = waiting.length;
    if (waiting.length === 0) {
      waitingList.innerHTML = `
        <li class="empty-state">
          <span class="icon-circle empty-state__icon">${iconSvg('inbox')}</span>
          <p class="empty-state__text">No one is waiting right now.</p>
        </li>
      `;
      return;
    }
    waitingList.innerHTML = '';
    waiting.forEach((t, i) => {
      const li = document.createElement('li');
      li.className = `dash__row ${t.priority === 'emergency' ? 'dash__row--emergency' : ''}`;
      li.innerHTML = `
        <span class="dash__row-position">${i + 1}</span>
        <span class="dash__row-token">${t.tokenNumber}</span>
        <span class="dash__row-name">${t.patientName}</span>
        ${t.symptoms ? `<span class="dash__row-symptoms">${t.symptoms}</span>` : ''}
        ${t.priority === 'emergency' ? '<span class="dash__row-flag">Priority</span>' : ''}
        <button class="dash__row-skip" data-token-id="${t._id}" data-token-name="${t.patientName}" data-token-number="${t.tokenNumber}">
          Skip
        </button>
      `;
      waitingList.appendChild(li);
    });

    waitingList.querySelectorAll('.dash__row-skip').forEach((btn) => {
      btn.addEventListener('click', () => {
        skipTarget = {
          id: btn.dataset.tokenId,
          name: btn.dataset.tokenName,
          number: btn.dataset.tokenNumber,
        };
        skipModalMessage.textContent = `${skipTarget.name} (${skipTarget.number}) will be removed from the waiting queue. This can't be undone from here — they'll need to check in again.`;
        skipModalOverlay.classList.remove('hidden');
      });
    });
  }

  function renderHistoryList(history) {
    if (!history || history.length === 0) {
      historyList.innerHTML = `
        <li class="empty-state">
          <span class="icon-circle empty-state__icon">${iconSvg('history')}</span>
          <p class="empty-state__text">No completed visits yet today.</p>
        </li>
      `;
      return;
    }
    historyList.innerHTML = '';
    history.forEach((t) => {
      const li = document.createElement('li');
      li.className = `dash__row dash__row--history ${t.status === 'skipped' ? 'dash__row--skipped' : ''}`;
      const timeLabel = t.completedAt
        ? new Date(t.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '';
      li.innerHTML = `
        <span class="dash__row-token">${t.tokenNumber}</span>
        <span class="dash__row-name">${t.patientName}</span>
        <span class="dash__row-status dash__row-status--${t.status}">${t.status === 'skipped' ? 'Skipped' : 'Completed'}</span>
        <span class="dash__row-time">${timeLabel}</span>
      `;
      historyList.appendChild(li);
    });
  }

  // ===== Waiting / History tabs =====
  function setActiveTab(tab) {
    activeTab = tab;
    tabWaiting.classList.toggle('is-active', tab === 'waiting');
    tabHistory.classList.toggle('is-active', tab === 'history');
    waitingList.classList.toggle('hidden', tab !== 'waiting');
    historyList.classList.toggle('hidden', tab !== 'history');
    queueCount.classList.toggle('hidden', tab !== 'waiting');
    if (tab === 'history') fetchHistory();
  }

  tabWaiting.addEventListener('click', () => setActiveTab('waiting'));
  tabHistory.addEventListener('click', () => setActiveTab('history'));

  callNextBtn.addEventListener('click', async () => {
    if (actionLoading) return;
    actionLoading = true;
    clearError();
    callNextBtn.disabled = true;
    callNextBtn.textContent = 'Working…';
    try {
      await api.post(`/queue/${departmentId}/call-next`);
      await Promise.all([fetchQueue(), fetchStats()]);
      showToast('Called next patient.', 'success');
    } catch (err) {
      showError(err.message || 'Could not call next patient.');
      showToast(err.message || 'Could not call next patient.', 'error');
    } finally {
      actionLoading = false;
      callNextBtn.disabled = false;
      callNextBtn.innerHTML = `Call next patient <span class="icon-circle">${iconSvg('arrowRight')}</span>`;
    }
  });

  skipCancelBtn.addEventListener('click', () => {
    skipModalOverlay.classList.add('hidden');
    skipTarget = null;
  });

  skipConfirmBtn.addEventListener('click', async () => {
    if (!skipTarget) return;
    try {
      await api.post(`/queue/token/${skipTarget.id}/skip`);
      await Promise.all([fetchQueue(), fetchStats()]);
      showToast(`${skipTarget.name} (${skipTarget.number}) was skipped.`, 'info');
    } catch (err) {
      showError(err.message || 'Could not skip patient.');
      showToast(err.message || 'Could not skip patient.', 'error');
    } finally {
      skipModalOverlay.classList.add('hidden');
      skipTarget = null;
    }
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    auth.logout();
    window.location.href = 'login.html';
  });

  // ===== Real-time updates via Socket.IO =====
  if (departmentId) {
    fetchQueue();
    fetchStats();
    joinDepartment(departmentId);
    getSocket().on('queue:updated', () => {
      fetchQueue();
      fetchStats();
      if (activeTab === 'history') fetchHistory();
    });
    getSocket().on('queue:new-checkin', ({ token }) => {
      playBeep();
      showToast(`New patient checked in — ${token.tokenNumber}.`, 'info');
    });
  }
}
