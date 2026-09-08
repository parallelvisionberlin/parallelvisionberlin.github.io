export const ninaAppModeScript = `
(function () {
  window.__PV_NATIVE_APP__ = true;

  function installAppStyle() {
    if (document.getElementById('pv-native-nina-style')) return;
    var style = document.createElement('style');
    style.id = 'pv-native-nina-style';
    style.textContent = [
      'html,body{margin:0!important;padding:0!important;width:100%!important;height:100%!important;background:#000!important;overflow:hidden!important}',
      'body>*:not(#ninaOverlay):not(script):not(style){display:none!important}',
      '#ninaOverlay{position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important;max-width:none!important;max-height:none!important;margin:0!important;z-index:2147483647!important;background:#000!important}',
      '.nina-window{position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important;max-width:none!important;max-height:none!important;margin:0!important;border:0!important;border-radius:0!important;box-shadow:none!important}',
      '.nina-fullscreen,.nina-close{display:none!important}'
    ].join('');
    document.head.appendChild(style);
  }

  function openSignal() {
    installAppStyle();
    var overlay = document.getElementById('ninaOverlay');
    if (!overlay) return;
    var isOpen = overlay.classList.contains('is-open') || overlay.getAttribute('aria-hidden') === 'false';
    if (isOpen) return;
    var trigger = document.getElementById('openNina') || document.querySelector('[data-nina-open]');
    if (trigger) trigger.click();
  }

  installAppStyle();
  openSignal();
  setTimeout(openSignal, 250);
  setTimeout(openSignal, 700);
  setTimeout(openSignal, 1400);
})();
true;
`;
