/* PV LAB home reel. Play on explicit interaction only, never generate or upload. */
(() => {
  const video = document.getElementById('pv-showcase-reel');
  const button = document.getElementById('pv-showcase-reel-toggle');
  if (!video || !button) return;

  const sync = () => {
    const playing = !video.paused && !video.ended;
    button.dataset.playing = String(playing);
    button.setAttribute('aria-label', playing ? 'Pause motion example' : 'Play motion example');
    button.setAttribute('aria-pressed', String(playing));
  };

  button.addEventListener('click', () => {
    if (!video.paused) {
      video.pause();
      return;
    }
    if (!video.getAttribute('src')) {
      video.src = video.dataset.src;
      video.load();
    }
    video.play().catch(sync);
  });
  for (const eventName of ['playing', 'pause', 'ended', 'error']) {
    video.addEventListener(eventName, sync);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) video.pause();
  });
  if (typeof IntersectionObserver === 'function') {
    new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) video.pause();
    }, {threshold:0}).observe(video);
  }
  sync();
})();
