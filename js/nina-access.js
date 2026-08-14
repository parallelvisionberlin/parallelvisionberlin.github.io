/*
+ * This access prompt is a theatrical, client-side gate on a static GitHub Pages site.
+ * Its hash is visible to visitors and it must not be treated as secure authorization.
+ * Tavus is loaded only after a successful prompt, with duplicate initialization guarded.
+ */
const ninaOverlay =
  document.getElementById(
    "ninaOverlay"
  );


const openNina =
  document.getElementById(
    "openNina"
  );

const openNinaArtist =
  document.getElementById(
    "openNinaArtist"
  );


const ninaAccess =
  document.getElementById(
    "ninaAccess"
  );


const ninaAccessForm =
  document.getElementById(
    "ninaAccessForm"
  );


const ninaAccessCode =
  document.getElementById(
    "ninaAccessCode"
  );


const ninaAccessError =
  document.getElementById(
    "ninaAccessError"
  );


const ninaAccessSubmit =
  document.getElementById(
    "ninaAccessSubmit"
  );


const ninaAccessCancel =
  document.getElementById(
    "ninaAccessCancel"
  );


const closeNina =
  document.getElementById(
    "closeNina"
  );


const startNina =
  document.getElementById(
    "startNina"
  );


const ninaEmbedMount =
  document.getElementById(
    "ninaEmbedMount"
  );


const ninaStage =
  ninaEmbedMount.parentElement;


let ninaEmbed = null;


const ninaStatus =
  document.getElementById(
    "ninaStatus"
  );


const ninaScrimTitle =
  document.getElementById(
    "ninaScrimTitle"
  );


const ninaScrimSubtitle =
  document.getElementById(
    "ninaScrimSubtitle"
  );


const ninaScrimMessage =
  document.getElementById(
    "ninaScrimMessage"
  );


const ninaScrimButton =
  document.getElementById(
    "ninaScrimButton"
  );


let ninaConversationActive =
  false;


let ninaReady =
  false;


let ninaConversationStarted =
  false;


let ninaTavusInitialized = false;


let ninaTavusInitializationPromise = null;


let ninaAccessSubmitting = false;


let ninaAccessVerifiedForCurrentOpen = false;


const ninaAccessHash =
  "d3ec7a14e4fefc8da57d4045a6ee28d28b328b78126c1e22bc0b541adf0f215c";


function waitForAccessMessage(delay) {
  return new Promise(resolve => setTimeout(resolve, delay));
}


async function hashNinaAccessCode(code) {
  const encodedCode = new TextEncoder().encode(code);
  const digest = await crypto.subtle.digest("SHA-256", encodedCode);

  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}


function openNinaAccess() {
  console.log("ACCESS PORTAL OPENED");
  ninaAccessVerifiedForCurrentOpen = false;
  ninaOverlay.classList.remove("is-open");
  ninaOverlay.setAttribute("aria-hidden", "true");
  document.body.classList.remove(
    "nina-call-visible",
    "nina-scrim-visible",
    "nina-scrim-action",
    "nina-conversation-live"
  );
  ninaAccess.classList.add("is-open");
  ninaAccess.setAttribute("aria-hidden", "false");
  ninaAccessError.textContent = "";
  ninaAccessCode.value = "";
  document.body.style.overflow = "hidden";
  ninaAccessCode.focus({ preventScroll: true });
  setTimeout(
    () => ninaAccessCode.focus({ preventScroll: true }),
    50
  );
}


function closeNinaAccess(keepCurrentVerification = false) {
  if (!keepCurrentVerification) {
    ninaAccessVerifiedForCurrentOpen = false;
  }

  ninaAccess.classList.remove("is-open");
  ninaAccess.setAttribute("aria-hidden", "true");
  ninaAccessError.textContent = "";
  ninaAccessCode.value = "";
  document.body.style.overflow = "";
  if (openNina) {
    openNina.focus();
  }
}


function loadNinaEmbedLibrary() {
  if (customElements.get("tavus-embed")) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    console.log("TAVUS SCRIPT LOADING");
    const script = document.createElement("script");
script.src = "https://unpkg.com/@tavus/embed@0.2.1";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Unable to load Tavus."));
    document.head.appendChild(script);
  });
}


