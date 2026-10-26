/* Isolated controls for Flesh Zero. No dependencies, tracking, or auto-play. */
(() => {
  'use strict';

  const collections = [];
  let engaged = null;
  const pad = number => String(number).padStart(2, '0');

  for (const root of document.querySelectorAll('[data-fz-carousel]')) {
    const track = root.querySelector('[data-fz-track]');
    const slides = [...root.querySelectorAll('[data-fz-slide]')];
    const count = root.closest('.fz-gallery-block')?.querySelector('[data-fz-current]');
    const viewport = root.querySelector('.fz-carousel-viewport');
    const previous = root.querySelector('[data-fz-prev]');
    const next = root.querySelector('[data-fz-next]');
    if (!track || !viewport || !slides.length || !previous || !next) continue;

    let index = 0;
    const show = nextIndex => {
      const previousIndex = index;
      index = (nextIndex + slides.length) % slides.length;
      // Wrap directly, without sweeping across the intervening photographs.
      const wrapCut = root.closest('.finest-page') && Math.abs(index - previousIndex) > 1;
      if (wrapCut) track.style.transition = 'none';
      track.style.transform = `translate3d(-${index * 100}%,0,0)`;
      if (wrapCut) {
        void track.offsetWidth;
        track.style.transition = '';
      }
      slides.forEach((slide, slideIndex) => {
        slide.setAttribute('aria-hidden', String(slideIndex !== index));
      });
      if (count) count.textContent = pad(index + 1);
    };
    const collection = { root, show, step: direction => show(index + direction) };
    collections.push(collection);

    previous.addEventListener('click', () => {
      engaged = collection;
      collection.step(-1);
    });
    next.addEventListener('click', () => {
      engaged = collection;
      collection.step(1);
    });
    root.addEventListener('mouseenter', () => { engaged = collection; });
    root.addEventListener('focusin', () => { engaged = collection; });

    // Do not prevent vertical scrolling. Swipe only when horizontal intent is clear.
    let swipeStart = null;
    viewport.addEventListener('touchstart', event => {
      const touch = event.touches[0];
      if (touch) swipeStart = { x: touch.clientX, y: touch.clientY };
    }, { passive: true });
    viewport.addEventListener('touchend', event => {
      if (!swipeStart) return;
      const touch = event.changedTouches[0];
      const deltaX = touch ? touch.clientX - swipeStart.x : 0;
      const deltaY = touch ? touch.clientY - swipeStart.y : 0;
      swipeStart = null;
      if (Math.abs(deltaX) < 45 || Math.abs(deltaX) < Math.abs(deltaY) * 1.3) return;
      engaged = collection;
      collection.step(deltaX < 0 ? 1 : -1);
    }, { passive: true });
    viewport.addEventListener('touchcancel', () => { swipeStart = null; }, { passive: true });

    show(0);
    root.classList.add('is-ready');
  }

  // The focused carousel wins. Otherwise arrows control the gallery in view.
  document.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target;
    if (target instanceof Element && target.closest('input, textarea, select, video, audio, [contenteditable="true"]')) return;
    const viewportHeight = window.innerHeight;
    const visible = collections.filter(({ root }) => {
      const bounds = root.getBoundingClientRect();
      const visibleHeight = Math.max(0, Math.min(bounds.bottom, viewportHeight) - Math.max(bounds.top, 0));
      return visibleHeight > Math.min(bounds.height, viewportHeight) * .25;
    });
    if (!visible.length) return;
    const focused = visible.find(({ root }) => root.contains(document.activeElement));
    const nearest = [...visible].sort((a, b) => {
      const distance = item => Math.abs((item.root.getBoundingClientRect().top + item.root.getBoundingClientRect().bottom) / 2 - viewportHeight / 2);
      return distance(a) - distance(b);
    })[0];
    const active = focused || (visible.includes(engaged) ? engaged : nearest);
    if (!active) return;
    event.preventDefault();
    active.step(event.key === 'ArrowRight' ? 1 : -1);
  });

  const video = document.getElementById('flesh-zero-film');
  const playButton = document.querySelector('[data-fz-film-play]');
  const filmStatus = document.querySelector('[data-fz-film-status]');
  if (video && playButton) {
    playButton.hidden = false;
    playButton.addEventListener('click', async () => {
      playButton.disabled = true;
      if (filmStatus) filmStatus.textContent = '';
      try {
        await video.play();
        playButton.hidden = true;
      } catch {
        if (filmStatus) filmStatus.textContent = 'The film could not start. Try using the video controls.';
      } finally {
        playButton.disabled = false;
      }
    });
    video.addEventListener('playing', () => { playButton.hidden = true; });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && !video.paused) video.pause();
    });
  }
})();
