/**
 * Landing page only. Small, self-contained cosmetic behaviours —
 * none talk to the backend, sockets, or any app state:
 *  1. Scroll-reveal: fades/slides [data-reveal] elements in once,
 *     the first time they enter the viewport.
 *  2. Live queue board: wraps the sample cards into a looping
 *     conveyor track.
 *  3. Hero mockup: idle float, a flip-digit "now serving" token,
 *     and a ticking "served today" stat.
 * All of the above are skipped entirely under prefers-reduced-motion.
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

  // ---------- Live queue board: conveyor ----------
  // Purely cosmetic: wraps the sample cards in a track, duplicates them
  // once, and lets CSS scroll it in an infinite loop. Still clearly
  // sample data — the caption under the board already says so. Falls
  // back to the plain static grid with no JS or reduced motion.
  if (!prefersReducedMotion) {
    var grid = document.getElementById('livePreviewGrid');
    if (grid) {
      var track = document.createElement('div');
      track.className = 'live-board__track';
      var originalCards = Array.prototype.slice.call(grid.children);
      originalCards.forEach(function (card) {
        track.appendChild(card);
      });
      originalCards.forEach(function (card) {
        var clone = card.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        track.appendChild(clone);
      });
      grid.appendChild(track);
      grid.classList.add('is-conveyor');
    }
  }

  // ---------- Hero mockup: float, flip token, tick stat ----------
  // Purely cosmetic, same honesty bar as above: this is a labelled
  // static mockup, just one that reads as alive instead of frozen.
  if (!prefersReducedMotion) {
    var mockup = document.querySelector('.mockup');
    if (mockup) {
      mockup.classList.add('is-floating');

      // Flip the "now serving" token through a short, believable sequence.
      var nowTokenEl = mockup.querySelector('.mockup__now-token');
      if (nowTokenEl) {
        var sequence = ['B\u2011042', 'B\u2011043', 'B\u2011044', 'B\u2011045'];
        var seqIndex = 0;
        var chars = nowTokenEl.textContent.trim().split('').map(function (ch) {
          var span = document.createElement('span');
          span.className = 'flip-char';
          span.textContent = ch;
          return span;
        });
        nowTokenEl.textContent = '';
        chars.forEach(function (span) {
          nowTokenEl.appendChild(span);
        });

        setInterval(function () {
          seqIndex = (seqIndex + 1) % sequence.length;
          var nextChars = sequence[seqIndex].split('');
          chars.forEach(function (span, i) {
            setTimeout(function () {
              span.classList.add('is-flipping');
              setTimeout(function () {
                span.textContent = nextChars[i] || '';
                span.classList.remove('is-flipping');
              }, 140);
            }, i * 60);
          });
        }, 3800);
      }

      // Tick the "served today" stat upward every so often.
      var servedEl = mockup.querySelector('.mockup__stat-value');
      if (servedEl) {
        var served = parseInt(servedEl.textContent, 10);
        if (!isNaN(served)) {
          setInterval(function () {
            served += 1;
            servedEl.textContent = served;
            servedEl.classList.add('is-ticking');
            setTimeout(function () {
              servedEl.classList.remove('is-ticking');
            }, 400);
          }, 5200);
        }
      }
    }
  }
})();