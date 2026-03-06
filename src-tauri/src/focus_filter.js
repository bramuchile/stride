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

  var YT_PATTERNS = [
    /\/pagead\//,
    /\/api\/stats\/ads/,
    /googlevideo\.com\/videoplayback\?.*ctier=/,
    /\/get_video_info\?.*adformat/,
    /youtube\.com\/pagead\//,
    /youtube\.com\/ptracking/,
    /youtube\.com\/api\/stats\/watchtime.*ad/,
    /\.youtube\.com\/generate_204/,
    /googleads\.g\.doubleclick\.net/,
    /ad\.doubleclick\.net/,
    /securepubads\.g\.doubleclick\.net/,
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
    "auxiliaryUi",
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
  function isYTUrl(url) {
    try {
      var h = new URL(url).hostname;
      return h === "www.youtube.com" || h === "youtube.com" ||
             h.endsWith(".youtube.com") || h === "youtu.be" ||
             h === "youtubei.googleapis.com";
    } catch (e) { return false; }
  }

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

  // ── Helpers para inline scripts (Capas 3 y 4) ───────────────────────────────
  // Patrones que identifican scripts inline con contenido de ads
  var AD_SCRIPT_PATTERNS = [
    /serverContract/,
    /"adPlacements"/,
    /"playerAds"/,
    /"adSlots"/,
  ];

  function hasAdContent(text) {
    return AD_SCRIPT_PATTERNS.some(function (p) { return p.test(text); });
  }

  // Reemplazar arrays de ad keys en texto de script con versiones vacías.
  // Lazy match .*? para no capturar demasiado contenido entre corchetes.
  // El flag /gs: g=reemplazar todas las ocurrencias, s=dotAll (. incluye \n).
  function cleanScriptText(text) {
    return text
      .replace(/"adPlacements"\s*:\s*\[.*?\]/gs, '"adPlacements":[]')
      .replace(/"playerAds"\s*:\s*\[.*?\]/gs, '"playerAds":[]')
      .replace(/"adSlots"\s*:\s*\[.*?\]/gs, '"adSlots":[]');
  }

  // ── CAPA 4 — appendChild / insertBefore override ────────────────────────────
  // YouTube inserta script tags dinámicamente vía appendChild/insertBefore para
  // reconfigurar el player con ads después de que corrieron los init scripts.
  // Interceptar ANTES de la inserción: crear nodo limpio si el script contiene ads.
  // Debe instalarse ANTES del MutationObserver (Capa 3) — si el observer disparara
  // en el mismo ciclo, appendChild ya habrá insertado el nodo limpio.
  (function installCapa4() {
    var _appendChild = Node.prototype.appendChild;
    var _insertBefore = Node.prototype.insertBefore;

    function buildCleanScript(node) {
      if (!FOCUS_ENABLED) return null;
      if (node.nodeName !== "SCRIPT" || node.src) return null;
      var text = node.textContent || "";
      if (!hasAdContent(text)) return null;
      var clean = cleanScriptText(text);
      if (clean === text) return null;
      // Crear nodo limpio copiando atributos del original
      var cleanNode = document.createElement("script");
      cleanNode.textContent = clean;
      var attrs = node.attributes;
      for (var i = 0; i < attrs.length; i++) {
        cleanNode.setAttribute(attrs[i].name, attrs[i].value);
      }
      return cleanNode;
    }

    Node.prototype.appendChild = function (node) {
      var clean = buildCleanScript(node);
      return _appendChild.call(this, clean || node);
    };

    Node.prototype.insertBefore = function (node, ref) {
      var clean = buildCleanScript(node);
      return _insertBefore.call(this, clean || node, ref);
    };

    // Spoofear toString() para que YouTube no detecte el override.
    // Se define directamente en la función, no en Function.prototype,
    // para no afectar a otros métodos.
    try {
      Object.defineProperty(Node.prototype.appendChild, "toString", {
        value: function () { return "function appendChild() { [native code] }"; },
        configurable: true,
      });
      Object.defineProperty(Node.prototype.insertBefore, "toString", {
        value: function () { return "function insertBefore() { [native code] }"; },
        configurable: true,
      });
    } catch (e) {}

    // Guardar referencia al original — no se usa para restore (FOCUS_ENABLED
    // es el guard), pero útil para depuración desde devtools si es necesario.
    window.__SF_AC__ = _appendChild;
  })();

  // ── CAPA 3 — MutationObserver ────────────────────────────────────────────────
  // Segunda línea de defensa para scripts inline que pudieran haber escapado
  // al override de appendChild (ej. innerHTML, parser HTML inicial).
  // Modifica textContent DESPUÉS de la inserción — limita datos que el script
  // dejó en globales; no previene la ejecución (eso lo hace Capa 4).
  (function installCapa3() {
    if (typeof MutationObserver === "undefined") return;

    var observer = new MutationObserver(function (mutations) {
      if (!FOCUS_ENABLED) return;
      for (var m = 0; m < mutations.length; m++) {
        var added = mutations[m].addedNodes;
        for (var n = 0; n < added.length; n++) {
          var node = added[n];
          if (node.nodeName !== "SCRIPT" || node.src) continue;
          var text = node.textContent || "";
          if (!hasAdContent(text)) continue;
          var clean = cleanScriptText(text);
          if (clean === text) continue;
          // Modificar textContent del nodo ya insertado.
          // Útil si YouTube lee script.textContent después de insertar
          // para obtener la configuración del player.
          try {
            Object.defineProperty(node, "textContent", {
              value: clean,
              writable: false,
              configurable: true,
            });
          } catch (e) {}
        }
      }
    });

    var target = document.documentElement || document;
    observer.observe(target, { childList: true, subtree: true });

    window.__SF_MO__ = observer;
  })();

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
  if (!window.__SF__) {
    window.__SF__ = window.fetch;
    window.fetch = async function () {
      if (!FOCUS_ENABLED) return window.__SF__.apply(this, arguments);

      var arg0 = arguments[0];
      var url = String(
        arg0 && typeof arg0 === "object" && arg0.url ? arg0.url : arg0 || ""
      );

      if (isYTUrl(url)) {
        var resp = await window.__SF__.apply(this, arguments);
        try {
          var json = await resp.clone().json();
          pruneAds(json);
          return new Response(JSON.stringify(json), {
            status: resp.status,
            statusText: resp.statusText,
            headers: resp.headers,
          });
        } catch (e) {
          return resp;
        }
      }

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
      this.__stride_blocked__ = FOCUS_ENABLED && !isYTUrl(urlStr) && shouldBlock(urlStr);
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
  // fetch/XHR/appendChild leen FOCUS_ENABLED en cada llamada — no hace falta
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
})();
