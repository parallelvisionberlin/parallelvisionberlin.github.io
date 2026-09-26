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
  let renderer = null;
  let recenter = true;
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
    details.textContent = `${video.videoWidth} × ${video.videoHeight} · ${Math.round(video.duration)} seconds · ${quality.value === 'original' ? 'Full-resolution VR film' : 'Lighter playback · 37 MB'}`;
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
    renderer?.dispose();
    renderer = null;
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
      : './assets/optimized/video/berlin-2063/film-vr-light.mp4';
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
      const pendingSession = navigator.xr.requestSession('immersive-vr');
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

      renderer = createRenderer(video);
      await renderer.gl.makeXRCompatible();
      if (session !== requested) return;
      renderer.upload(); // Fail visibly before VR rendering if pixels cannot be read.
      const projection = new XRWebGLLayer(requested, renderer.gl, { alpha: false, antialias: false });
      requested.updateRenderState({ baseLayer: projection, depthNear: 0.05, depthFar: 100 });
      recenter = true;
      let previousTime = 0;
      let lastReport = 0;
      let frames = 0;
      const onFrame = (time, frame) => {
        if (session !== requested || !renderer) return;
        try {
          const pose = frame.getViewerPose(space);
          if (pose) {
            if (recenter) { renderer.center(pose.transform); recenter = false; }
            const delta = previousTime ? Math.min((time - previousTime) / 1000, 0.1) : 0;
            previousTime = time;
            for (const input of requested.inputSources) {
              if (input.handedness !== 'right' || !input.gamepad) continue;
              const axes = input.gamepad.axes;
              const y = axes.length >= 4 ? axes[3] : 0;
              if (Math.abs(y) > 0.3) angle = Math.max(Math.PI / 2, Math.min(5 * Math.PI / 6, angle - y * delta * 0.6));
            }
            renderer.draw(pose, projection, angle);
            frames++;
            if (time - lastReport > 1000) {
              lastReport = time;
              message(`Curved VR · ${frames} frames rendered · film ${video.currentTime.toFixed(1)}s. Trigger: play / pause. Grip: recenter.`);
            }
          }
          requested.requestAnimationFrame(onFrame);
        } catch (error) {
          console.error('VR frame:', error);
          message(`VR rendering stopped: ${error.message}. Please report this message.`);
          requested.end().catch(() => {});
        }
      };
      requested.addEventListener('squeeze', () => { recenter = true; });
      requested.requestAnimationFrame(onFrame);
      video.controls = false;
      requested.addEventListener('select', togglePlayback);
      requested.addEventListener('visibilitychange', () => {
        if (requested.visibilityState === 'hidden') video.pause();
      });
      message('Starting curved VR renderer…');
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


  // Standard WebGL video texture: no XRMediaBinding or native media layers.
  // Both sources are same-origin, so texImage2D can read the decoded frames.
  function createRenderer(film) {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, xrCompatible: true });
    if (!gl) throw new Error('WebGL is unavailable in this browser.');
    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(info);
      }
      return shader;
    };
    const vs = compile(gl.VERTEX_SHADER, `
      attribute vec3 position;
      attribute vec2 uv;
      uniform mat4 projection;
      uniform mat4 view;
      uniform mat4 model;
      varying vec2 texcoord;
      void main() {
        texcoord = uv;
        gl_Position = projection * view * model * vec4(position, 1.0);
      }`);
    const fs = compile(gl.FRAGMENT_SHADER, `
      precision mediump float;
      varying vec2 texcoord;
      uniform sampler2D film;
      void main() { gl_FragColor = vec4(texture2D(film, texcoord).rgb, 1.0); }`);
    const program = gl.createProgram();
    gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
    gl.deleteShader(vs); gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    const buffer = gl.createBuffer();
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    const loc = name => gl.getUniformLocation(program, name);
    const uniforms = { projection: loc('projection'), view: loc('view'), model: loc('model'), film: loc('film') };
    const position = gl.getAttribLocation(program, 'position');
    const uv = gl.getAttribLocation(program, 'uv');
    const model = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
    let meshAngle = 0;
    let vertices = 0;
    let lastVideoTime = -1;
    function upload() {
      if (film.readyState < 2 || film.currentTime === lastVideoTime) return;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, film);
      const error = gl.getError();
      if (error !== gl.NO_ERROR) throw new Error(`Video texture upload failed (${error}).`);
      lastVideoTime = film.currentTime;
    }
    function geometry(screenAngle) {
      if (screenAngle === meshAngle) return;
      meshAngle = screenAngle;
      const radius = 3;
      const halfHeight = radius * screenAngle / (film.videoWidth / film.videoHeight) / 2;
      const data = [];
      const point = (u, v) => {
        const theta = (u - 0.5) * screenAngle;
        data.push(radius * Math.sin(theta), (v * 2 - 1) * halfHeight, -radius * Math.cos(theta), u, v);
      };
      for (let i = 0; i < 96; i++) {
        const a = i / 96, b = (i + 1) / 96;
        point(a, 0); point(b, 0); point(a, 1);
        point(a, 1); point(b, 0); point(b, 1);
      }
      vertices = data.length / 5;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    }
    return {
      gl, upload,
      center(transform) {
        const m = transform.matrix;
        // Keep the screen level, aligned to the viewer's horizontal heading.
        const yaw = Math.atan2(m[8], m[10]);
        const c = Math.cos(yaw), s = Math.sin(yaw);
        model.set([c,0,-s,0, 0,1,0,0, s,0,c,0, m[12],m[13],m[14],1]);
      },
      draw(pose, projectionLayer, screenAngle) {
        if (gl.isContextLost()) throw new Error('Graphics context was lost. Reload the VR page.');
        upload();
        geometry(screenAngle);
        gl.bindFramebuffer(gl.FRAMEBUFFER, projectionLayer.framebuffer);
        gl.disable(gl.SCISSOR_TEST); gl.disable(gl.CULL_FACE); gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
        gl.clearColor(0.015, 0.015, 0.02, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 20, 0);
        gl.enableVertexAttribArray(uv); gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 20, 12);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(uniforms.film, 0);
        gl.uniformMatrix4fv(uniforms.model, false, model);
        for (const eye of pose.views) {
          const vp = projectionLayer.getViewport(eye);
          gl.viewport(vp.x, vp.y, vp.width, vp.height);
          gl.uniformMatrix4fv(uniforms.projection, false, eye.projectionMatrix);
          gl.uniformMatrix4fv(uniforms.view, false, eye.transform.inverse.matrix);
          gl.drawArrays(gl.TRIANGLES, 0, vertices);
        }
      },
      dispose() {
        gl.deleteTexture(texture); gl.deleteBuffer(buffer); gl.deleteProgram(program);
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      }
    };
  }

  async function checkSupport() {
    supported = false;
    try {
      supported = Boolean(window.isSecureContext && navigator.xr && window.XRWebGLLayer &&
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
