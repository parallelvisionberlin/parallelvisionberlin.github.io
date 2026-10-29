/* PV LAB: full-bleed editorial film, independent from the homepage hero. */
(() => {
  const section = document.getElementById('featured-editorial');
  const video = document.getElementById('pv-editorial-loop');
  if (!section || !video || !video.dataset.src) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = Boolean(navigator.connection && navigator.connection.saveData);
  let nearViewport = false;
  let loaded = false;
  let blocked = false;

  const stop = () => {
    video.pause();
    video.classList.remove('is-playing');
  };
  const shouldPlay = () =>
    nearViewport && !document.hidden && !reducedMotion.matches && !saveData && !blocked;

  const update = () => {
    if (!shouldPlay()) {
      stop();
      return;
    }
    if (!loaded) {
      video.src = video.dataset.src;
      loaded = true;
      video.load();
    }
    const attempt = video.play();
    if (attempt && typeof attempt.then === 'function') {
      attempt.then(() => {
        if (shouldPlay() && !video.paused) {
          video.classList.add('is-playing');
        } else {
          stop();
        }
      }).catch(() => {
        blocked = true;
        stop();
      });
    }
  };

  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.playsInline = true;
  video.addEventListener('playing', () => {
    if (shouldPlay()) video.classList.add('is-playing');
  });
  video.addEventListener('error', () => {
    blocked = true;
    stop();
  });

  const observer = new IntersectionObserver(([entry]) => {
    nearViewport = entry.isIntersecting;
    update();
  }, { rootMargin: '180px 0px', threshold: 0 });
  observer.observe(section);

  document.addEventListener('visibilitychange', update);
  if (typeof reducedMotion.addEventListener === 'function') {
    reducedMotion.addEventListener('change', update);
  } else if (typeof reducedMotion.addListener === 'function') {
    reducedMotion.addListener(update);
  }
})();
