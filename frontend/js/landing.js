/**
 * Landing page only. Two small, self-contained behaviours:
 *  1. Scroll-reveal: fades/slides [data-reveal] elements in once,
 *     the first time they enter the viewport.
 *  2. A cosmetic "next" bump on the sample live-queue preview so it
 *     reads as alive without pretending to be connected to real data.
 * Neither talks to the backend, sockets, or any app state.
 */
(function () {
  var prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  // ---------- Scroll reveal ----------
  var revealEls = document.querySelectorAll('[data-reveal]');
  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) {
      el.classList.add('is-visible');
    });
  } else {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    revealEls.forEach(function (el) {
      observer.observe(el);
    });
  }

  // ---------- Sample live-queue preview tick ----------
  // Purely cosmetic: nudges the sample tokens forward every few seconds
  // so the "Live" board reads as active. Clearly sample data — the
  // caption under the board already says so.
  if (!prefersReducedMotion) {
    var grid = document.getElementById('livePreviewGrid');
    if (grid) {
      var cards = grid.querySelectorAll('.live-board__card:not(.live-board__card--emergency)');
      var pattern = [
        ['B\u2011042', 'B\u2011043'],
        ['B\u2011043', 'B\u2011044'],
        ['B\u2011044', 'B\u2011045'],
      ];
      var deptPatterns = {};

      cards.forEach(function (card, i) {
        var tokenEl = card.querySelector('.live-board__token');
        var nextEl = card.querySelector('.live-board__next');
        if (!tokenEl || !nextEl) return;
        var prefix = tokenEl.textContent.trim().charAt(0);
        var startNum = parseInt(tokenEl.textContent.replace(/\D/g, ''), 10) || 1;
        deptPatterns[i] = { prefix: prefix, num: startNum, el: tokenEl, nextEl: nextEl };
      });

      setInterval(function () {
        Object.keys(deptPatterns).forEach(function (key) {
          var d = deptPatterns[key];
          d.num += 1;
          var padded = String(d.num).padStart(3, '0');
          var nextPadded = String(d.num + 1).padStart(3, '0');
          d.el.textContent = d.prefix + '\u2011' + padded;
          d.nextEl.textContent = 'Next: ' + d.prefix + '\u2011' + nextPadded;
        });
      }, 6000);
    }
  }
})();
