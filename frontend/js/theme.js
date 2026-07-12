// ===== Shared theme (dark/light) + large-text accessibility toggle =====
// Loaded on every page via <script src="js/theme.js">. Applies saved
// preferences immediately (before paint) and wires up the util-bar buttons
// once the DOM is ready.

const SUN_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2.5M12 19v2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12h2.5M19 12h2.5M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8"/></svg>';
const MOON_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"/></svg>';

(function applySavedPreferences() {
  const savedTheme = localStorage.getItem('mq-theme');
  if (savedTheme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');

  const savedTextScale = localStorage.getItem('mq-text-scale');
  if (savedTextScale === 'large') document.documentElement.style.setProperty('--text-scale', '1.2');
})();

function initUtilBar() {
  const themeBtn = document.getElementById('themeToggle');
  const textBtn = document.getElementById('textSizeToggle');
  if (!themeBtn && !textBtn) return;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (themeBtn) {
    themeBtn.innerHTML = isDark ? SUN_ICON : MOON_ICON;
    themeBtn.setAttribute('aria-pressed', String(isDark));
    themeBtn.addEventListener('click', () => {
      const nowDark = document.documentElement.getAttribute('data-theme') !== 'dark';
      if (nowDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('mq-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('mq-theme', 'light');
      }
      themeBtn.innerHTML = nowDark ? SUN_ICON : MOON_ICON;
      themeBtn.setAttribute('aria-pressed', String(nowDark));
    });
  }

  if (textBtn) {
    const isLarge = localStorage.getItem('mq-text-scale') === 'large';
    textBtn.classList.toggle('is-active', isLarge);
    textBtn.setAttribute('aria-pressed', String(isLarge));
    textBtn.addEventListener('click', () => {
      const nowLarge = !textBtn.classList.contains('is-active');
      document.documentElement.style.setProperty('--text-scale', nowLarge ? '1.2' : '1');
      localStorage.setItem('mq-text-scale', nowLarge ? 'large' : 'normal');
      textBtn.classList.toggle('is-active', nowLarge);
      textBtn.setAttribute('aria-pressed', String(nowLarge));
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUtilBar);
} else {
  initUtilBar();
}
