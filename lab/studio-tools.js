/* Small, local previews. The primary links always open the selected Studio tool. */
(() => {
  const section = document.getElementById('tools');
  if (!section) return;
  const detail = section.querySelector('[data-detail-zoom]');
  const output = section.querySelector('[data-detail-value]');
  const detailCard = section.querySelector('.studio-tool--upscale');
  if (detail && detailCard) {
    const updateDetail = () => {
      const value = Number(detail.value);
      const scale = 1 + value / 125;
      detailCard.style.setProperty('--detail-scale', String(scale));
      detailCard.style.setProperty('--detail-position', `${4 + value * .92}%`);
      const label = `${scale.toFixed(1)}× detail`;
      if (output) output.value = label;
      detail.setAttribute('aria-valuetext', `${scale.toFixed(1)} times magnification`);
    };
    detail.addEventListener('input', updateDetail);
    updateDetail();
  }
  const toggle = section.querySelector('.studio-motion-toggle');
  const motionCard = section.querySelector('.studio-tool--video');
  const video = motionCard?.querySelector('.studio-tool-video');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const setPlaying = playing => {
    motionCard?.classList.toggle('is-previewing', playing);
    toggle?.setAttribute('aria-pressed', String(playing));
    toggle?.setAttribute('aria-label', playing ? 'Pause motion preview' : 'Play motion preview');
  };
  if (toggle && motionCard && video) {
    let visible = false;
    let userPaused = false;
    let failed = false;
    const pause = () => { video.pause(); setPlaying(false); };
    const play = () => {
      if (reduced.matches || document.hidden || failed) return;
      if (!video.getAttribute('src')) {
        video.src = video.dataset.src;
        video.load();
      }
      video.muted = true;
      video.play().catch(() => setPlaying(false));
    };
    const sync = () => {
      if (visible && !userPaused && !navigator.connection?.saveData && !reduced.matches && !document.hidden) play();
      else pause();
    };
    toggle.hidden = reduced.matches;
    video.addEventListener('loadeddata', () => video.classList.add('is-ready'));
    video.addEventListener('playing', () => setPlaying(true));
    video.addEventListener('pause', () => setPlaying(false));
    video.addEventListener('error', () => {
      failed = true;
      video.classList.remove('is-ready');
      toggle.hidden = true;
      pause();
    });
    toggle.addEventListener('click', () => {
      userPaused = !video.paused;
      if (userPaused) pause();
      else play();
    });
    reduced.addEventListener('change', () => { toggle.hidden = reduced.matches || failed; sync(); });
    document.addEventListener('visibilitychange', sync);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting && entries[0].intersectionRatio >= .2;
        sync();
      }, { threshold: [0, .2] }).observe(motionCard);
    } else { visible = true; sync(); }
  }
})();