function styleNativeNinaConnectButton() {
  const ninaShadowRoot = ninaEmbed?.shadowRoot;

  if (!ninaShadowRoot || ninaShadowRoot.getElementById("pv-nina-connect-style")) {
    return;
  }

  const ninaConnectStyle = document.createElement("style");
  ninaConnectStyle.id = "pv-nina-connect-style";
  ninaConnectStyle.textContent = `
    .btn-neutral {
      cursor: pointer !important;
      transition:
        background-color .18s ease,
        color .18s ease,
        border-color .18s ease,
        transform .12s ease,
        box-shadow .18s ease !important;
    }

    .btn-neutral:hover,
    .btn-neutral:focus-visible {
      background: #fff !important;
      border-color: #fff !important;
      color: #000 !important;
      box-shadow: 0 0 24px rgba(255, 255, 255, .42) !important;
    }

    .btn-neutral:active {
      background: #fff !important;
      color: #000 !important;
      transform: scale(.96) !important;
    }
  `;
  ninaShadowRoot.appendChild(ninaConnectStyle);
}


async function initializeNinaTavusAfterAccess() {
  if (!ninaAccessVerifiedForCurrentOpen) {
    return null;
  }

  if (ninaTavusInitialized) {
    return ninaTavusInitializationPromise;
  }

  ninaTavusInitialized = true;
  ninaTavusInitializationPromise = (async () => {
      await loadNinaEmbedLibrary();
      ninaEmbed = document.createElement("tavus-embed");
      ninaEmbed.id = "ninaEmbed";
      ninaEmbed.setAttribute(
        "deployment-id",
        "d70bc773-bd96-44e2-ad08-abf2cac262be"
      );
      bindNinaEvents();
      ninaEmbedMount.replaceWith(ninaEmbed);
      styleNativeNinaConnectButton();
      console.log("TAVUS ELEMENT CREATED");
      await waitForNina();
      return ninaEmbed;
    })();

  return ninaTavusInitializationPromise;
}


function requestNinaWindow() {
  openNinaAccess();
}


async function verifyNinaAccess(event) {
  event.preventDefault();

  if (ninaAccessSubmitting) {
    return;
  }

  ninaAccessSubmitting = true;
  console.log("ACCESS KEY SUBMITTED");
  ninaAccessSubmit.disabled = true;
  ninaAccessCancel.disabled = true;
  ninaAccessSubmit.textContent = "VERIFYING RESONANCE...";
  ninaAccessError.textContent = "";

  try {
    const submittedHash = await hashNinaAccessCode(ninaAccessCode.value);

    if (submittedHash !== ninaAccessHash) {
      console.log("ACCESS KEY INVALID");
      ninaAccessError.textContent = "RESONANCE MISMATCH / ACCESS DENIED";
      ninaAccessCode.select();
      return;
    }

    console.log("ACCESS KEY VERIFIED");
    ninaAccessError.textContent = "IDENTITY VERIFIED";
    ninaAccessVerifiedForCurrentOpen = true;
    await waitForAccessMessage(500);
    ninaAccessError.textContent = "OPENING CHANNEL...";
    await waitForAccessMessage(650);
    closeNinaAccess(true);
    await initializeNinaTavusAfterAccess();
    openNinaWindow();
  }
  catch (error) {
    console.error("Nina access verification unavailable.", error);
    ninaAccessError.textContent = "RESONANCE MISMATCH / ACCESS DENIED";
    ninaAccessCode.select();
  }
  finally {
    ninaAccessSubmitting = false;
    ninaAccessSubmit.disabled = false;
    ninaAccessCancel.disabled = false;
    ninaAccessSubmit.textContent = "OPEN THE SIGNAL";
  }
}



function openNinaWindow() {

  ninaOverlay.classList.add(
    "is-open"
  );


  ninaOverlay.setAttribute(
    "aria-hidden",
    "false"
  );


  document.body.style.overflow =
    "hidden";


  showNinaReady();

}



function setNinaScrim(
  title,
  subtitle,
  message,
  buttonText
) {

  ninaScrimTitle.textContent =
    title;


  ninaScrimSubtitle.textContent =
    subtitle;


  ninaScrimMessage.textContent =
    message || "";


  ninaScrimButton.textContent =
    buttonText || "";


  document.body.classList.toggle(
    "nina-scrim-action",
    Boolean(
      buttonText
    )
  );

}



