(function keepHomepageHeroPlaying() {
  const heroVideo = document.querySelector("video.hero-video");
  if (!heroVideo) return;

  const isAtEnd = () => Number.isFinite(heroVideo.duration)
    && heroVideo.duration > 0
    && heroVideo.currentTime >= heroVideo.duration - 0.35;

  const restart = () => {
    heroVideo.currentTime = 0;
    heroVideo.play().catch(() => {});
  };

  heroVideo.addEventListener("ended", restart);
  heroVideo.addEventListener("stalled", () => {
    if (isAtEnd()) restart();
  });

  const source = heroVideo.querySelector("source[data-src]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saveData = Boolean(navigator.connection?.saveData);
  let sourceLoaded = false;

  const loadHeroVideo = () => {
    if (sourceLoaded || !source?.dataset.src || reducedMotion || saveData) return;
    source.src = source.dataset.src;
    sourceLoaded = true;
    heroVideo.load();
    heroVideo.play().catch(() => {});
  };

  const scheduleDesktopLoad = () => {
    if (window.innerWidth <= 760) return;
    if ("requestIdleCallback" in window) window.requestIdleCallback(loadHeroVideo, { timeout: 1800 });
    else window.setTimeout(loadHeroVideo, 350);
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scheduleDesktopLoad, { once: true });
  else scheduleDesktopLoad();

  if (window.innerWidth <= 760 && !reducedMotion && !saveData) {
    document.addEventListener("pointerdown", loadHeroVideo, { once: true, passive: true });
    document.addEventListener("keydown", loadHeroVideo, { once: true });
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      heroVideo.pause();
      return;
    }
    if (!heroVideo.autoplay || !sourceLoaded) return;
    if (isAtEnd()) heroVideo.currentTime = 0;
    heroVideo.play().catch(() => {});
  });
}());

(function () {
  const toggle = document.getElementById("audioToggle");
  if (!toggle) return;

  const storageKey = "pvAmbientAudio";
  const soundtrack = new Audio("./assets/alejandromolinari-das-signale.mp3");
  soundtrack.loop = true;
  soundtrack.preload = "metadata";
  soundtrack.volume = 0.55;
  let active = localStorage.getItem(storageKey) === "on";

  function render() {
    const german = document.documentElement.lang === "de";
    toggle.textContent = german
      ? (active ? "Audio An" : "Audio Aus")
      : (active ? "Audio On" : "Audio Off");
    toggle.setAttribute("aria-pressed", String(active));
  }

  async function startAudio() {
    try {
      await soundtrack.play();
      active = true;
      localStorage.setItem(storageKey, "on");
    } catch {
      active = false;
      localStorage.setItem(storageKey, "off");
    }
    render();
  }

  toggle.addEventListener("click", async function () {
    if (soundtrack.paused) {
      await startAudio();
      return;
    }
    soundtrack.pause();
    active = false;
    localStorage.setItem(storageKey, "off");
    render();
  });

  window.addEventListener("pv-language-change", render);
  soundtrack.addEventListener("error", function () {
    active = false;
    localStorage.setItem(storageKey, "off");
    render();
  });

  if (active) {
    document.addEventListener("pointerdown", startAudio, { once: true });
    document.addEventListener("keydown", startAudio, { once: true });
  }

  render();
}());

(function deferSoundCloud() {
  const frames = [...document.querySelectorAll('iframe[data-soundcloud-src]')];
  const status = document.getElementById('soundcloudLoadingStatus');
  let loadAnnounced = false;
  const load = frame => {
    if (!frame.src || frame.src === 'about:blank') {
      frame.src = frame.dataset.soundcloudSrc;
      if (status && !loadAnnounced) {
        status.textContent = 'SoundCloud player loading. Audio will not start automatically.';
        loadAnnounced = true;
      }
    }
  };
  if (!('IntersectionObserver' in window)) { frames.forEach(load); return; }
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { load(entry.target); observer.unobserve(entry.target); }
  }), { rootMargin: '300px 0px' });
  frames.forEach(frame => observer.observe(frame));
}());
