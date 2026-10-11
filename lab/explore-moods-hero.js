// Five seconds at rest, followed by a one-second dissolve. No image regeneration.
const hero = document.querySelector('[data-hero-carousel]');
if (hero) {
  const slides = [
    ['dreamcore-train', 'Dreamcore Train', '65%'],
    ['90s-cinema', '90s Cinema', '70%'],
    ['pool-memory', 'Pool Memory', '66%'],
    ['white-suit', 'White Suit Editorial', '72%'],
    ['three-moods', 'Three Moods', '66%'],
  ];
  const art = hero.querySelector('.mc-explore-hero-art');
  const controls = hero.querySelector('.mc-hero-controls');
  const toggle = controls.querySelector('.mc-hero-toggle');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0;
  let active = art.querySelector('img');
  let paused = reduced.matches;
  let visible = true;
  let busy = false;
  let timer;
  const cache = new Map();
  const allowed = () => !paused && visible && !document.hidden;

  function load(index) {
    if (!cache.has(index)) {
      const img = new Image();
      img.alt = '';
      img.decoding = 'async';
      img.style.setProperty('--hero-position', slides[index][2]);
      img.src = `/lab/mood-previews/hero/${slides[index][0]}.webp`;
      cache.set(index, img.decode().then(() => img).catch(() => {
        cache.delete(index);
        return null;
      }));
    }
    return cache.get(index);
  }

  function schedule() {
    clearTimeout(timer);
    if (allowed() && !busy) timer = setTimeout(() => advance(), 5000);
  }

  function updateControls() {
    const label = `${paused ? 'Play' : 'Pause'} hero slideshow`;
    toggle.classList.toggle('is-paused', paused);
    toggle.setAttribute('aria-label', label);
    toggle.setAttribute('title', label);
    hero.dataset.heroSlide = slides[current][0];
  }

  async function advance() {
    if (busy) return;
    clearTimeout(timer);
    busy = true;
    const index = (current + 1) % slides.length;
    const incoming = await load(index);
    if (incoming && allowed()) {
      // Keep the outgoing image fully opaque underneath to avoid a dark flash.
      art.append(incoming);
      if (!reduced.matches) {
        await incoming.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 1000, easing: 'ease-in-out',
        }).finished;
      }
      active.remove();
      active = incoming;
      current = index;
      updateControls();
      load((current + 1) % slides.length);
    }
    busy = false;
    schedule();
  }

  toggle.addEventListener('click', () => {
    paused = !paused;
    updateControls();
    schedule();
  });
  reduced.addEventListener('change', () => {
    paused = reduced.matches;
    updateControls();
    schedule();
  });
  document.addEventListener('visibilitychange', schedule);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    schedule();
  }).observe(hero);
  controls.hidden = false;
  updateControls();
  // Wait for the first photograph before starting its display time.
  active.decode().catch(() => {}).then(() => {
    load(1);
    schedule();
  });
}