function closeNinaWindow() {

  ninaOverlay.classList.remove(
    "is-open"
  );


  ninaOverlay.setAttribute(
    "aria-hidden",
    "true"
  );


  document.body.style.overflow =
    "";


  resetNinaInterface();


  ninaAccessVerifiedForCurrentOpen = false;


  if (ninaEmbed) {
    ninaEmbed.remove();
    ninaStage.insertBefore(
      ninaEmbedMount,
      ninaStage.firstChild
    );
    ninaEmbed = null;
  }


  ninaTavusInitialized = false;
  ninaTavusInitializationPromise = null;
  ninaReady = false;

}



async function closeNinaFromButton() {

  if (
    ninaConversationActive &&
    ninaEmbed.tavus &&
    typeof ninaEmbed.tavus.end
      === "function"
  ) {

    try {

      await ninaEmbed.tavus.end();

    }

    catch (error) {

      console.error(
        error
      );

    }

  }


  closeNinaWindow();

}



function resetNinaInterface() {

  ninaConversationActive =
    false;


  ninaConversationStarted =
    false;


  document.body.classList.remove(
    "nina-connecting-mode",
    "nina-call-visible",
    "nina-conversation-live",
    "nina-scrim-visible",
    "nina-scrim-action"
  );


  setNinaScrim(
    "ESTABLISHING SIGNAL...",
    "BERLIN 2063",
    "",
    "CONNECT"
  );


  ninaStatus.textContent =
    ninaReady
      ? "ESTABLISHING SIGNAL..."
      : "INITIALIZING";


  startNina.disabled =
    !ninaReady;


  startNina.textContent =
    ninaReady
      ? "CONNECT"
      : "Initializing";

}



async function waitForNina() {

  const started =
    Date.now();


  while (
    !ninaEmbed.tavus
  ) {

    if (
      Date.now() - started
      >
      15000
    ) {

      ninaReady =
        false;


      startNina.disabled =
        false;


      startNina.textContent =
        "CONNECT";


      ninaStatus.textContent =
        "ESTABLISHING SIGNAL...";


      return;

    }


    await new Promise(
      resolve =>
        requestAnimationFrame(
          resolve
        )
    );

  }


  ninaReady =
    true;


  startNina.disabled =
    false;


  startNina.textContent =
    "CONNECT";


  ninaStatus.textContent =
    "ESTABLISHING SIGNAL...";

}



function showNinaReady() {

  ninaConversationActive =
    false;


  ninaConversationStarted =
    false;


  setNinaScrim(
    "SIGNAL READY",
    "BERLIN 2063",
    "",
    "CONNECT"
  );


  document.body.classList.remove(
    "nina-connecting-mode",
    "nina-conversation-live"
  );


  document.body.classList.add(
    "nina-call-visible"
  );


  document.body.classList.remove(
    "nina-scrim-visible",
    "nina-scrim-action"
  );


  ninaStatus.textContent =
    "SIGNAL READY";


  startNina.disabled =
    false;


  startNina.textContent =
    "CONNECT";


  const ninaEmbedBounds =
    ninaEmbed.getBoundingClientRect();


  console.log(
    "NINA: embed visible and sized",
    `${Math.round(ninaEmbedBounds.width)}x${Math.round(ninaEmbedBounds.height)}`
  );

}



function showNinaLost(
  message
) {

  document.body.classList.remove(
    "nina-connecting-mode",
    "nina-conversation-live"
  );


  document.body.classList.add(
    "nina-call-visible",
    "nina-scrim-visible",
    "nina-scrim-action"
  );


  setNinaScrim(
    "SIGNAL LOST",
    "BERLIN 2063",
    message,
    "RETRY SIGNAL"
  );


  ninaConversationActive =
    false;


  startNina.disabled =
    false;


  startNina.textContent =
    "RETRY SIGNAL";


  ninaStatus.textContent =
    "SIGNAL LOST";

}



