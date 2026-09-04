// Decorative file videos only. Live Nina streams are never selected here.
(() => {
  const videos = [...document.querySelectorAll('video[data-perf-video]')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = Boolean(navigator.connection?.saveData);
  const nearby = new Set();
  const play = video => {
    if (document.hidden || reducedMotion.matches || saveData || !nearby.has(video)) return;
    if (video.dataset.loaded !== 'true') {
      const source = video.querySelector('source[data-src]');
      if (!source) return;
      source.src = (window.matchMedia('(max-width: 760px)').matches
        ? source.dataset.mobileSrc : source.dataset.optimizedSrc) || source.dataset.src;
      video.dataset.loaded = 'true';
      video.load();
    }
    video.play().catch(() => {});
  };
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        nearby.add(entry.target);
        play(entry.target);
      } else {
        nearby.delete(entry.target);
        entry.target.pause();
      }
    }), { rootMargin: '150px 0px', threshold: .01 });
    videos.forEach(video => observer.observe(video));
  } else {
    videos.forEach(video => { nearby.add(video); play(video); });
  }
  const sync = () => videos.forEach(video => {
    if (document.hidden || reducedMotion.matches) video.pause();
    else play(video);
  });
  document.addEventListener('visibilitychange', sync);
  reducedMotion.addEventListener?.('change', sync);
})();
