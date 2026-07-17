/**
 * Requires the Socket.IO client script to be loaded via CDN before this file:
 * <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
 * That script exposes a global `io()` function.
 */
let _socket = null;

function getSocket() {
  if (typeof io !== 'function') {
    return null;
  }
  if (!_socket) {
    _socket = io(CONFIG.SOCKET_URL, { autoConnect: true });
  }
  return _socket;
}

function joinDepartment(departmentId) {
  if (!departmentId) return;
  const socket = getSocket();
  if (socket) socket.emit('join-department', departmentId);
}

function leaveDepartment(departmentId) {
  if (!departmentId) return;
  const socket = getSocket();
  if (socket) socket.emit('leave-department', departmentId);
}
