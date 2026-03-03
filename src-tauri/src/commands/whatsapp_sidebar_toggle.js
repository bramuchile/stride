(function () {

  var BUTTON_ID = "wa-stride-sidebar-toggle";
  var STYLE_ID = "wa-stride-sidebar-style";
  var BODY_CLS = "wa-stride-sidebar-hidden";
  var COL_ATTR = "data-wa-stride-col";
  var CHAT_ATTR = "data-wa-stride-chat";
  var SPLIT_ATTR = "data-wa-stride-split";
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
    "}",
    "body." + BODY_CLS + " [" + CHAT_ATTR + "] {",
    "  flex: 1 1 auto !important;",
    "  width: 100% !important;",
    "  min-width: 0 !important;",
    "  max-width: 100% !important;",
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
    return { split: split, col: split, chat: chat };
  }

  function markElements() {
    var oldCol = document.querySelector("[" + COL_ATTR + "]");
    var oldChat = document.querySelector("[" + CHAT_ATTR + "]");
    var oldSplit = document.querySelector("[" + SPLIT_ATTR + "]");
    var found = findLayoutElements();
    if (!found || !found.split) return false;

    if (oldCol && oldCol !== found.col) oldCol.removeAttribute(COL_ATTR);
    if (oldChat && oldChat !== found.chat) oldChat.removeAttribute(CHAT_ATTR);
    if (oldSplit && oldSplit !== found.split) oldSplit.removeAttribute(SPLIT_ATTR);

    if (!found.col.hasAttribute(COL_ATTR)) found.col.setAttribute(COL_ATTR, "");
    if (found.chat && !found.chat.hasAttribute(CHAT_ATTR)) {
      found.chat.setAttribute(CHAT_ATTR, "");
    }
    if (!found.split.hasAttribute(SPLIT_ATTR)) found.split.setAttribute(SPLIT_ATTR, "");

    return true;
  }

  function applyVisualState(hidden) {
    var split = document.querySelector("[" + SPLIT_ATTR + "]");
    var chat = document.querySelector("[" + CHAT_ATTR + "]");

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
      } else {
        split.style.removeProperty("display");
        split.style.removeProperty("width");
        split.style.removeProperty("min-width");
        split.style.removeProperty("max-width");
        split.style.removeProperty("flex-basis");
        split.style.removeProperty("margin");
        split.style.removeProperty("padding");
        split.style.removeProperty("overflow");
      }
    }

    if (chat) {
      if (hidden) {
        chat.style.setProperty("flex", "1 1 auto", "important");
        chat.style.setProperty("width", "100%", "important");
        chat.style.setProperty("max-width", "100%", "important");
        chat.style.setProperty("min-width", "0", "important");
      } else {
        chat.style.removeProperty("flex");
        chat.style.removeProperty("width");
        chat.style.removeProperty("max-width");
        chat.style.removeProperty("min-width");
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
      btn.title = "Ocultar/mostrar sidebar (Ctrl+Shift+L)";
      btn.style.background = "rgba(0,0,0,0.45)";
    }
  }

  function createToggleButton() {
    if (document.getElementById(BUTTON_ID)) return;

    ensureStyles();

    var btn = document.createElement("button");
    btn.id = BUTTON_ID;
    btn.textContent = "<<";
    btn.title = "Ocultar/mostrar sidebar (Ctrl+Shift+L)";

    Object.assign(btn.style, {
      position: "fixed",
      top: "70px",
      right: "10px",
      zIndex: "9999",
      width: "28px",
      height: "28px",
      borderRadius: "50%",
      border: "none",
      background: "rgba(0,0,0,0.45)",
      color: "#ffffff",
      fontSize: "13px",
      fontFamily: "monospace",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      lineHeight: "1",
      padding: "0",
      backdropFilter: "blur(4px)",
      transition: "background 0.15s ease, transform 0.1s ease",
      userSelect: "none",
    });

    btn.addEventListener("mouseenter", function () {
      btn.style.background = "rgba(35,157,103,0.9)";
      btn.style.transform = "scale(1.1)";
    });

    btn.addEventListener("mouseleave", function () {
      btn.style.background = "rgba(0,0,0,0.45)";
      btn.style.transform = "scale(1)";
    });

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      toggleSidebar();
    });

    if (document.body) {
      document.body.appendChild(btn);
    } else {
      document.addEventListener("DOMContentLoaded", function () {
        if (!document.getElementById(BUTTON_ID) && document.body) {
          document.body.appendChild(btn);
        }
      });
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
        if (!document.getElementById(BUTTON_ID)) {
          createToggleButton();
        }
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
  } catch (_) {
    // Si algo falla, permite re-ejecucion en la siguiente inyeccion.
    window.__WA_STRIDE_TOGGLE_INIT__ = false;
  }
})();
