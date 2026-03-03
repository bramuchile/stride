(function () {

  var BUTTON_ID = "wa-stride-sidebar-toggle";
  var SCRIPT_VERSION = "2026-03-03-1";
  var STYLE_ID = "wa-stride-sidebar-style";
  var BODY_CLS = "wa-stride-sidebar-hidden";
  var COL_ATTR = "data-wa-stride-col";
  var CHAT_ATTR = "data-wa-stride-chat";
  var SPLIT_ATTR = "data-wa-stride-split";
  var SEP_ATTR = "data-wa-stride-sep";
  // Si ya inicializo y el boton existe, no hacemos nada.
  if (window.__WA_STRIDE_TOGGLE_INIT__ && document.getElementById(BUTTON_ID)) return;
  window.__WA_STRIDE_TOGGLE_INIT__ = false;

  // Selector exacto entregado por el usuario (objetivo principal a ocultar).
  var TARGET_SPLIT_SELECTOR =
    "#app > div > div > div.x78zum5.xdt5ytf.x5yr21d > div > div._aigw._as6h.x9f619.x1n2onr6.x5yr21d.x17dzmu4.x1i1dayz.x2ipvbc.xjdofhw.x78zum5.xdt5ytf.x12xzxwr.x1plvlek.xryxfnj.x570efc.x18dvir5.xxljpkc.xwfak60.x18pi947";

  function safeQuerySelector(selector) {
    try {
      return document.querySelector(selector);
    } catch (_) {
      return null;
    }
  }

  function setDebugState(extra) {
    var current = window.__WA_STRIDE_TOGGLE_DEBUG__ || {};
    var next = {
      version: SCRIPT_VERSION,
      init: !!window.__WA_STRIDE_TOGGLE_INIT__,
      buttonExists: !!document.getElementById(BUTTON_ID),
      bodyHidden: !!(document.body && document.body.classList.contains(BODY_CLS)),
      ts: Date.now(),
    };
    if (extra) {
      for (var k in extra) next[k] = extra[k];
    }
    window.__WA_STRIDE_TOGGLE_DEBUG__ = next;
  }

  function findMediaNavbarButton() {
    // Preferimos index estable del navbar (evita depender del idioma del aria-label).
    var byIndex = safeQuerySelector(
      'header[data-tab="2"] button[data-navbar-item="true"][data-navbar-item-index="4"]'
    );
    if (byIndex) return byIndex;

    // Fallbacks por label (depende del locale).
    var byLabel = safeQuerySelector('header[data-tab="2"] button[aria-label="Media"]');
    if (byLabel) return byLabel;
    byLabel = safeQuerySelector('header[data-tab="2"] button[aria-label="Multimedia"]');
    if (byLabel) return byLabel;

    return null;
  }

  var CSS_RULES = [
    "body." + BODY_CLS + " [" + SPLIT_ATTR + "] {",
    "  display: none !important;",
    "  width: 0 !important;",
    "  min-width: 0 !important;",
    "  max-width: 0 !important;",
    "  flex-basis: 0 !important;",
    "  flex: none !important;",
    "  overflow: hidden !important;",
    "  margin: 0 !important;",
    "  padding: 0 !important;",
    "  border: 0 !important;",
    "  box-shadow: none !important;",
    "  outline: 0 !important;",
    "}",
    "body." + BODY_CLS + " [" + SEP_ATTR + "] {",
    "  display: none !important;",
    "  width: 0 !important;",
    "  min-width: 0 !important;",
    "  max-width: 0 !important;",
    "  border: 0 !important;",
    "  box-shadow: none !important;",
    "  outline: 0 !important;",
    "}",
    "body." + BODY_CLS + " [" + CHAT_ATTR + "] {",
    "  flex: 1 1 auto !important;",
    "  width: 100% !important;",
    "  min-width: 0 !important;",
    "  max-width: 100% !important;",
    "  border-left: 0 !important;",
    "  box-shadow: none !important;",
    "  outline: 0 !important;",
    "  margin-left: -1px !important;",
    "}",
    "body." + BODY_CLS + " [" + CHAT_ATTR + "]::before,",
    "body." + BODY_CLS + " [" + CHAT_ATTR + "]::after {",
    "  border-left: 0 !important;",
    "  box-shadow: none !important;",
    "  outline: 0 !important;",
    "}",
  ].join("\n");

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS_RULES;
    (document.head || document.documentElement).appendChild(style);
  }

  function findSplitTarget() {
    // 1) Exacto solicitado por el usuario.
    var target = safeQuerySelector(TARGET_SPLIT_SELECTOR);
    if (target) return target;

    // 2) Fallback estable por clases visibles del nodo.
    target = safeQuerySelector("#app div._aigw._as6h");
    if (target) return target;
    target = safeQuerySelector("#app div._aigs._as6h");
    if (target) return target;

    // 3) Fallback por estructura WhatsApp (side -> contenedor de columna).
    var side = document.getElementById("side");
    if (!side) return null;

    var node = side;
    while (node && node.parentElement && node.parentElement !== document.body) {
      var p = node.parentElement;
      if (p.classList && p.classList.contains("_aigw")) return p;
      if (p.classList && p.classList.contains("_aigs")) return p;
      if (p.classList && p.classList.contains("_as6h")) return p;
      node = p;
    }

    return null;
  }

  function findChatPanel() {
    var main = document.getElementById("main");
    if (main) return main;

    var input = document.querySelector(
      '[role="textbox"][contenteditable="true"][aria-placeholder]'
    );
    if (!input) return null;

    var node = input;
    while (node && node.parentElement && node.parentElement !== document.body) {
      node = node.parentElement;
      if (node.id === "main") return node;
    }
    return null;
  }

  function findLayoutElements() {
    var split = findSplitTarget();
    var chat = findChatPanel();
    if (!split) return null;
    return { split: split, col: split, chat: chat, sep: findSeparator(split) };
  }

  function findSeparator(split) {
    if (!split) return null;
    var sib = split.nextElementSibling;
    if (!sib) return null;
    if (sib.id === "main" || sib.id === "side") return null;

    var cls = sib.className || "";
    if (typeof cls === "string" && cls.indexOf("_as6h") !== -1) return sib;
    if (sib.getAttribute && sib.getAttribute("style") && sib.getAttribute("style").indexOf("width") !== -1) {
      return sib;
    }
    return null;
  }

  function markElements() {
    var oldCol = document.querySelector("[" + COL_ATTR + "]");
    var oldChat = document.querySelector("[" + CHAT_ATTR + "]");
    var oldSplit = document.querySelector("[" + SPLIT_ATTR + "]");
    var oldSep = document.querySelector("[" + SEP_ATTR + "]");
    var found = findLayoutElements();
    if (!found || !found.split) return false;

    if (oldCol && oldCol !== found.col) oldCol.removeAttribute(COL_ATTR);
    if (oldChat && oldChat !== found.chat) oldChat.removeAttribute(CHAT_ATTR);
    if (oldSplit && oldSplit !== found.split) oldSplit.removeAttribute(SPLIT_ATTR);
    if (oldSep && oldSep !== found.sep) oldSep.removeAttribute(SEP_ATTR);

    if (!found.col.hasAttribute(COL_ATTR)) found.col.setAttribute(COL_ATTR, "");
    if (found.chat && !found.chat.hasAttribute(CHAT_ATTR)) {
      found.chat.setAttribute(CHAT_ATTR, "");
    }
    if (!found.split.hasAttribute(SPLIT_ATTR)) found.split.setAttribute(SPLIT_ATTR, "");
    if (found.sep && !found.sep.hasAttribute(SEP_ATTR)) found.sep.setAttribute(SEP_ATTR, "");

    return true;
  }

  function applyVisualState(hidden) {
    var split = document.querySelector("[" + SPLIT_ATTR + "]");
    var chat = document.querySelector("[" + CHAT_ATTR + "]");
    var sep = document.querySelector("[" + SEP_ATTR + "]");

    if (split) {
      if (hidden) {
        split.style.setProperty("display", "none", "important");
        split.style.setProperty("width", "0", "important");
        split.style.setProperty("min-width", "0", "important");
        split.style.setProperty("max-width", "0", "important");
        split.style.setProperty("flex-basis", "0", "important");
        split.style.setProperty("margin", "0", "important");
        split.style.setProperty("padding", "0", "important");
        split.style.setProperty("overflow", "hidden", "important");
        split.style.setProperty("border", "0", "important");
        split.style.setProperty("box-shadow", "none", "important");
        split.style.setProperty("outline", "0", "important");
      } else {
        split.style.removeProperty("display");
        split.style.removeProperty("width");
        split.style.removeProperty("min-width");
        split.style.removeProperty("max-width");
        split.style.removeProperty("flex-basis");
        split.style.removeProperty("margin");
        split.style.removeProperty("padding");
        split.style.removeProperty("overflow");
        split.style.removeProperty("border");
        split.style.removeProperty("box-shadow");
        split.style.removeProperty("outline");
      }
    }

    if (chat) {
      if (hidden) {
        chat.style.setProperty("flex", "1 1 auto", "important");
        chat.style.setProperty("width", "100%", "important");
        chat.style.setProperty("max-width", "100%", "important");
        chat.style.setProperty("min-width", "0", "important");
        chat.style.setProperty("border-left", "0", "important");
        chat.style.setProperty("box-shadow", "none", "important");
        chat.style.setProperty("outline", "0", "important");
        chat.style.setProperty("margin-left", "-1px", "important");
      } else {
        chat.style.removeProperty("flex");
        chat.style.removeProperty("width");
        chat.style.removeProperty("max-width");
        chat.style.removeProperty("min-width");
        chat.style.removeProperty("border-left");
        chat.style.removeProperty("box-shadow");
        chat.style.removeProperty("outline");
        chat.style.removeProperty("margin-left");
      }
    }

    if (sep) {
      if (hidden) {
        sep.style.setProperty("display", "none", "important");
        sep.style.setProperty("width", "0", "important");
        sep.style.setProperty("min-width", "0", "important");
        sep.style.setProperty("max-width", "0", "important");
        sep.style.setProperty("border", "0", "important");
        sep.style.setProperty("box-shadow", "none", "important");
        sep.style.setProperty("outline", "0", "important");
      } else {
        sep.style.removeProperty("display");
        sep.style.removeProperty("width");
        sep.style.removeProperty("min-width");
        sep.style.removeProperty("max-width");
        sep.style.removeProperty("border");
        sep.style.removeProperty("box-shadow");
        sep.style.removeProperty("outline");
      }
    }
  }

  function toggleSidebar() {
    ensureStyles();
    var ok = markElements();
    if (!ok) {
      var failBtn = document.getElementById(BUTTON_ID);
      if (failBtn) {
        failBtn.title = "No se encontro el contenedor de chats";
        failBtn.style.background = "rgba(210,50,50,0.9)";
      }
      return;
    }

    var hidden = document.body.classList.toggle(BODY_CLS);
    applyVisualState(hidden);

    var btn = document.getElementById(BUTTON_ID);
    if (btn) {
      btn.textContent = hidden ? ">>" : "<<";
      btn.setAttribute("aria-pressed", hidden ? "true" : "false");
      btn.setAttribute("data-navbar-item-selected", hidden ? "true" : "false");
      btn.title = "Ocultar/mostrar sidebar (Ctrl+Shift+L)";
      btn.style.background = "rgba(0,0,0,0.45)";
    }
  }

  function createToggleButton() {
    ensureStyles();
    var existing = document.getElementById(BUTTON_ID);
    var mediaBtn = findMediaNavbarButton();
    var mediaSpan = mediaBtn && mediaBtn.closest ? mediaBtn.closest("span") : null;
    var mediaItem = mediaSpan && mediaSpan.parentElement ? mediaSpan.parentElement : null;
    var mediaItemsContainer = mediaItem && mediaItem.parentElement ? mediaItem.parentElement : null;
    setDebugState({
      step: "createToggleButton",
      hasMediaBtn: !!mediaBtn,
      hasMediaItem: !!mediaItem,
      hasMediaItemsContainer: !!mediaItemsContainer,
      hadExistingButton: !!existing,
    });

    var btn = existing || (mediaBtn ? mediaBtn.cloneNode(true) : document.createElement("button"));
    var isNew = !existing;

    btn.id = BUTTON_ID;
    btn.type = "button";
    btn.setAttribute("aria-label", "Toggle chats sidebar");
    btn.setAttribute("aria-pressed", "false");
    btn.setAttribute("data-navbar-item", "true");
    btn.setAttribute("data-navbar-item-selected", "false");
    btn.setAttribute("data-wa-stride-toggle", "true");
    btn.removeAttribute("data-navbar-item-index");
    btn.title = "Ocultar/mostrar sidebar (Ctrl+Shift+L)";
    btn.textContent = "||";
    btn.style.width = "28px";
    btn.style.height = "28px";
    btn.style.border = "none";
    btn.style.borderRadius = "999px";
    btn.style.cursor = "pointer";
    btn.style.fontWeight = "700";
    btn.style.fontFamily = "monospace";
    btn.style.fontSize = "14px";
    btn.style.lineHeight = "1";
    btn.style.display = "inline-flex";
    btn.style.alignItems = "center";
    btn.style.justifyContent = "center";
    btn.style.background = "transparent";
    btn.style.color = "currentColor";

    if (isNew) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        toggleSidebar();
      });
    }

    if (mediaItemsContainer && mediaItem && mediaSpan && mediaBtn) {
      var existingItem = btn.closest ? btn.closest('[data-wa-stride-custom-item="true"]') : null;
      var alreadyPlaced =
        !!existingItem &&
        existingItem.parentElement === mediaItemsContainer &&
        existingItem === mediaItemsContainer.firstElementChild;

      // Si ya está correctamente insertado en el primer slot, no tocar el DOM.
      if (alreadyPlaced) {
        setDebugState({ placement: "navbar", stable: true });
        return;
      }

      if (existingItem) existingItem.remove();
      else if (btn.parentElement) btn.parentElement.removeChild(btn);

      var customItem = document.createElement("div");
      customItem.className = mediaItem.className || "";
      customItem.setAttribute("data-wa-stride-custom-item", "true");

      var wrapper = document.createElement("span");
      wrapper.className = mediaSpan.className || "";
      wrapper.appendChild(btn);
      customItem.appendChild(wrapper);

      // Limpiar estilos de fallback flotante en caso de reubicacion.
      btn.style.removeProperty("position");
      btn.style.removeProperty("top");
      btn.style.removeProperty("right");
      btn.style.removeProperty("z-index");

      mediaItemsContainer.insertBefore(customItem, mediaItemsContainer.firstElementChild || mediaItem);
      setDebugState({ placement: "navbar" });
    } else {
      // Fallback si WhatsApp cambia estructura.
      // Evitar inyeccion temprana durante splash/loading de WhatsApp.
      var appReady = !!(document.getElementById("side") || document.getElementById("main"));
      if (!appReady) {
        setDebugState({ placement: "deferred-until-app-ready" });
        return;
      }
      btn.style.position = "fixed";
      btn.style.top = "70px";
      btn.style.right = "10px";
      btn.style.zIndex = "9999";
      btn.style.background = "rgba(0,0,0,0.45)";
      btn.style.color = "#fff";
      if (btn.parentElement !== document.body && document.body) document.body.appendChild(btn);
      setDebugState({ placement: "floating-fallback" });
    }

    // Detectar layout es opcional; el boton debe existir aunque falle.
    try {
      markElements();
    } catch (_) {}
  }

  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey && e.shiftKey && (e.key === "L" || e.key === "l")) {
      e.preventDefault();
      toggleSidebar();
    }
  });

  function waitAndInit() {
    setDebugState({ step: "waitAndInit-start" });
    createToggleButton();

    var tries = 0;
    var intervalId = setInterval(function () {
      tries += 1;
      try {
        markElements();
      } catch (_) {}
      if (tries > 40) clearInterval(intervalId);
    }, 500);

    if (typeof MutationObserver !== "undefined") {
      var observer = new MutationObserver(function () {
        ensureStyles();
        try {
          markElements();
        } catch (_) {}
        if (document.body.classList.contains(BODY_CLS)) {
          applyVisualState(true);
        }
        // Evitar bucle de mutaciones: solo crear/reubicar si hace falta.
        var btn = document.getElementById(BUTTON_ID);
        var mediaBtn = findMediaNavbarButton();
        var inCustomNavbarSlot =
          !!(btn && btn.closest && btn.closest('[data-wa-stride-custom-item="true"]'));
        var shouldRecreate = !btn || (!!mediaBtn && !inCustomNavbarSlot);
        if (shouldRecreate) createToggleButton();
      });

      function startObserver() {
        if (document.body) {
          observer.observe(document.body, { childList: true, subtree: true });
        } else {
          document.addEventListener("DOMContentLoaded", function () {
            observer.observe(document.body, { childList: true, subtree: true });
          });
        }
      }

      startObserver();
    }
  }

  try {
    waitAndInit();
    window.__WA_STRIDE_TOGGLE_INIT__ = true;
    setDebugState({ step: "init-success", init: true });
  } catch (_) {
    // Si algo falla, permite re-ejecucion en la siguiente inyeccion.
    window.__WA_STRIDE_TOGGLE_INIT__ = false;
    setDebugState({ step: "init-error", init: false });
  }
})();
