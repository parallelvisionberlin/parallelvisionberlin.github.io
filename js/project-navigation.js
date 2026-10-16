/* Scroll-aware navigation shared by Berlin 2063 and Fashion After Fabric. */
(() => {
  "use strict";
  const nav = document.querySelector("[data-project-nav]");
  if (!nav) return;
  const menuButton = nav.querySelector(".pv-project-nav-toggle");
  const sections = nav.querySelector(".pv-project-nav-sections");
  const account = nav.querySelector(".pv-project-account");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let lastY = window.scrollY;
  let framePending = false;

  function setMenu(open) {
    nav.classList.toggle("is-menu-open", open);
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", document.documentElement.lang === "de"
      ? (open ? "Navigation schließen" : "Navigation öffnen")
      : (open ? "Close navigation" : "Open navigation"));
    if (open) {
      account.open = false;
      nav.classList.remove("is-hidden");
    }
  }

  function updateScroll() {
    framePending = false;
    const y = Math.max(0, window.scrollY);
    const delta = y - lastY;
    const engaged = nav.classList.contains("is-menu-open") || account.open || (nav.contains(document.activeElement) && document.activeElement.matches(":focus-visible"));
    nav.classList.toggle("is-scrolled", y > 56);
    if (engaged || y < Math.max(430, window.innerHeight * .72)) {
      nav.classList.remove("is-hidden");
    } else if (delta > 3) {
      nav.classList.add("is-hidden");
    } else if (delta < -3) {
      nav.classList.remove("is-hidden");
    }
    lastY = y;
  }

  menuButton.addEventListener("click", () => setMenu(!nav.classList.contains("is-menu-open")));
  sections.querySelectorAll("a").forEach(link => link.addEventListener("click", () => setMenu(false)));
  account.addEventListener("toggle", () => {
    if (account.open) {
      setMenu(false);
      nav.classList.remove("is-hidden");
    }
  });
  document.addEventListener("pointerdown", event => {
    if (!nav.contains(event.target)) {
      setMenu(false);
      account.open = false;
    }
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      setMenu(false);
      account.open = false;
    }
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 980) setMenu(false);
  }, { passive: true });
  window.addEventListener("scroll", () => {
    if (framePending) return;
    framePending = true;
    window.requestAnimationFrame(updateScroll);
  }, { passive: true });

  function translateUtility() {
    const de = document.documentElement.lang === "de";
    const labels = nav.querySelectorAll("[data-nav-en][data-nav-de]");
    labels.forEach(element => { element.textContent = element.dataset[de ? "navDe" : "navEn"]; });
    account.querySelector("summary").setAttribute("aria-label", de ? "Kontomenü" : "Account menu");
    setMenu(nav.classList.contains("is-menu-open"));
  }
  window.addEventListener("pv-language-change", translateUtility);
  translateUtility();
  if (reduceMotion.matches) nav.style.setProperty("scroll-behavior", "auto");
  updateScroll();
})();