// The archive's featured film keeps native controls and the complete frame.
(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = Boolean(navigator.connection?.saveData);

  document.querySelectorAll('video[data-featured-film]').forEach(video => {
    const source = video.querySelector('source');
    if (!source) return;
    if (window.matchMedia('(max-width: 760px)').matches && source.dataset.mobileSrc) {
      source.src = source.dataset.mobileSrc;
      video.load();
    }

    let visible = false;
    let userPaused = false;
    let automaticPause = false;
    const pause = () => {
      if (video.paused) return;
      automaticPause = true;
      video.pause();
    };
    const sync = () => {
      if (!visible || document.hidden || reducedMotion.matches) { pause(); return; }
      if (!saveData && !userPaused) video.play().catch(() => {});
    };
    video.addEventListener('pause', () => {
      if (!automaticPause && visible && !document.hidden) userPaused = true;
      automaticPause = false;
    });
    video.addEventListener('play', () => { userPaused = false; });

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting && entries[0].intersectionRatio >= .2;
        sync();
      }, { threshold: [0, .2] });
      observer.observe(video);
    }
    document.addEventListener('visibilitychange', sync);
    reducedMotion.addEventListener?.('change', sync);
  });

  const applyLanguage = language => {
    document.querySelectorAll('[data-archive-en][data-archive-de]').forEach(element => {
      element.textContent = language === 'de' ? element.dataset.archiveDe : element.dataset.archiveEn;
    });
  };
  applyLanguage(document.documentElement.lang);
  window.addEventListener('pv-language-change', event => applyLanguage(event.detail.language));
})();
