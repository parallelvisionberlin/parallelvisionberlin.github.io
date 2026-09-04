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

  heroVideo.defaultMuted = true;
  heroVideo.muted = true;
  heroVideo.playsInline = true;

  const attemptPlayback = () => {
    if (!heroVideo.autoplay || reducedMotion || saveData) return;
    heroVideo.play().catch(() => {});
  };

  const loadHeroVideo = () => {
    if (sourceLoaded || !source?.dataset.src || reducedMotion || saveData) return;
    source.src = (window.matchMedia("(max-width: 760px)").matches ? source.dataset.mobileSrc : source.dataset.optimizedSrc) || source.dataset.src;
    sourceLoaded = true;
    heroVideo.addEventListener("canplay", attemptPlayback, { once: true });
    heroVideo.load();
    attemptPlayback();
  };

  const scheduleHeroLoad = () => {
    if (window.innerWidth <= 760) {
      loadHeroVideo();
      return;
    }
    if ("requestIdleCallback" in window) window.requestIdleCallback(loadHeroVideo, { timeout: 1800 });
    else window.setTimeout(loadHeroVideo, 350);
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scheduleHeroLoad, { once: true });
  else scheduleHeroLoad();

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

(function setupMobileHomepageNavigation() {
  const navigation = document.getElementById("homeNavigation");
  const toggle = document.getElementById("homeMobileMenuToggle");
  const links = navigation?.querySelector(".home-primary-links");
  const utilityControls = navigation?.querySelector(".home-utility-controls");
  const languageSlot = document.getElementById("homeMobileLanguageSlot");
  const mobileQuery = window.matchMedia("(max-width: 620px)");
  if (!navigation || !toggle || !links || !utilityControls || !languageSlot) return;

  const closeMenu = () => {
    navigation.classList.remove("is-mobile-menu-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.textContent = "Menu";
    if (mobileQuery.matches) links.hidden = true;
  };

  const syncLanguageControl = () => {
    const languageSwitch = navigation.querySelector(".pv-language-switch");
    if (!languageSwitch) return;
    if (mobileQuery.matches) {
      languageSlot.appendChild(languageSwitch);
      closeMenu();
    }
    else {
      utilityControls.appendChild(languageSwitch);
      links.hidden = false;
      closeMenu();
    }
  };

  toggle.addEventListener("click", () => {
    const open = !navigation.classList.contains("is-mobile-menu-open");
    navigation.classList.toggle("is-mobile-menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.textContent = open ? "Close" : "Menu";
    links.hidden = !open;
  });

  links.addEventListener("click", event => {
    if (event.target.closest("a")) closeMenu();
  });

  navigation.querySelector(".nina-account-toggle")?.addEventListener("click", closeMenu);

  navigation.addEventListener("click", event => {
    if (event.target === navigation) closeMenu();
  });

  document.addEventListener("click", event => {
    if (mobileQuery.matches && !navigation.contains(event.target)) closeMenu();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeMenu();
  });

  mobileQuery.addEventListener("change", syncLanguageControl);
  syncLanguageControl();
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
  document.addEventListener("pv-listening-open", () => {
    soundtrack.pause();
    active = false;
    localStorage.setItem(storageKey, "off");
    render();
  });
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

(function setupListeningSelection() {
  const entries = [...document.querySelectorAll('.listening-track')];
  const status = document.getElementById('soundcloudLoadingStatus');
  const close = entry => {
    entry.open = false;
    const frame = entry.querySelector('iframe');
    if (frame && frame.src !== 'about:blank') frame.src = 'about:blank';
  };
  entries.forEach(entry => {
    const frame = entry.querySelector('iframe[data-soundcloud-src]');
    if (!frame) return;
    entry.querySelector('summary').addEventListener('click', () => {
      if (!entry.open) entries.filter(other => other !== entry).forEach(close);
    });
    entry.addEventListener('toggle', () => {
      if (!entry.open) { close(entry); return; }
      if (frame.src === 'about:blank') frame.src = frame.dataset.soundcloudSrc;
      document.dispatchEvent(new Event('pv-listening-open'));
      if (status) status.textContent = document.documentElement.lang === 'de'
        ? 'SoundCloud-Player geöffnet. Starte die Musik im Player oder öffne SoundCloud.'
        : 'SoundCloud player opened. Press play in the player, or open SoundCloud.';
    });
  });
  window.addEventListener('pagehide', () => entries.forEach(close));
}());
