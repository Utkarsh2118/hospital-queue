document.getElementById('buildingIconSlot').innerHTML = iconSvg('building');

// QR code in the corner — generated via a plain image API (no client-side
// QR library needed). It links to the generic tracking page; patients type
// in the token number printed on their ticket once they land there.
(function setupTrackingQr() {
  const trackUrl = new URL('track.html', window.location.href).toString();
  const qrImage = document.getElementById('qrImage');
  qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=8&color=1f3a3d&bgcolor=ffffff&data=${encodeURIComponent(trackUrl)}`;
})();

const boardGrid = document.getElementById('boardGrid');
const clockTime = document.getElementById('clockTime');
const clockDate = document.getElementById('clockDate');

let boards = []; // [{ department, nowServing, waitingCount }]
let flashDeptId = null;

async function fetchAll() {
  const departments = await api.get('/departments');
  const results = await Promise.all(
    departments.map(async (dept) => {
      const data = await api.get(`/queue/${dept._id}`);
      return { department: dept, nowServing: data.nowServing, waitingCount: data.waitingCount };
    })
  );
  boards = results;
  renderBoards();
  // Join every department's socket room once we know which departments exist.
  departments.forEach((dept) => joinDepartment(dept._id));
}

function renderBoards() {
  boardGrid.innerHTML = '';
  boards.forEach(({ department, nowServing, waitingCount }) => {
    const iconKey = getDepartmentIconKey(department.name);
    const card = document.createElement('div');
    card.className = `board__card ${flashDeptId === department._id ? 'board__card--flash' : ''}`;
    card.innerHTML = `
      <div class="board__card-head">
        <span class="icon-circle board__dept-icon">${iconSvg(iconKey)}</span>
        <span class="board__dept-name">${department.name}</span>
        ${department.roomNumber ? `<span class="board__dept-room">${department.roomNumber}</span>` : ''}
      </div>
      <div class="board__now">
        ${
          nowServing
            ? `<span class="board__number ${nowServing.priority === 'emergency' ? 'board__number--emergency' : ''}">${nowServing.tokenNumber}</span>`
            : '<span class="board__number board__number--idle">—</span>'
        }
      </div>
      <div class="board__waiting">${waitingCount} waiting</div>
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
  setTimeout(() => {
    flashDeptId = null;
  }, 3000);
});
