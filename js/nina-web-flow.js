/* Website-only helpers. Importing this module does not start media or touch the app. */
export function isNinaWebsite(pathname) {
  return pathname !== "/nina-app.html";
}

export function createConversationProgress(now = () => Date.now()) {
  let firstUserAt = null;
  let replies = 0;
  let waitingForReply = false;
  let userMessages = 0;
  let blocked = false;
  return {
    observe(messages) {
      for (const message of messages) {
        if (message.role === "user") {
          if (firstUserAt === null) firstUserAt = now();
          userMessages += 1;
          waitingForReply = true;
        } else if (message.role === "persona" && waitingForReply) {
          replies += 1;
          waitingForReply = false;
        }
      }
    },
    fail() { blocked = true; },
    hasSpeech() { return userMessages > 0; },
    qualifies(audible, visible, playing) {
      return !blocked && audible && visible && playing && firstUserAt !== null &&
        now() - firstUserAt >= 60000 && userMessages >= 2 && replies >= 2;
    }
  };
}

export function createAudioCheck({ stage, video, onProblem, isCurrent }) {
  const panel = document.createElement("div");
  panel.className = "nina-web-audio-check";
  panel.hidden = true;
  panel.innerHTML = '<p class="nina-web-check-title">SPEAK TO START</p><p class="nina-web-check-message" role="status" aria-live="polite">Say hello. Your trial starts automatically when Nina receives your voice.</p><div class="nina-web-check-actions"><button type="button" data-nina-enable-sound>Enable sound</button><button type="button" data-nina-audio-help>Audio help</button></div>';
  stage.appendChild(panel);
  const message = panel.querySelector(".nina-web-check-message");
  const enableSound = panel.querySelector("[data-nina-enable-sound]");
  const title = panel.querySelector(".nina-web-check-title");
  let disposed = false;
  let pending = false;
  let active = false;
  // This is browser playback evidence, not proof of the listener's speaker volume.
  // It is used for quality measurement only, never to gate speech activation.
  const playbackReady = () => !disposed && isCurrent() && !video.paused &&
    !video.muted && video.readyState >= 2 && video.volume > 0;
  const render = () => {
    if (disposed || !isCurrent()) return;
    const playing = playbackReady();
    enableSound.hidden = playing;
    title.hidden = active;
    message.hidden = active && playing;
    message.textContent = playing
      ? "Say hello. Your trial starts automatically when Nina receives your voice."
      : "Cannot hear Nina? Enable sound, or open Audio help. Your trial starts when Nina receives your voice.";
  };
  enableSound.addEventListener("click", async () => {
    if (disposed || pending || !isCurrent()) return;
    pending = true;
    enableSound.disabled = true;
    try {
      video.muted = false;
      if (video.volume === 0) video.volume = 1;
      await video.play();
      render();
    } catch {
      if (!disposed && isCurrent()) {
        enableSound.hidden = false;
        message.hidden = false;
        message.textContent = "Sound could not start. Try again or open Audio help.";
      }
    } finally { pending = false; enableSound.disabled = false; }
  });
  panel.querySelector("[data-nina-audio-help]").addEventListener("click", () => {
    if (!disposed && isCurrent()) void onProblem();
  });
  const events = ["playing", "pause", "volumechange", "loadeddata", "emptied"];
  events.forEach(event => video.addEventListener(event, render));
  return {
    show(trialPending) {
      if (disposed) return;
      panel.hidden = false;
      active = !trialPending;
      panel.classList.toggle("is-live", active);
      render();
    },
    active() {
      if (disposed) return;
      active = true;
      panel.hidden = false;
      panel.classList.add("is-live");
      render();
    },
    confirmed: playbackReady,
    dispose() {
      disposed = true;
      events.forEach(event => video.removeEventListener(event, render));
      panel.remove();
    }
  };
}
