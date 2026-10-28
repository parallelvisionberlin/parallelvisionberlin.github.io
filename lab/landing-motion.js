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
  const heroToggle = document.getElementById('hero-motion-toggle');
  let heroPausedByUser = Boolean(navigator.connection?.saveData);
  let heroVisible = true;
  let visibleCard = null;
  const reset = (video) => {
    if (!video) return;
    video.pause();
    video.classList.remove('is-playing');
  };
  const startHero = () => {
    if (!hero) return;
    if (heroToggle) heroToggle.hidden = reduced.matches;
    if (reduced.matches) {
      reset(hero);
      heroSection?.classList.remove('motion-active');
      if (hero.hasAttribute('src')) {
        hero.removeAttribute('src');
        hero.load();
      }
      return;
    }
    if (heroPausedByUser || document.hidden || !heroVisible) {
      hero.pause();
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
    hero.play().catch(() => { updateHeroToggle(); });
  };
  const updateHeroToggle = () => {
    if (!heroToggle || !hero) return;
    const playing = !hero.paused && !hero.ended;
    heroToggle.dataset.state = playing ? 'playing' : 'paused';
    heroToggle.setAttribute('aria-label', playing ? 'Pause background video' : 'Play background video');
  };
  if (hero) {
    // The owner-supplied MP4 contains the approved visible edit followed by
    // an export tail of black frames. Loop only the intended picture.
    const approvedLoopEnd = Number(hero.dataset.loopEnd);
    if (approvedLoopEnd > 0) {
      hero.addEventListener('timeupdate', () => {
        if (hero.currentTime >= approvedLoopEnd) hero.currentTime = 0;
      });
    }
    hero.addEventListener('playing', () => {
      hero.classList.add('is-playing');
      heroSection?.classList.add('motion-active');
      updateHeroToggle();
    });
    hero.addEventListener('pause', updateHeroToggle);
    hero.addEventListener('error', () => {
      hero.classList.remove('is-playing');
      heroSection?.classList.remove('motion-active');
      if (heroToggle) heroToggle.hidden = true;
    });
    hero.addEventListener('stalled', () => {
      if (hero.readyState < 2) {
        hero.classList.remove('is-playing');
        heroSection?.classList.remove('motion-active');
      }
    });
    heroToggle?.addEventListener('click', () => {
      heroPausedByUser = !hero.paused;
      if (heroPausedByUser) hero.pause();
      else startHero();
      updateHeroToggle();
    });
    startHero();
    narrow.addEventListener('change', startHero);
    if (heroSection && typeof IntersectionObserver === 'function') {
      new IntersectionObserver(entries => {
        heroVisible = entries[0].isIntersecting;
        if (heroVisible) startHero();
        else hero.pause();
      }, {threshold:0}).observe(heroSection);
    }
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
    hero?.pause();
    cards.forEach(pauseCard);
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) suspendAll();
    else startHero();
  });
  reduced.addEventListener('change', () => {
    if (reduced.matches) suspendAll();
    startHero();
  });
  hoverDevice.addEventListener('change', () => cards.forEach(pauseCard));
})();
