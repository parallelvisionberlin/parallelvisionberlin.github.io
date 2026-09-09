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

export function createAudioCheck({ stage, video, onConfirmed, onProblem, isCurrent }) {
  const panel = document.createElement("div");
  panel.className = "nina-web-audio-check";
  panel.hidden = true;
  panel.innerHTML = '<p class="nina-web-check-title">SIGNAL CHECK</p><p class="nina-web-check-message" role="status" aria-live="polite">When you hear Nina, confirm below, then say hello. Your trial has not started.</p><div class="nina-web-check-actions"><button type="button" data-nina-heard>I can hear Nina</button><button type="button" data-nina-audio-help>Audio help</button></div>';
  stage.appendChild(panel);
  const message = panel.querySelector(".nina-web-check-message");
  const confirm = panel.querySelector("[data-nina-heard]");
  const title = panel.querySelector(".nina-web-check-title");
  let confirmed = false;
  let disposed = false;
  let pending = false;
  confirm.addEventListener("click", async () => {
    if (disposed || pending || !isCurrent()) return;
    pending = true;
    confirm.disabled = true;
    try {
      video.muted = false;
      video.volume = 1;
      await video.play();
      if (disposed || !isCurrent()) return;
      confirmed = true;
      confirm.hidden = true;
      message.textContent = "Say hello. Your trial starts when Nina receives your voice.";
      await onConfirmed();
    } catch {
      if (!disposed && isCurrent()) {
        confirmed = false;
        confirm.hidden = false;
        message.textContent = "Playback did not start. Try again or open Audio help.";
      }
    } finally { pending = false; confirm.disabled = false; }
  });
  panel.querySelector("[data-nina-audio-help]").addEventListener("click", () => {
    if (!disposed && isCurrent()) void onProblem();
  });
  return {
    show(trialPending) {
      if (disposed) return;
      panel.hidden = false;
      if (!trialPending) {
        // No new playback or billing rules for existing paid sessions.
        panel.classList.add("is-live");
        title.hidden = true;
        message.hidden = true;
        confirm.hidden = confirmed;
      }
    },
    active() {
      if (disposed) return;
      panel.hidden = false;
      panel.classList.add("is-live");
      title.hidden = true;
      message.hidden = true;
      confirm.hidden = true;
    },
    confirmed() { return confirmed; },
    dispose() { disposed = true; panel.remove(); }
  };
}
