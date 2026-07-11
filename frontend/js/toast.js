/**
 * Small toast/notification utility. No dependency — one floating stack
 * bottom-right, auto-dismisses. Call showToast(message, type) from any
 * page; the container is created lazily on first use.
 *
 * type: 'success' | 'error' | 'info'  (default 'info')
 */
let _toastContainer = null;

function _getToastContainer() {
  if (!_toastContainer) {
    _toastContainer = document.createElement('div');
    _toastContainer.className = 'toast-stack';
    _toastContainer.setAttribute('aria-live', 'polite');
    document.body.appendChild(_toastContainer);
  }
  return _toastContainer;
}

function showToast(message, type = 'info', duration = 4000) {
  const container = _getToastContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;

  const iconKey = type === 'success' ? 'checkCircle' : type === 'error' ? 'xCircle' : 'activity';
  toast.innerHTML = `
    <span class="toast__icon">${iconSvg(iconKey)}</span>
    <span class="toast__message"></span>
    <button class="toast__close" aria-label="Dismiss">&times;</button>
  `;
  toast.querySelector('.toast__message').textContent = message;

  const remove = () => {
    toast.classList.add('toast--leaving');
    setTimeout(() => toast.remove(), 180);
  };

  toast.querySelector('.toast__close').addEventListener('click', remove);
  container.appendChild(toast);

  if (duration > 0) {
    setTimeout(remove, duration);
  }
}
