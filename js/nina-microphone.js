// App-only microphone ownership and local input metering. No recording, gain boost or network calls.
export function speechConstraints(deviceId = '', supported = {}) {
  const audio = {};
  if (deviceId) audio.deviceId = { exact: deviceId };
  for (const key of ['echoCancellation', 'noiseSuppression', 'autoGainControl']) {
    if (supported[key]) audio[key] = { ideal: true };
  }
  // Leave sample rate/channel layout to the selected route, including Bluetooth.
  return { audio: Object.keys(audio).length ? audio : true, video: false };
}

export function inputLevel(samples) {
  let energy = 0, peak = 0;
  for (const sample of samples) {
    const value = Number.isFinite(sample) ? sample : 0;
    energy += value * value;
    peak = Math.max(peak, Math.abs(value));
  }
  const rms = Math.sqrt(energy / Math.max(1, samples.length));
  return { db: Math.max(-90, 20 * Math.log10(Math.max(rms, 1e-9))), peak };
}

const cancelled = () => Object.assign(new Error('Microphone request cancelled.'), { name: 'AbortError' });

export function createAppMicrophone({ mediaDevices, AudioContextClass, onReading = () => {}, onState = () => {}, onInterrupted = () => {}, muteTimeoutMs = 5000 }) {
  let stream = null, pending = null, sequence = 0, selected = '';
  let context = null, source = null, analyser = null, interval = null, muteTimer = null;
  let cleanup = () => {}, interrupted = false;
  let bestDb = -90, highestPeak = 0, frames = 0;
  const stopTracks = value => value?.getTracks().forEach(track => track.stop());
  function stopMeter() {
    clearInterval(interval); interval = null;
    try { source?.disconnect(); analyser?.disconnect(); } catch { /* Already disconnected. */ }
    source = null; analyser = null;
    const previous = context; context = null;
    if (previous && previous.state !== 'closed') void previous.close().catch(() => {});
  }
  function detach() {
    clearTimeout(muteTimer); muteTimer = null; cleanup(); cleanup = () => {};
  }
  function stop() {
    sequence += 1; pending = null; detach(); stopMeter();
    stopTracks(stream); stream = null; selected = ''; interrupted = false;
  }
  function prepareMeter() {
    if (!AudioContextClass) return false;
    try {
      if (!context || context.state === 'closed') context = new AudioContextClass();
      void context.resume().catch(() => {});
      return true;
    } catch { return false; }
  }
  function watch(value) {
    const track = value.getAudioTracks()[0];
    const end = () => {
      if (stream !== value || interrupted) return;
      interrupted = true; onState('disconnected'); onInterrupted();
    };
    const mute = () => {
      if (stream !== value) return;
      onState('interrupted'); clearTimeout(muteTimer);
      muteTimer = setTimeout(() => { if (track.muted) end(); }, muteTimeoutMs);
    };
    const unmute = () => {
      clearTimeout(muteTimer); muteTimer = null;
      if (stream === value && !interrupted) onState('active');
    };
    track.addEventListener?.('ended', end);
    track.addEventListener?.('mute', mute);
    track.addEventListener?.('unmute', unmute);
    cleanup = () => {
      track.removeEventListener?.('ended', end);
      track.removeEventListener?.('mute', mute);
      track.removeEventListener?.('unmute', unmute);
    };
    if (track.muted) mute();
  }
  async function acquire(deviceId = '') {
    if (!mediaDevices?.getUserMedia) throw new Error('Microphone capture is not available.');
    if (stream?.getAudioTracks().some(track => track.readyState === 'live' && track.enabled) && deviceId === selected) return stream;
    if (pending?.deviceId === deviceId) return pending.promise;
    const epoch = ++sequence;
    const promise = (async () => {
      const supported = mediaDevices.getSupportedConstraints?.() || {};
      let value, actualSelection = deviceId;
      try { value = await mediaDevices.getUserMedia(speechConstraints(deviceId, supported)); }
      catch (error) {
        if (epoch !== sequence) throw cancelled();
        // A missing saved route may fall back. Denied permission must not prompt again.
        if (!deviceId || !['NotFoundError', 'OverconstrainedError'].includes(error?.name)) throw error;
        actualSelection = '';
        value = await mediaDevices.getUserMedia(speechConstraints('', supported));
      }
      if (epoch !== sequence) { stopTracks(value); throw cancelled(); }
      const track = value.getAudioTracks()[0];
      if (!track || track.readyState !== 'live' || !track.enabled) {
        stopTracks(value); throw new Error('No active microphone was returned.');
      }
      detach(); stopTracks(stream); stream = value; selected = actualSelection; interrupted = false;
      watch(value); onState('active');
      return value;
    })();
    pending = { deviceId, promise };
    try { return await promise; }
    finally { if (epoch === sequence) pending = null; }
  }
  function startMeter() {
    const track = stream?.getAudioTracks()[0];
    if (!track || !prepareMeter()) return false;
    try {
      source = context.createMediaStreamSource(stream);
      analyser = context.createAnalyser(); analyser.fftSize = 1024;
      source.connect(analyser); // Intentionally NOT connected to speakers or to a new output stream.
      const samples = new Float32Array(analyser.fftSize);
      bestDb = -90; highestPeak = 0; frames = 0;
      clearInterval(interval);
      interval = setInterval(() => {
        if (!analyser || !context || context.state !== 'running') return;
        analyser.getFloatTimeDomainData(samples);
        const level = inputLevel(samples);
        bestDb = Math.max(bestDb, level.db); highestPeak = Math.max(highestPeak, level.peak); frames += 1;
        onReading({ ...level, bestDb, highestPeak, frames });
      }, 100);
      return true;
    } catch { stopMeter(); return false; }
  }
  function report() {
    const track = stream?.getAudioTracks()[0];
    const settings = track?.getSettings?.() || {};
    return {
      label: track?.label || 'System default microphone',
      deviceId: settings.deviceId || '', selected,
      state: track?.readyState || 'ended', muted: track?.muted === true,
      settings: Object.fromEntries(['echoCancellation', 'noiseSuppression', 'autoGainControl'].map(key => [key, typeof settings[key] === 'boolean' ? settings[key] : null])),
      bestDb, highestPeak, frames
    };
  }
  return { acquire, stop, prepareMeter, startMeter, stopMeter, report, getStream: () => stream };
}
