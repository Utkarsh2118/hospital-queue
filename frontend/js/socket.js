/**
 * Requires the Socket.IO client script to be loaded via CDN before this file:
 * <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
 * That script exposes a global `io()` function.
 */
let _socket = null;

function getSocket() {
  if (!_socket) {
    _socket = io(CONFIG.SOCKET_URL, { autoConnect: true });
  }
  return _socket;
}

function joinDepartment(departmentId) {
  if (!departmentId) return;
  getSocket().emit('join-department', departmentId);
}

function leaveDepartment(departmentId) {
  if (!departmentId) return;
  getSocket().emit('leave-department', departmentId);
}
