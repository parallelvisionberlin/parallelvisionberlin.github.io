// Native media layers preserve the original video without a WebGL texture copy.
// A cross-origin video is intentional: native XRMediaBinding supports media
// playback without reading pixels, so the R2 bucket needs no CORS changes.
(() => {
  'use strict';
  const video = document.getElementById('vr-film');
  const button = document.getElementById('enter-vr');
  const width = document.getElementById('screen-width');
  const quality = document.getElementById('film-quality');
  const originalSource = video.querySelector('source').src;
  const status = document.getElementById('vr-status');
  const details = document.getElementById('film-details');
  let supported = false;
  let starting = false;
  let session = null;
  let layer = null;
  let space = null;
  let angle = Number(width.value) * Math.PI / 180;
  let disposed = false;

  const message = text => { status.textContent = text; };
  const refresh = () => {
    quality.disabled = starting || Boolean(session);
    button.disabled = starting || (!session && (!supported || !video.videoWidth || Boolean(video.error)));
    button.textContent = session ? 'Exit VR' : starting ? 'Opening VR…' : !supported ? 'Open in Meta Quest' : !video.videoWidth ? 'Loading HD film…' : 'Enter VR';
  };
  const metadata = () => {
    details.textContent = `${video.videoWidth} × ${video.videoHeight} · ${Math.round(video.duration)} seconds · ${quality.value === 'original' ? 'Original HD · 116 MB' : 'Lighter playback · 37 MB'}`;
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

  quality.addEventListener('change', () => {
    if (session || starting) return;
    video.pause();
    video.src = quality.value === 'original' ? originalSource
      : 'https://pub-21c1e54026ca4574b09d269b385e2fca.r2.dev/hyper-future-berlin-desktop.mp4';
    video.load();
    details.textContent = 'Loading film…';
    message('Press play to check the picture, then enter VR.');
    refresh();
  });

  width.addEventListener('change', () => {
    angle = Number(width.value) * Math.PI / 180;
  });

  button.addEventListener('click', async () => {
    if (session) { await session.end().catch(() => {}); return; }
    if (!supported || starting || !video.videoWidth) return;
    starting = true;
    refresh();
    let requested = null;
    let startupTimer;
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
      // A metadata event does not guarantee a decoded video frame.
      const playError = await Promise.race([
        playing,
        new Promise(resolve => { startupTimer = setTimeout(() => resolve(new Error('Video playback timed out.')), 20000); })
      ]);
      clearTimeout(startupTimer);
      if (session !== requested) return;
      if (playError) throw playError;
      if (video.readyState < 2) throw new Error('No decoded video frame is available.');

      // Use the native Quest media compositor directly.
      // No WebGL projection layer is needed for a video-only XR experience.
      // A full-eye projection layer can obscure the media layer with black.
      const binding = new XRMediaBinding(requested);
      const viewerSpace = await requested.requestReferenceSpace('viewer');
      const aspect = video.videoWidth / video.videoHeight;
      const widthMeters = angle >= 2.5 ? 4.8 : angle >= 2 ? 4.0 : 3.2;
      layer = binding.createQuadLayer(video, {
        space: viewerSpace,
        layout: 'mono',
        width: widthMeters,
        height: widthMeters / aspect,
        transform: new XRRigidTransform({ x: 0, y: 0, z: -3 })
      });
      requested.updateRenderState({ layers: [layer] });
      video.controls = false;
      requested.addEventListener('select', togglePlayback);
      requested.addEventListener('visibilitychange', () => {
        if (requested.visibilityState === 'hidden') video.pause();
      });
      message('VR active. Trigger or pinch: play / pause. Quest menu: exit.');
      starting = false;
      refresh();

    } catch (error) {
      clearTimeout(startupTimer);
      console.error('Parallel Vision VR:', error);
      if (requested && session === requested) {
        await requested.end().catch(() => {});
        cleanup(requested);
      }
      video.pause();
      starting = false;
      refresh();
      message(error.name === 'NotAllowedError'
        ? 'VR permission or playback was declined. Press play, then choose Enter VR to try again.'
        : `Could not start curved-screen VR (${error.name || 'Error'}: ${error.message || 'Unknown error'}). Try the lighter playback option, then enter VR again.`);
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
