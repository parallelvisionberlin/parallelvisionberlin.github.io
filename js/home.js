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
