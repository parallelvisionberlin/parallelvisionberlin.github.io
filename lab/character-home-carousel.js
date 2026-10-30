// Character browsing only. No generation, account changes, autoplay or looping.
(() => {
  for (const section of document.querySelectorAll('.lab-character-home')) {
    const track = section.querySelector('.lab-character-home__rail');
    if (!track) continue;
    const prev = section.querySelector('[data-character-nav="prev"]');
    const next = section.querySelector('[data-character-nav="next"]');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const limit = () => Math.max(0, track.scrollWidth - track.clientWidth);
    const clamp = value => Math.max(0, Math.min(limit(), value));
    let frame = 0, gesture = null, suppressClick = false;
    const update = () => {
      if (prev) prev.disabled = track.scrollLeft <= 1;
      if (next) next.disabled = track.scrollLeft >= limit() - 1;
    };
    const stop = () => { cancelAnimationFrame(frame); frame = 0; };
    const coast = velocity => {
      stop();
      if (reducedMotion.matches || Math.abs(velocity) < .08) return;
      let last = performance.now();
      velocity = Math.max(-4.5, Math.min(4.5, velocity * 1.3));
      const tick = now => {
        const dt = Math.min(40, Math.max(1, now - last));
        last = now;
        const before = track.scrollLeft;
        track.scrollLeft = clamp(before + velocity * dt);
        velocity *= Math.exp(-dt / 300);
        update();
        if (Math.abs(velocity) > .03 && Math.abs(track.scrollLeft - before) > .1) frame = requestAnimationFrame(tick);
        else frame = 0;
      };
      frame = requestAnimationFrame(tick);
    };
    const move = direction => {
      stop();
      const card = track.firstElementChild;
      const distance = card ? card.getBoundingClientRect().width + (parseFloat(getComputedStyle(track).gap) || 10) : track.clientWidth;
      track.scrollTo({left: clamp(track.scrollLeft + direction * distance), behavior: reducedMotion.matches ? 'auto' : 'smooth'});
    };
    prev?.addEventListener('click', () => move(-1));
    next?.addEventListener('click', () => move(1));
    section.addEventListener('keydown', event => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') move(event.key === 'ArrowRight' ? 1 : -1);
      else { stop(); track.scrollTo({left: event.key === 'Home' ? 0 : limit(), behavior: reducedMotion.matches ? 'auto' : 'smooth'}); }
    });
    track.addEventListener('pointerdown', event => {
      stop();
      suppressClick = false;
      if (!event.isPrimary || event.button !== 0 || event.target.closest('a,button')) return;
      gesture = {id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, time: performance.now(), velocity: 0, axis: null};
    });
    track.addEventListener('pointermove', event => {
      const g = gesture;
      if (!g || g.id !== event.pointerId) return;
      const dx = event.clientX - g.x, dy = event.clientY - g.y;
      if (!g.axis) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 7) return;
        if (Math.abs(dy) >= Math.abs(dx)) { gesture = null; return; }
        g.axis = 'x';
        track.setPointerCapture(event.pointerId);
        track.setAttribute('data-dragging', '');
        track.focus({preventScroll: true});
      }
      event.preventDefault();
      const now = performance.now(), dt = Math.max(1, now - g.time);
      const before = track.scrollLeft;
      track.scrollLeft = clamp(before - (event.clientX - g.lastX) * 1.15);
      g.velocity = .55 * ((track.scrollLeft - before) / dt) + .45 * g.velocity;
      g.lastX = event.clientX;
      g.time = now;
      update();
    }, {passive: false});
    const release = (event, cancelled = false) => {
      const g = gesture;
      if (!g || g.id !== event.pointerId) return;
      gesture = null;
      track.removeAttribute('data-dragging');
      if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
      if (g.axis === 'x') {
        suppressClick = true;
        if (!cancelled && performance.now() - g.time < 100) coast(g.velocity);
      }
    };
    track.addEventListener('pointerup', event => release(event));
    track.addEventListener('pointercancel', event => release(event, true));
    track.addEventListener('lostpointercapture', event => release(event, true));
    track.addEventListener('click', event => {
      if (suppressClick) { event.preventDefault(); event.stopPropagation(); suppressClick = false; }
    }, true);
    track.addEventListener('dragstart', event => event.preventDefault());
    track.addEventListener('wheel', stop, {passive: true});
    track.addEventListener('scroll', update, {passive: true});
    reducedMotion.addEventListener('change', stop);
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
    if ('ResizeObserver' in window) new ResizeObserver(update).observe(track);
    else window.addEventListener('resize', update, {passive: true});
    update();
  }
})();
