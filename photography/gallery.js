(() => {
  'use strict';
  const archive = window.AM_ARCHIVE;
  if (!archive || !Array.isArray(archive.galleries)) return;
  const galleries = archive.galleries;
  const indexEl = document.getElementById('series-index');
  const listEl = document.getElementById('series-list');
  const year = document.getElementById('copyright-year');
  if (!indexEl || !listEl) return;
  if (year) year.textContent = new Date().getFullYear();

  const pad = n => String(n).padStart(2, '0');
  const states = [];
  const cache = new Map();
  const preload = src => {
    if (!src || cache.has(src)) return;
    const image = new Image();
    image.src = src;
    cache.set(src, image);
  };

  const arrowSvg = dir => dir < 0
    ? '<svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><path d="M19 12H5m7-7-7 7 7 7"/></svg>'
    : '<svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>';

  function render(state) {
    const { entry, img, counter, caption, markers, previous, next, narrative } = state;
    const photos = entry.images || [];
    if (!photos.length) return;
    state.photo = (state.photo + photos.length) % photos.length;
    const current = photos[state.photo];
    state.ticket += 1;
    const ticket = state.ticket;
    img.classList.add('is-loading');
    img.onerror = () => {
      if (ticket === state.ticket) {
        img.classList.remove('is-loading');
        narrative.textContent = 'The photograph could not be loaded.';
      }
    };
    img.onload = () => {
      if (ticket === state.ticket) img.classList.remove('is-loading');
    };
    img.src = current.src;
    img.alt = current.alt || current.caption || entry.title;
    caption.textContent = current.caption || `${entry.title} ${pad(state.photo + 1)}`;
    counter.textContent = `${pad(state.photo + 1)} / ${pad(photos.length)}`;
    narrative.textContent = `Photograph ${state.photo + 1} of ${photos.length} in ${entry.title}. ${img.alt}`;
    for (const [i, mark] of [...markers.children].entries()) {
      mark.setAttribute('aria-current', String(i === state.photo));
    }
    previous.disabled = photos.length <= 1;
    next.disabled = photos.length <= 1;
    preload(photos[(state.photo + 1) % photos.length]?.src);
    if (photos.length > 2) preload(photos[(state.photo + photos.length - 1) % photos.length]?.src);
  }

  function move(state, delta) {
    if ((state.entry.images || []).length < 2) return;
    state.photo += delta;
    render(state);
  }

  function makeGallery(entry, index) {
    const photos = entry.images || [];
    const link = document.createElement('a');
    link.className = 'series-index-row';
    link.href = `#series-${entry.id}`;
    link.innerHTML = '<span class="series-index-number"></span><span class="series-index-title"></span><span class="series-index-count"></span>';
    link.children[0].textContent = pad(index + 1);
    link.children[1].textContent = entry.title;
    link.children[2].textContent = `${pad(photos.length)} photograph${photos.length === 1 ? '' : 's'}`;
    indexEl.appendChild(link);

    const section = document.createElement('section');
    section.className = 'gallery-section';
    section.id = `series-${entry.id}`;
    section.setAttribute('aria-label', entry.title);
    section.innerHTML = `
      <div class="gallery-heading">
        <div class="gallery-title-stack"><p class="gallery-overline"></p><h3></h3></div>
        <p class="gallery-meta"></p>
      </div>
      <div class="gallery-wrap">
        <button class="gallery-arrow arrow-previous" type="button" aria-label="Previous photograph"></button>
        <figure class="photograph" tabindex="0" aria-label="Photographs in ${entry.title}">
          <img alt="" draggable="false" decoding="async">
          <figcaption class="sr-only"></figcaption>
        </figure>
        <button class="gallery-arrow arrow-next" type="button" aria-label="Next photograph"></button>
      </div>
      <div class="gallery-under">
        <p class="photo-caption"></p>
        <div class="gallery-navigation"><span class="counter" aria-live="polite" aria-atomic="true"></span><div class="film-marks" aria-label="Photograph selection"></div><span class="navigation-hint">← → / Swipe</span></div>
      </div>`;
    section.querySelector('.gallery-overline').textContent = `Series ${pad(index + 1)} / ${entry.subtitle || 'Photography'}`;
    section.querySelector('h3').textContent = entry.title;
    section.querySelector('.gallery-meta').textContent = `${pad(photos.length)} photograph${photos.length === 1 ? '' : 's'}`;
    listEl.appendChild(section);

    const stage = section.querySelector('.photograph');
    const state = {
      entry, index, root: section, stage, photo: 0, ticket: 0,
      img: section.querySelector('img'),
      caption: section.querySelector('.photo-caption'),
      counter: section.querySelector('.counter'),
      markers: section.querySelector('.film-marks'),
      previous: section.querySelector('.arrow-previous'),
      next: section.querySelector('.arrow-next'),
      narrative: section.querySelector('figcaption'), touchX: null, touchY: null
    };
    state.previous.innerHTML = arrowSvg(-1);
    state.next.innerHTML = arrowSvg(1);
    state.previous.addEventListener('click', () => move(state, -1));
    state.next.addEventListener('click', () => move(state, 1));
    state.stage.addEventListener('touchstart', e => {
      if (e.touches.length === 1) {
        state.touchX = e.touches[0].clientX;
        state.touchY = e.touches[0].clientY;
      }
    }, { passive: true });
    state.stage.addEventListener('touchend', e => {
      if (state.touchX === null || e.changedTouches.length !== 1) return;
      const dx = e.changedTouches[0].clientX - state.touchX;
      const dy = e.changedTouches[0].clientY - state.touchY;
      state.touchX = null;
      state.touchY = null;
      if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy) * 1.3) move(state, dx < 0 ? 1 : -1);
    }, { passive: true });
    // On iOS Safari a quick second tap can trigger browser smart-zoom on
    // the image even though the gallery does not implement any zoom.
    // Only cancel the second tap inside a photograph; preserve page zoom,
    // vertical scrolling, and ordinary taps everywhere else.
    let previousTapTime = 0;
    let previousTapX = 0;
    let previousTapY = 0;
    let tapStartX = null;
    let tapStartY = null;
    state.stage.addEventListener('touchstart', e => {
      if (e.touches.length !== 1) { tapStartX = null; return; }
      tapStartX = e.touches[0].clientX;
      tapStartY = e.touches[0].clientY;
    }, { passive: true });
    state.stage.addEventListener('touchend', e => {
      if (e.changedTouches.length !== 1 || e.touches.length || tapStartX === null) return;
      const t = e.changedTouches[0];
      const wasTap = Math.hypot(t.clientX - tapStartX, t.clientY - tapStartY) < 12;
      tapStartX = null;
      if (!wasTap) { previousTapTime = 0; return; }
      const now = e.timeStamp;
      const isDoubleTap = now - previousTapTime > 0 &&
        now - previousTapTime < 340 &&
        Math.hypot(t.clientX - previousTapX, t.clientY - previousTapY) < 32;
      previousTapTime = now;
      previousTapX = t.clientX;
      previousTapY = t.clientY;
      if (isDoubleTap && e.cancelable) {
        e.preventDefault();
        previousTapTime = 0;
      }
    }, { passive: false });
    state.stage.addEventListener('dblclick', e => e.preventDefault());
    photos.forEach((photo, i) => {
      const mark = document.createElement('button');
      mark.type = 'button';
      mark.setAttribute('aria-label', `Photograph ${i + 1} of ${photos.length} in ${entry.title}`);
      mark.addEventListener('click', () => { state.photo = i; render(state); });
      state.markers.appendChild(mark);
    });
    state.img.loading = index === 0 ? 'eager' : 'lazy';
    if (index === 0) state.img.fetchPriority = 'high';
    states.push(state);
    render(state);
  }

  galleries.forEach(makeGallery);

  function closestGallery() {
    if (!states.length) return null;
    const mid = window.innerHeight * .5;
    return states.reduce((nearest, current) => {
      const currentRect = current.stage.getBoundingClientRect();
      const oldRect = nearest.stage.getBoundingClientRect();
      const distance = rect => mid < rect.top ? rect.top - mid : mid > rect.bottom ? mid - rect.bottom : 0;
      return distance(currentRect) < distance(oldRect) ? current : nearest;
    }, states[0]);
  }
  document.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.target?.closest?.('input,textarea,select,a,button,[contenteditable]')) return;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const state = closestGallery();
    if (!state) return;
    e.preventDefault();
    move(state, e.key === 'ArrowRight' ? 1 : -1);
  });

  // The previous /photo-work/ page used hashes such as #nocturne.
  function restoreDeepLink() {
    const fragment = decodeURIComponent(window.location.hash.slice(1));
    const key = fragment.replace(/^series-/, '');
    const selected = states.find(s => s.entry.id === key);
    if (selected) selected.root.scrollIntoView({ behavior: 'instant', block: 'start' });
  }
  if (window.location.hash) requestAnimationFrame(restoreDeepLink);
})();
