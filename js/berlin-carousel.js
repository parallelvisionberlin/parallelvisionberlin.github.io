(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const viewer = document.querySelector('[data-image-viewer]');
  let activeGallery = null;
  let viewerIndex = 0;
  let returnFocus = null;
  const renderViewer = () => {
    if (!viewer || !activeGallery) return;
    const slide = activeGallery.slides[viewerIndex];
    const source = slide.querySelector('img');
    const image = viewer.querySelector('[data-viewer-image]');
    image.src = source.currentSrc || source.src;
    image.alt = source.alt;
    viewer.querySelector('[data-viewer-title]').textContent = activeGallery.title.textContent;
    viewer.querySelector('[data-viewer-caption]').textContent = slide.querySelector('figcaption').textContent;
    viewer.querySelector('[data-viewer-count]').textContent = `${String(viewerIndex + 1).padStart(2, '0')} / ${String(activeGallery.slides.length).padStart(2, '0')}`;
    viewer.querySelector('[data-viewer-prev]').disabled = viewerIndex === 0;
    viewer.querySelector('[data-viewer-next]').disabled = viewerIndex === activeGallery.slides.length - 1;
    const german = document.documentElement.lang === 'de';
    viewer.setAttribute('aria-label', german ? 'Bildansicht' : 'Image viewer');
    viewer.querySelector('[data-viewer-prev]').setAttribute('aria-label', german ? 'Vorheriges Bild' : 'Previous image');
    viewer.querySelector('[data-viewer-next]').setAttribute('aria-label', german ? 'Nächstes Bild' : 'Next image');
  };
  const moveViewer = delta => {
    if (!activeGallery) return;
    viewerIndex = Math.max(0, Math.min(activeGallery.slides.length - 1, viewerIndex + delta));
    activeGallery.go(viewerIndex, 'auto');
    renderViewer();
  };
  if (viewer) {
    viewer.querySelector('[data-viewer-close]').addEventListener('click', () => viewer.close());
    viewer.querySelector('[data-viewer-prev]').addEventListener('click', () => moveViewer(-1));
    viewer.querySelector('[data-viewer-next]').addEventListener('click', () => moveViewer(1));
    viewer.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        moveViewer(event.key === 'ArrowRight' ? 1 : -1);
      }
    });
    viewer.addEventListener('close', () => {
      document.documentElement.style.overflow = '';
      const target = activeGallery?.slides[viewerIndex]?.querySelector('a') || returnFocus;
      target?.focus({ preventScroll: true });
      activeGallery = null;
    });
    window.addEventListener('pv-language-change', renderViewer);
  }
  document.querySelectorAll('[data-carousel]').forEach(carousel => {
    const track = carousel.querySelector('[data-carousel-track]');
    const slides = Array.from(track.querySelectorAll('.archive-slide'));
    const previous = carousel.querySelector('[data-carousel-prev]');
    const next = carousel.querySelector('[data-carousel-next]');
    const counter = carousel.querySelector('[data-carousel-count]');
    let index = 0;
    let frame = 0;
    let drag = null;
    let suppressClick = false;

    const nearest = () => Math.max(0, Math.min(slides.length - 1, Math.round(track.scrollLeft / (track.clientWidth || 1))));
    const update = () => {
      index = nearest();
      counter.textContent = `${String(index + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
      previous.disabled = index === 0;
      next.disabled = index === slides.length - 1;
      slides.forEach((slide, position) => {
        slide.querySelectorAll('a').forEach(link => { link.tabIndex = position === index ? 0 : -1; });
      });
    };
    const go = (position, behavior = reducedMotion.matches ? 'auto' : 'smooth') => {
      const target = Math.max(0, Math.min(slides.length - 1, position));
      track.scrollTo({ left: target * track.clientWidth, behavior });
    };
    slides.forEach((slide, position) => {
      slide.querySelector('a').addEventListener('click', event => {
        if (suppressClick || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !viewer?.showModal) return;
        event.preventDefault();
        returnFocus = event.currentTarget;
        activeGallery = { slides, go, title: document.getElementById(carousel.getAttribute('aria-labelledby')) };
        viewerIndex = position;
        renderViewer();
        viewer.showModal();
        document.documentElement.style.overflow = 'hidden';
      });
    });
    const language = () => {
      const german = document.documentElement.lang === 'de';
      const title = document.getElementById(carousel.getAttribute('aria-labelledby')).textContent;
      carousel.setAttribute('aria-roledescription', german ? 'Karussell' : 'carousel');
      track.setAttribute('aria-label', german ? `${title}. Wischen oder Pfeiltasten verwenden.` : `${title}. Swipe or use arrow keys.`);
      previous.setAttribute('aria-label', german ? `Vorheriges Bild in ${title}` : `Previous image in ${title}`);
      next.setAttribute('aria-label', german ? `Nächstes Bild in ${title}` : `Next image in ${title}`);
      slides.forEach((slide, position) => {
        slide.setAttribute('aria-roledescription', german ? 'Bild' : 'slide');
        slide.setAttribute('aria-label', german ? `Bild ${position + 1} von ${slides.length}` : `Image ${position + 1} of ${slides.length}`);
      });
    };
    const followHash = () => {
      let id;
      try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
      const target = document.getElementById(id);
      if (!target || !track.contains(target)) return;
      const slide = target.closest('.archive-slide');
      if (slide) go(slides.indexOf(slide), 'auto');
    };

    previous.addEventListener('click', () => go(nearest() - 1));
    next.addEventListener('click', () => go(nearest() + 1));
    track.addEventListener('scroll', () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    }, { passive: true });
    track.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const destinations = { ArrowLeft: nearest() - 1, ArrowRight: nearest() + 1, Home: 0, End: slides.length - 1 };
      if (!(event.key in destinations)) return;
      event.preventDefault();
      go(destinations[event.key]);
    });

    // Touch and trackpad scrolling stay native. Mouse dragging uses the same track.
    track.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      suppressClick = false;
      drag = { id: event.pointerId, start: event.clientX, left: track.scrollLeft, active: false };
    });
    track.addEventListener('pointermove', event => {
      if (!drag || event.pointerId !== drag.id) return;
      const delta = event.clientX - drag.start;
      if (!drag.active && Math.abs(delta) < 8) return;
      if (!drag.active) {
        drag.active = true;
        suppressClick = true;
        track.dataset.dragging = '';
        track.setPointerCapture(event.pointerId);
      }
      event.preventDefault();
      track.scrollLeft = drag.left - delta;
    });
    const endDrag = event => {
      if (!drag || event.pointerId !== drag.id) return;
      const wasActive = drag.active;
      const target = nearest();
      drag = null;
      delete track.dataset.dragging;
      if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
      if (wasActive) go(target);
    };
    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);
    track.addEventListener('lostpointercapture', endDrag);
    track.addEventListener('click', event => {
      if (!suppressClick) return;
      event.preventDefault();
      event.stopPropagation();
      suppressClick = false;
    }, true);
    if ('ResizeObserver' in window) new ResizeObserver(() => go(index, 'auto')).observe(track);
    window.addEventListener('hashchange', followHash);
    window.addEventListener('pv-language-change', language);
    carousel.dataset.ready = '';
    language();
    followHash();
    update();
  });
  const menu = document.querySelector('.berlin-account-menu');
  document.querySelectorAll('.archive-nav-links > a').forEach(link => {
    link.addEventListener('click', () => { if (menu) menu.open = false; });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu) menu.open = false;
  });
})();
