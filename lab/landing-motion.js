/* PV Lab motion library.
   The user-facing still artwork persists if an asset is unavailable.
   Videos only load when the viewer can see or requests them. */
(() => {
  const hero = document.getElementById('pv-hero-motion');
  const heroSection = document.querySelector('.lab-hero');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = window.matchMedia('(max-width: 700px)');
  const hoverDevice = window.matchMedia('(hover: hover) and (pointer: fine)');
  const cards = Array.from(document.querySelectorAll('.tool-card'));
  let visibleCard = null;
  const reset = (video) => {
    if (!video) return;
    video.pause();
    video.classList.remove('is-playing');
  };
  const startHero = () => {
    if (!hero) return;
    if (reduced.matches) {
      reset(hero);
      heroSection?.classList.remove('motion-active');
      hero.removeAttribute('src');
      hero.load();
      return;
    }
    const next = narrow.matches ? hero.dataset.mobileSrc : hero.dataset.desktopSrc;
    if (!next) return;
    if (hero.getAttribute('src') !== next) {
      hero.classList.remove('is-playing');
      heroSection?.classList.remove('motion-active');
      hero.setAttribute('src', next);
      hero.load();
    }
    hero.play().catch(() => {/* keep the poster visible */});
  };
  if (hero) {
    hero.addEventListener('playing', () => {
      hero.classList.add('is-playing');
      heroSection?.classList.add('motion-active');
    });
    hero.addEventListener('error', () => {
      hero.classList.remove('is-playing');
      heroSection?.classList.remove('motion-active');
    });
    hero.addEventListener('stalled', () => {
      if (hero.readyState < 2) {
        hero.classList.remove('is-playing');
        heroSection?.classList.remove('motion-active');
      }
    });
    startHero();
    narrow.addEventListener('change', startHero);
  }
  const playCard = (card) => {
    if (!card || reduced.matches) return;
    const video = card.querySelector('.tool-motion');
    if (!video) return;
    if (visibleCard && visibleCard !== card) reset(visibleCard.querySelector('.tool-motion'));
    visibleCard = card;
    if (!video.getAttribute('src') && video.dataset.src) {
      video.setAttribute('src', video.dataset.src);
      video.load();
    }
    video.play().catch(() => {/* keep original static card */});
  };
  const pauseCard = (card) => {
    if (!card) return;
    reset(card.querySelector('.tool-motion'));
    if (visibleCard === card) visibleCard = null;
  };
  cards.forEach(card => {
    const video = card.querySelector('.tool-motion');
    if (!video) return;
    video.addEventListener('playing', () => video.classList.add('is-playing'));
    video.addEventListener('error', () => video.classList.remove('is-playing'));
    card.addEventListener('pointerenter', () => { if (hoverDevice.matches) playCard(card); });
    card.addEventListener('pointerleave', () => { if (hoverDevice.matches) pauseCard(card); });
    card.addEventListener('focusin', () => playCard(card));
    card.addEventListener('focusout', e => { if (!card.contains(e.relatedTarget)) pauseCard(card); });
  });
  const observer = typeof IntersectionObserver === 'function'
    ? new IntersectionObserver(entries => {
        if (hoverDevice.matches || reduced.matches) return;
        for (const entry of entries) {
          if (entry.intersectionRatio >= 0.68) playCard(entry.target);
          else if (!entry.isIntersecting || entry.intersectionRatio < 0.22) pauseCard(entry.target);
        }
      }, {threshold:[0,0.22,0.68]})
    : null;
  cards.forEach(card => observer?.observe(card));
  const suspendAll = () => {
    reset(hero);
    heroSection?.classList.remove('motion-active');
    cards.forEach(pauseCard);
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) suspendAll();
    else startHero();
  });
  reduced.addEventListener('change', () => {
    if (reduced.matches) suspendAll();
    else startHero();
  });
  hoverDevice.addEventListener('change', () => cards.forEach(pauseCard));
})();
