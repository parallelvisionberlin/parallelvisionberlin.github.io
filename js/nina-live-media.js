// SDK 4.27: streamToVideoElement starts signalling; it does not await playback.
// Measure rendered media independently from speech, text, or billing heartbeats.
export function streamNinaVideoForAttempt(client, elementId, stream, isCurrent) {
  // Readiness may time out while the SDK is still creating its server session.
  // This continuation stays attached even after the caller has stopped waiting,
  // and cleans up that old client as soon as its startup eventually completes.
  return Promise.resolve().then(() => client.streamToVideoElement(elementId, stream)).then(async () => {
    if (!isCurrent()) await client.stopStreaming();
  });
}

export function watchNinaLiveMedia({
  client, events, video, isCurrent = () => true,
  isVisible = () => document.visibilityState === 'visible',
  visibilityTarget = typeof document === 'undefined' ? null : document,
  onFailure = () => {}, record = () => {},
  now = () => performance.now(),
  schedule = (callback, delay) => setInterval(callback, delay),
  cancel = timer => clearInterval(timer),
  startupTimeoutMs = 30000, stallTimeoutMs = 15000, resumeGraceMs = 5000
}) {
  let disposed = false, started = false, failed = false;
  let lastFrameAt = now(), visibleSince = lastFrameAt, wasVisible = isVisible();
  let lastTime = Number(video.currentTime) || 0, frameHandle = null;
  let resumeStartedAt = null, resumeTried = false;
  const createdAt = lastFrameAt, listeners = [], mediaListeners = [];
  let resolveReady, rejectReady, timer = null;
  const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
  // Callers may still be waiting for the SDK's HTTP request when readiness fails.
  ready.catch(() => {});
  const note = (kind, data = {}) => { try { record(kind, data); } catch { /* Optional diagnostics. */ } };
  const error = (code, message) => Object.assign(new Error(message), { code });

  function release() {
    if (disposed) return;
    disposed = true;
    cancel(timer);
    if (frameHandle !== null && typeof video.cancelVideoFrameCallback === 'function') {
      video.cancelVideoFrameCallback(frameHandle);
    }
    frameHandle = null;
    for (const [event, listener] of listeners) client.removeListener(event, listener);
    for (const [event, listener] of mediaListeners) video.removeEventListener(event, listener);
    visibilityTarget?.removeEventListener('visibilitychange', visibilityChanged);
  }

  function fail(problem) {
    if (disposed || failed || !isCurrent()) return;
    failed = true;
    note('media_failure', { code: problem.code, ready: started });
    release();
    if (!started) rejectReady(problem);
    else {
      try { Promise.resolve(onFailure(problem)).catch(() => {}); } catch { /* Cleanup belongs to the caller. */ }
    }
  }

  function on(name, callback) {
    if (!events?.[name]) return;
    const listener = (...args) => { if (!disposed && isCurrent()) callback(...args); };
    client.addListener(events[name], listener);
    listeners.push([events[name], listener]);
  }

  function frame() {
    if (disposed || !isCurrent()) return;
    lastFrameAt = now();
    lastTime = Number(video.currentTime) || 0;
    resumeStartedAt = null;
    resumeTried = false;
    if (typeof video.requestVideoFrameCallback === 'function') {
      frameHandle = video.requestVideoFrameCallback(frame);
    }
  }

  function poll() {
    if (disposed) return;
    if (!isCurrent()) { dispose(); return; }
    const time = now();
    if (!started) {
      if (time - createdAt >= startupTimeoutMs) fail(error('video_start_timeout', 'Nina video did not start.'));
      return;
    }
    const visible = isVisible();
    if (!visible || !wasVisible) {
      // Browsers suspend video frame callbacks in hidden tabs. Give a returning
      // tab a full recovery window rather than counting its hidden time.
      visibleSince = time;
      lastFrameAt = time;
      resumeStartedAt = null;
      resumeTried = false;
    }
    wasVisible = visible;
    if (!visible) return;
    if (typeof video.requestVideoFrameCallback !== 'function') {
      const currentTime = Number(video.currentTime) || 0;
      if (!video.paused && video.readyState >= 2 && currentTime !== lastTime) {
        lastFrameAt = time;
        resumeStartedAt = null;
        resumeTried = false;
      }
      lastTime = currentTime;
    }
    if (time - Math.max(lastFrameAt, visibleSince) < stallTimeoutMs) return;
    if (video.paused && !resumeTried) {
      resumeTried = true;
      resumeStartedAt = time;
      note('video_resume_attempt');
      // Resuming the existing video cannot start a new paid session.
      try { Promise.resolve(video.play()).catch(() => {}); } catch { /* Give the same bounded recovery window. */ }
      return;
    }
    if (resumeStartedAt !== null && time - resumeStartedAt < resumeGraceMs) return;
    fail(error('video_stalled', 'Nina video stopped updating.'));
  }

  function visibilityChanged() {
    if (disposed || !isCurrent()) return;
    // A background tab's timer can be suspended throughout a short visit away.
    // Reset on the actual visibility transition as well as the polling fallback.
    visibleSince = now();
    lastFrameAt = visibleSince;
    wasVisible = isVisible();
    resumeStartedAt = null;
    resumeTried = false;
  }

  on('VIDEO_PLAY_STARTED', () => {
    if (started) return;
    started = true;
    lastFrameAt = now();
    visibleSince = lastFrameAt;
    wasVisible = isVisible();
    note('video_ready');
    resolveReady();
  });
  on('CONNECTION_CLOSED', reason => {
    note('connection_closed', { reason: typeof reason === 'string' ? reason.slice(0, 100) : '' });
    fail(error('connection_closed', 'Nina connection ended.'));
  });
  on('MIC_PERMISSION_DENIED', () => fail(error('microphone_permission_denied', 'Microphone access was denied.')));
  for (const event of ['playing', 'pause', 'waiting', 'stalled', 'error']) {
    const listener = () => {
      if (disposed || !isCurrent()) return;
      note(`video_${event}`, { readyState: video.readyState, paused: Boolean(video.paused) });
      if (event === 'error') fail(error('video_playback_error', 'Nina video could not play.'));
    };
    video.addEventListener(event, listener);
    mediaListeners.push([event, listener]);
  }
  visibilityTarget?.addEventListener('visibilitychange', visibilityChanged);
  timer = schedule(poll, 1000);
  if (typeof video.requestVideoFrameCallback === 'function') frameHandle = video.requestVideoFrameCallback(frame);

  function dispose() {
    if (disposed) return;
    release();
    if (!started) rejectReady(Object.assign(new Error('Nina connection cancelled.'), { name: 'AbortError' }));
  }
  return { ready, dispose };
}
