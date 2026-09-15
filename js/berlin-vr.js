// Native media layers preserve the original video without a WebGL texture copy.
// A cross-origin video is intentional: native XRMediaBinding supports media
// playback without reading pixels, so the R2 bucket needs no CORS changes.
(() => {
  'use strict';
  const video = document.getElementById('vr-film');
  const button = document.getElementById('enter-vr');
  const width = document.getElementById('screen-width');
  const status = document.getElementById('vr-status');
  const details = document.getElementById('film-details');
  let supported = false;
  let starting = false;
  let session = null;
  let layer = null;
  let space = null;
  let recenter = true;
  let lastTime = 0;
  let angle = Number(width.value) * Math.PI / 180;
  let disposed = false;

  const message = text => { status.textContent = text; };
  const refresh = () => {
    button.disabled = starting || (!session && (!supported || !video.videoWidth || Boolean(video.error)));
    button.textContent = session ? 'Exit VR' : starting ? 'Opening VR…' : !supported ? 'Open in Meta Quest' : !video.videoWidth ? 'Loading HD film…' : 'Enter VR';
  };
  const metadata = () => {
    details.textContent = `${video.videoWidth} × ${video.videoHeight} · ${Math.round(video.duration)} seconds · Original HD · 116 MB`;
    refresh();
  };
  video.addEventListener('loadedmetadata', metadata);
  if (video.readyState >= 1) metadata();
  video.addEventListener('error', () => {
    message('The HD film could not load. Check your connection and reload this page.');
    refresh();
    if (session) session.end().catch(() => {});
  });

  function cleanup(ended) {
    if (session !== ended) return;
    session = null;
    layer?.destroy();
    layer = null;
    space = null;
    starting = false;
    lastTime = 0;
    video.pause();
    video.controls = true;
    refresh();
  }

  function togglePlayback() {
    if (video.paused) video.play().catch(() => {
      message('Playback was blocked. Leave VR, press play on the film, then enter VR again.');
      session?.end().catch(() => {});
    });
    else video.pause();
  }

  function onFrame(time, frame) {
    if (frame.session !== session || !layer) return;
    session.requestAnimationFrame(onFrame);
    const pose = frame.getViewerPose(space);
    if (pose && recenter) {
      const { position, orientation: q } = pose.transform;
      // Keep the screen upright while matching the viewer's position and yaw.
      const yaw = Math.atan2(2 * (q.w * q.y + q.x * q.z), 1 - 2 * (q.y * q.y + q.x * q.x));
      layer.transform = new XRRigidTransform(
        { x: position.x, y: position.y, z: position.z },
        { x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) }
      );
      recenter = false;
    }
    const dt = lastTime ? Math.min((time - lastTime) / 1000, .05) : 0;
    lastTime = time;
    for (const input of session.inputSources) {
      if (input.handedness !== 'right' || !input.gamepad) continue;
      const axes = input.gamepad.axes;
      const vertical = axes.length >= 4 ? axes[3] : 0;
      if (Math.abs(vertical) > .25) {
        angle = Math.max(Math.PI / 2, Math.min(5 * Math.PI / 6, angle - vertical * dt * .5));
        layer.centralAngle = angle;
      }
    }
  }

  width.addEventListener('change', () => {
    angle = Number(width.value) * Math.PI / 180;
    if (layer) layer.centralAngle = angle;
  });

  button.addEventListener('click', async () => {
    if (session) { await session.end().catch(() => {}); return; }
    if (!supported || starting || !video.videoWidth) return;
    starting = true;
    refresh();
    let requested = null;
    try {
      // Request the immersive session directly in the click's activation scope.
      const pendingSession = navigator.xr.requestSession('immersive-vr', { requiredFeatures: ['layers'] });
      // Start playback in the same user gesture; attach a rejection handler now.
      const playing = video.play().then(() => null, error => error);
      requested = await pendingSession;
      if (disposed) { await requested.end(); video.pause(); return; }
      session = requested;
      requested.addEventListener('end', () => cleanup(requested), { once: true });
      space = await requested.requestReferenceSpace('local');
      if (session !== requested) return;
      const binding = new XRMediaBinding(requested);
      layer = binding.createCylinderLayer(video, {
        space, layout: 'mono', radius: 3,
        centralAngle: angle, aspectRatio: video.videoWidth / video.videoHeight
      });
      requested.updateRenderState({ layers: [layer] });
      recenter = true;
      video.controls = false;
      requested.addEventListener('select', togglePlayback);
      requested.addEventListener('squeeze', () => { recenter = true; });
      requested.addEventListener('visibilitychange', () => {
        if (requested.visibilityState !== 'visible') video.pause();
      });
      requested.requestAnimationFrame(onFrame);
      message('VR active. Trigger or pinch: play / pause. Grip: recenter. Quest menu: exit.');
      starting = false;
      refresh();
      const playError = await playing;
      if (playError && session === requested) throw playError;
    } catch (error) {
      if (requested && session === requested) {
        await requested.end().catch(() => {});
        cleanup(requested);
      }
      video.pause();
      starting = false;
      refresh();
      message(error.name === 'NotAllowedError'
        ? 'VR permission or playback was declined. Press play, then choose Enter VR to try again.'
        : 'Could not start curved-screen VR. Use an up-to-date Meta Quest browser. The HD film is still available above.');
    }
  });

  window.addEventListener('pagehide', () => {
    disposed = true;
    video.pause();
    session?.end().catch(() => {});
  });
  window.addEventListener('pageshow', () => { disposed = false; });

  async function checkSupport() {
    supported = false;
    try {
      supported = Boolean(window.isSecureContext && navigator.xr && window.XRMediaBinding &&
        await navigator.xr.isSessionSupported('immersive-vr'));
    } catch (_) { /* The regular HD player remains available. */ }
    message(supported
      ? 'Choose your screen width, face forward, then enter VR.'
      : 'For immersive viewing, open this page in your Meta Quest browser. You can watch the HD film here.');
    refresh();
  }
  navigator.xr?.addEventListener('devicechange', checkSupport);
  checkSupport();
})();