function markNinaOnline() {

  console.log("TAVUS CONVERSATION STARTED");


  ninaConversationActive =
    true;


  ninaConversationStarted =
    true;


  ninaStatus.textContent =
    "SIGNAL ONLINE";


  document.body.classList.add(
    "nina-call-visible",
    "nina-conversation-live"
  );


  document.body.classList.remove(
    "nina-connecting-mode",
    "nina-scrim-visible",
    "nina-scrim-action"
  );

}



function getNinaErrorText(detail) {

  if (
    !detail
  ) {

    return "UNKNOWN_ERROR: No error detail was provided.";

  }


  const source =
    detail.error &&
    typeof detail.error === "object"
      ? detail.error
      : detail;


  const code =
    source.code ||
    source.errorCode ||
    source.name ||
    "UNKNOWN_ERROR";


  const message =
    source.message ||
    source.reason ||
    (
      typeof detail.error === "string"
        ? detail.error
        : ""
    ) ||
    JSON.stringify(
      detail
    );


  return `${code}: ${message}`;

}



function showNinaEnded() {

  if (
    ninaConversationStarted
  ) {

    ninaStatus.textContent =
      "SIGNAL ENDED";


    setNinaScrim(
      "SIGNAL ENDED",
      "BERLIN 2063",
      "",
      "REOPEN SIGNAL"
    );


    document.body.classList.remove(
      "nina-connecting-mode",
      "nina-conversation-live"
    );


    document.body.classList.add(
      "nina-call-visible",
      "nina-scrim-visible"
    );


    startNina.disabled =
      false;


    startNina.textContent =
      "REOPEN SIGNAL";

  }


  ninaConversationActive =
    false;


  ninaConversationStarted =
    false;

}



if (openNina) {
  openNina.addEventListener(
    "click",
    requestNinaWindow
  );
}

if (openNinaArtist) {
  openNinaArtist.addEventListener(
    "click",
    requestNinaWindow
  );
}



ninaAccessForm.addEventListener(
  "submit",
  verifyNinaAccess
);



ninaAccess.addEventListener(
  "click",
  event => event.stopPropagation()
);



ninaAccess.addEventListener(
  "pointerdown",
  event => event.stopPropagation()
);



ninaAccessCancel.addEventListener(
  "click",
  () => closeNinaAccess()
);



closeNina.addEventListener(
  "click",
  closeNinaFromButton
);



function bindNinaEvents() {

  ninaEmbed.addEventListener(
  "tavus:conversation-started",
  markNinaOnline
);



  ninaEmbed.addEventListener(
  "tavus:state-change",

  event => {

    const state =
      event.detail?.state;


    if (
      state === "ended" &&
      ninaConversationStarted
    ) {

      showNinaEnded();

    }

  }
);



  ninaEmbed.addEventListener(
  "tavus:conversation-ended",

  () => {

    console.log("TAVUS CONVERSATION ENDED");

    if (ninaConversationStarted) {
      showNinaEnded();
    }

  }
);



  ninaEmbed.addEventListener(
  "tavus:error",

  event => {

    console.log("TAVUS ERROR");

    const ninaErrorText =
      getNinaErrorText(
        event.detail
      );


    console.error(
      ninaErrorText,
      event.detail
    );


    if (
      ninaConversationStarted &&
      ninaConversationActive
    ) {
      showNinaLost(ninaErrorText);
    }
    else {
      ninaStatus.textContent = "ESTABLISHING SIGNAL...";
      setNinaScrim(
        "ESTABLISHING SIGNAL...",
        "BERLIN 2063",
        "",
        "CONNECT"
      );
      document.body.classList.add(
        "nina-call-visible"
      );
      document.body.classList.remove(
        "nina-scrim-visible",
        "nina-scrim-action"
      );
    }

  }
  );

}



document.addEventListener(
  "keydown",

  event => {

    if (
      event.key === "Escape" &&
      !ninaAccessSubmitting &&
      ninaAccess.classList.contains(
        "is-open"
      )
    ) {

      closeNinaAccess();

    }

    else if (
      event.key === "Escape" &&
      ninaOverlay.classList.contains(
        "is-open"
      )
    ) {

      closeNinaWindow();

    }

  }
);



if (new URLSearchParams(window.location.search).get("nina") === "1") {
  requestNinaWindow();
}
