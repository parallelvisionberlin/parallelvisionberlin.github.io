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
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const setMotion = active => {
    const playing = active && !reduced.matches;
    motionCard?.classList.toggle('is-previewing', playing);
    toggle?.setAttribute('aria-pressed', String(playing));
    toggle?.setAttribute('aria-label', playing ? 'Pause motion preview' : 'Play motion preview');
  };
  if (toggle && motionCard) {
    toggle.hidden = reduced.matches;
    toggle.addEventListener('click', () => setMotion(toggle.getAttribute('aria-pressed') !== 'true'));
    reduced.addEventListener('change', () => { toggle.hidden = reduced.matches; setMotion(false); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) setMotion(false); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        if (!entries[0].isIntersecting) setMotion(false);
      }).observe(motionCard);
    }
  }
})();
