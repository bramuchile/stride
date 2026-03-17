(function () {
  // Guard: si somos un popup OAuth (WebView2 comparte environment con los paneles,
  // por lo que initialization_scripts se propagan a todos los WebViews del mismo
  // UserDataFolder). Salir antes de instalar cualquier override.
  if (window.__STRIDE_IS_POPUP__) return;

  // ── Estado ─────────────────────────────────────────────────────────────────
  // Arranca en true — el script solo se inyecta cuando Focus Mode está activo.
  // El toggle dinámico actualiza esta variable; fetch/XHR/appendChild la leen en runtime.
  var FOCUS_ENABLED = true;

  // ── Listas de filtrado ──────────────────────────────────────────────────────
  var DOMAINS = new Set(/*STRIDE_DOMAINS*/);

  // Solo patrones que no sean endpoints de tracking propios de YouTube.
  // NO bloquear /api/stats/ads, /ptracking, /generate_204, /watchtime — esos
  // son señales directas que activan enforcement mode en el servidor de YouTube.
  var YT_PATTERNS = [
    /\/pagead\//,
    /youtube\.com\/pagead\//,
    /\/get_video_info\?.*adformat/,
  ];

  var CRITICAL = [
    "doubleclick.net", "googlesyndication.com", "googleadservices.com",
    "googletagservices.com", "adservice.google.com", "adnxs.com",
    "rubiconproject.com", "pubmatic.com", "openx.net", "criteo.com",
    "outbrain.com", "taboola.com", "moatads.com", "demdex.net", "everesttech.net",
  ];
  CRITICAL.forEach(function (d) { DOMAINS.add(d); });

  // ── pruneAds ────────────────────────────────────────────────────────────────
  // Keys de ads en playerResponse / ytInitialPlayerResponse.
  // Actualizar solo aquí — se propaga a todas las capas automáticamente.
  var AD_KEYS = [
    "adPlacements",
    "playerAds",
    "adSlots",
    "adBreakHeartbeatParams",
    // "auxiliaryUi" eliminado: en playerResponse contiene también overlays NO-ad
    // (age-gate, DRM notices, fallback UI). Es un Object → pruneAds lo borraba
    // completamente (delete, no []) → el player comprueba su existencia y
    // aborta con error interno 282054944 si no está presente.
    "adSlotLoggingData",
    "serializedAdServingDataEntry",
  ];

  function pruneAds(obj) {
    if (!obj || typeof obj !== "object") return;
    AD_KEYS.forEach(function (key) {
      if (key in obj) {
        if (Array.isArray(obj[key])) {
          obj[key] = [];
        } else {
          delete obj[key];
        }
      }
    });
    if (obj.playerResponse) pruneAds(obj.playerResponse);
    if (Array.isArray(obj)) obj.forEach(pruneAds);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function shouldBlock(url) {
    try {
      var u = new URL(url);
      var h = u.hostname;
      if (!h) return false;
      if (DOMAINS.has(h)) return true;
      var parts = h.split(".");
      for (var i = 1; i < parts.length - 1; i++) {
        if (DOMAINS.has(parts.slice(i).join("."))) return true;
      }
      var href = u.href;
      for (var j = 0; j < YT_PATTERNS.length; j++) {
        if (YT_PATTERNS[j].test(href)) return true;
      }
    } catch (e) {}
    return false;
  }

  // ── CAPAS 3 y 4 — ELIMINADAS ────────────────────────────────────────────────
  // Motivo: cleanScriptText usaba regex /\[.*?\]/gs (lazy + dotAll) que para
  // en el primer ']' del contenido — cuando adPlacements tiene arrays anidados
  // (ej. adTimeOffset.values=[...]) el regex cortaba el JSON en medio, dejando
  // JSON malformado → SyntaxError → ytInitialPlayerResponse nunca se asignaba
  // → la función de decode del parámetro 'n' no se registraba → 403 en googlevideo.
  //
  // El pruning de ads de scripts inline YA está cubierto por:
  //   • setter de ytInitialPlayerResponse (Object.defineProperty debajo)
  //   • setter de playerResponse (Object.defineProperty debajo)
  // Esas capas actúan sobre el OBJETO ya parseado (sin riesgo de corrupción de JSON).

  // ── ytInitialPlayerResponse — primera carga ─────────────────────────────────
  (function () {
    var _val = window.ytInitialPlayerResponse;
    if (_val && FOCUS_ENABLED) pruneAds(_val);
    Object.defineProperty(window, "ytInitialPlayerResponse", {
      get: function () { return _val; },
      set: function (data) {
        if (data && FOCUS_ENABLED) pruneAds(data);
        _val = data;
      },
      configurable: true,
    });
  })();

  // ── playerResponse — navegación SPA ────────────────────────────────────────
  (function () {
    var _val = null;
    Object.defineProperty(window, "playerResponse", {
      get: function () { return _val; },
      set: function (data) {
        if (data && FOCUS_ENABLED) pruneAds(data);
        _val = data;
      },
      configurable: true,
    });
  })();

  // ── fetch override (Capa 1) ─────────────────────────────────────────────────
  // Solo bloquea dominios de terceros. Las respuestas de YouTube pasan sin tocar
  // para no activar enforcement mode server-side.
  if (!window.__SF__) {
    window.__SF__ = window.fetch;
    window.fetch = async function () {
      if (!FOCUS_ENABLED) return window.__SF__.apply(this, arguments);

      var arg0 = arguments[0];
      var url = String(
        arg0 && typeof arg0 === "object" && arg0.url ? arg0.url : arg0 || ""
      );

      if (shouldBlock(url)) {
        return new Response("", {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        });
      }

      return window.__SF__.apply(this, arguments);
    };
  }

  // ── XHR override (Capa 1) ───────────────────────────────────────────────────
  if (!window.__SX__) {
    window.__SX__ = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
      var urlStr = String(url);
      this.__stride_blocked__ = FOCUS_ENABLED && shouldBlock(urlStr);
      return window.__SX__.apply(this, arguments);
    };
    var origSend = XMLHttpRequest.prototype.send;
    window.__SS__ = origSend;
    XMLHttpRequest.prototype.send = function () {
      if (this.__stride_blocked__) {
        Object.defineProperty(this, "readyState",   { get: function () { return 4; }, configurable: true });
        Object.defineProperty(this, "status",       { get: function () { return 200; }, configurable: true });
        Object.defineProperty(this, "responseText", { get: function () { return ""; }, configurable: true });
        return;
      }
      return origSend.apply(this, arguments);
    };
  }

  // ── CSS injection (Capa 2) ──────────────────────────────────────────────────
  function injectCSS() {
    if (document.getElementById("stride-focus-css")) return;
    var s = document.createElement("style");
    s.id = "stride-focus-css";
    s.textContent = [
      "#masthead-ad",
      "ytd-ad-slot-renderer",
      "ytd-banner-promo-renderer",
      "ytd-statement-banner-renderer",
      "ytd-in-feed-ad-layout-renderer",
      "ytd-promoted-sparkles-web-renderer",
      "ytd-display-ad-renderer",
      ".ytd-display-ad-renderer",
      ".video-ads",
      "#player-ads",
      "ytd-rich-item-renderer[is-ad]",
      "ytd-promoted-video-renderer",
      '[id^="google_ads"]',
      '[id^="div-gpt-ad"]',
      "ins.adsbygoogle",
      ".adsbygoogle",
      '[class*="banner-ad"]',
      '[class*="ad-banner"]',
      '[class*="advertisement"]',
      '[id*="advertisement"]',
    ].join(",") + "{ display:none !important }";
    var target = document.head || document.documentElement;
    if (!target) return; // guard: about:blank sin DOM todavía
    target.appendChild(s);
  }

  injectCSS();
  document.addEventListener("DOMContentLoaded", injectCSS);

  // ── Toggle dinámico ──────────────────────────────────────────────────────────
  // fetch/XHR leen FOCUS_ENABLED en cada llamada — no hace falta
  // remover/restaurar los overrides al toggle. Solo el CSS se añade/quita.
  window.addEventListener("stride:focus-toggle", function (e) {
    FOCUS_ENABLED = !(e && e.detail && e.detail.enabled === false);
    if (FOCUS_ENABLED) {
      injectCSS();
    } else {
      var el = document.getElementById("stride-focus-css");
      if (el) el.remove();
    }
  });

  // ── Ad skip automático (Capa 5) ──────────────────────────────────────────────
  // Detecta anuncios pre-roll en SPA navigation y los salta avanzando el tiempo
  // del video. Indistinguible server-side de un usuario que hace clic "Saltar".
  // ytInitialPlayerResponse pruning cubre la primera carga (no llega a cargar el ad).
  (function () {
    var _skipTimer = null;
    var _wasMuted = false;

    function trySkip() {
      var btn = document.querySelector('.ytp-skip-ad-button, .ytp-ad-skip-button');
      if (btn && btn.offsetParent) { btn.click(); return; }
      var v = document.querySelector('video.html5-main-video');
      if (v && isFinite(v.duration) && v.duration > 0) v.currentTime = v.duration;
    }

    setInterval(function () {
      if (!FOCUS_ENABLED) {
        if (_skipTimer) { clearInterval(_skipTimer); _skipTimer = null; }
        return;
      }
      var player = document.querySelector('#movie_player');
      var adActive = player && player.classList.contains('ad-showing');

      if (adActive && !_skipTimer) {
        var v = document.querySelector('video.html5-main-video');
        if (v) { _wasMuted = v.muted; v.muted = true; }
        trySkip();
        _skipTimer = setInterval(function () {
          var p = document.querySelector('#movie_player');
          if (!p || !p.classList.contains('ad-showing')) {
            clearInterval(_skipTimer); _skipTimer = null;
            var v2 = document.querySelector('video.html5-main-video');
            if (v2) v2.muted = _wasMuted;
          } else {
            trySkip();
          }
        }, 200);
      }
    }, 300);
  })();

  const adblockInterstitialObserver = new MutationObserver(() => {
    const selectors = [
      'ytd-enforcement-message-view-model',
      '.ytd-enforcement-message-view-model',
      'tp-yt-paper-dialog.ytd-enforcement-message-view-model',
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        const root = el.closest('tp-yt-paper-dialog') || el;
        root.remove();
        break;
      }
    }
  });

  if (document.body) {
    adblockInterstitialObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  } else {
    document.addEventListener("DOMContentLoaded", function () {
      adblockInterstitialObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    });
  }
})();
