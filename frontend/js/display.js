document.getElementById('buildingIconSlot').innerHTML = iconSvg('building');

// QR code in the corner — generated via a plain image API (no client-side
// QR library needed). It links to the generic tracking page; patients type
// in the token number printed on their ticket once they land there.
(function setupTrackingQr() {
  const trackUrl = new URL('track.html', window.location.href).toString();
  const qrImage = document.getElementById('qrImage');
  qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=8&color=1f3a3d&bgcolor=ffffff&data=${encodeURIComponent(trackUrl)}`;
})();

// ===== Announcement chime =====
// Browsers block audio until a user gesture, so sound starts OFF and the
// staff member taps the speaker icon once to enable it for the shift.
let soundEnabled = false;
let audioCtx = null;
const soundToggle = document.getElementById('soundToggle');

function playChime() {
  if (!soundEnabled) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const now = audioCtx.currentTime;
    [880, 1108].forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = now + i * 0.16;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.22, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(start);
      osc.stop(start + 0.55);
    });
  } catch {
    // Silent fail — chime is a nice-to-have, never blocks the board.
  }
}

soundToggle.innerHTML = iconSvg('volumeOff');
soundToggle.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  if (soundEnabled) {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }
  soundToggle.innerHTML = iconSvg(soundEnabled ? 'volumeOn' : 'volumeOff');
  soundToggle.classList.toggle('is-active', soundEnabled);
  soundToggle.setAttribute('aria-pressed', String(soundEnabled));
});

const boardGrid = document.getElementById('boardGrid');
const clockTime = document.getElementById('clockTime');
const clockDate = document.getElementById('clockDate');

let boards = []; // [{ department, nowServing, waitingCount, waiting }]
let flashDeptId = null;

async function fetchAll() {
  const departments = await api.get('/departments');
  const results = await Promise.all(
    departments.map(async (dept) => {
      const data = await api.get(`/queue/${dept._id}`);
      return {
        department: dept,
        nowServing: data.nowServing,
        waitingCount: data.waitingCount,
        waiting: data.waiting || [],
      };
    })
  );
  boards = results;
  renderBoards();
  // Join every department's socket room once we know which departments exist.
  departments.forEach((dept) => joinDepartment(dept._id));
}

function renderBoards() {
  boardGrid.innerHTML = '';
  boards.forEach(({ department, nowServing, waitingCount, waiting }) => {
    const iconKey = getDepartmentIconKey(department.name);
    const card = document.createElement('div');
    card.className = `board__card ${flashDeptId === department._id ? 'board__card--flash' : ''}`;

    const upNext = waiting.slice(0, 5);
    const needsScroll = upNext.length > 3;
    const upNextHtml = upNext.length
      ? `
        <div class="board__upnext ${needsScroll ? 'board__upnext--scroll' : ''}">
          <div class="board__upnext-track">
            ${upNext
              .map(
                (t) =>
                  `<span class="board__upnext-chip ${t.priority === 'emergency' ? 'board__upnext-chip--emergency' : ''}">${t.tokenNumber}</span>`
              )
              .join('')}
            ${needsScroll ? upNext.map((t) => `<span class="board__upnext-chip ${t.priority === 'emergency' ? 'board__upnext-chip--emergency' : ''}">${t.tokenNumber}</span>`).join('') : ''}
          </div>
        </div>`
      : '';

    card.innerHTML = `
      <div class="board__card-head">
        <span class="icon-circle board__dept-icon">${iconSvg(iconKey)}</span>
        <span class="board__dept-name">${department.name}</span>
        ${department.roomNumber ? `<span class="board__dept-room">${department.roomNumber}</span>` : ''}
      </div>
      <div class="board__now">
        <span class="board__now-ring"></span>
        ${
          nowServing
            ? `<span class="board__number ${nowServing.priority === 'emergency' ? 'board__number--emergency' : ''}">${nowServing.tokenNumber}</span>`
            : '<span class="board__number board__number--idle">—</span><span class="board__idle-label">No patient called yet</span>'
        }
      </div>
      <div class="board__waiting"><span class="board__waiting-count">${waitingCount}</span> waiting</div>
      ${upNextHtml}
    `;
    boardGrid.appendChild(card);
  });
}

function updateClock() {
  const now = new Date();
  clockTime.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  clockDate.textContent = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

// ===== Init =====
fetchAll();
updateClock();
setInterval(fetchAll, 15000); // safety-net poll every 15s
setInterval(updateClock, 1000);

// ===== Real-time updates =====
getSocket().on('queue:updated', () => fetchAll());
getSocket().on('queue:now-serving', ({ token }) => {
  flashDeptId = token.department;
  renderBoards();
  playChime();
  setTimeout(() => {
    flashDeptId = null;
  }, 3000);
});