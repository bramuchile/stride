// Inyectado en cada panel WebView para que YouTube y servicios de Google
// vean un entorno Chrome estándar en lugar de WebView2/Edge.
//
// Problema: WebView2 (basado en Edge) expone navigator.userAgentData con
// brands = ["Chromium", "Microsoft Edge"]. YouTube's player JS lee esta API
// (no el User-Agent string) para decidir si inicializa su pipeline de vídeo
// completo, incluyendo el transform del parámetro 'n' en las URLs de stream.
// Si no detecta "Google Chrome" en brands, puede saltarse el transform →
// las peticiones a googlevideo.com reciben 403.
(function () {
  // ── DIAGNÓSTICO — leer valores ANTES de cualquier patch ─────────────────────
  var _vendorBefore  = navigator.vendor;
  var _uadBefore     = navigator.userAgentData;
  var _brandsBefore  = _uadBefore ? (_uadBefore.brands || []).map(function(b){ return b.brand; }) : null;
  var _webdriverBefore = navigator.webdriver;
  console.log("[STRIDE-CC] vendor_before='" + _vendorBefore + "'");
  console.log("[STRIDE-CC] userAgentData.brands_before=" + JSON.stringify(_brandsBefore));
  console.log("[STRIDE-CC] webdriver_before=" + _webdriverBefore);
  console.log("[STRIDE-CC] userAgent=" + navigator.userAgent);

  // ── navigator.vendor ────────────────────────────────────────────────────────
  try {
    if (navigator.vendor !== "Google Inc.") {
      Object.defineProperty(navigator, "vendor", {
        get: function () { return "Google Inc."; },
        configurable: true,
      });
      console.log("[STRIDE-CC] vendor PATCHED → 'Google Inc.'");
    } else {
      console.log("[STRIDE-CC] vendor already 'Google Inc.' — skipped");
    }
  } catch (e) { console.warn("[STRIDE-CC] vendor patch FAILED:", e); }

  // ── navigator.webdriver ─────────────────────────────────────────────────────
  try {
    if (navigator.webdriver) {
      Object.defineProperty(navigator, "webdriver", {
        get: function () { return false; },
        configurable: true,
      });
      console.log("[STRIDE-CC] webdriver PATCHED → false");
    } else {
      console.log("[STRIDE-CC] webdriver already false — skipped");
    }
  } catch (e) { console.warn("[STRIDE-CC] webdriver patch FAILED:", e); }

  // ── navigator.userAgentData ──────────────────────────────────────────────────
  try {
    var uad = navigator.userAgentData;
    if (!uad) {
      console.log("[STRIDE-CC] userAgentData absent — skipping UAD patch");
      return;
    }
    var brands = uad.brands || [];
    var hasChrome = brands.some(function (b) {
      return b.brand === "Google Chrome";
    });
    if (hasChrome) {
      console.log("[STRIDE-CC] userAgentData already has 'Google Chrome' — skipping UAD patch");
      return;
    }

    console.log("[STRIDE-CC] patching userAgentData (no Chrome in brands)");
    var BRANDS = [
      { brand: "Not_A Brand",    version: "8"   },
      { brand: "Chromium",       version: "124" },
      { brand: "Google Chrome",  version: "124" },
    ];
    var FULL_VERSIONS = [
      { brand: "Not_A Brand",    version: "8.0.0.0"        },
      { brand: "Chromium",       version: "124.0.6367.82"  },
      { brand: "Google Chrome",  version: "124.0.6367.82"  },
    ];

    Object.defineProperty(navigator, "userAgentData", {
      get: function () {
        return {
          brands:   BRANDS,
          mobile:   false,
          platform: "Windows",
          getHighEntropyValues: function (hints) {
            return Promise.resolve({
              brands:          BRANDS,
              mobile:          false,
              platform:        "Windows",
              architecture:    "x86",
              bitness:         "64",
              platformVersion: "10.0.0",
              uaFullVersion:   "124.0.6367.82",
              fullVersionList: FULL_VERSIONS,
            });
          },
          toJSON: function () {
            return { brands: BRANDS, mobile: false, platform: "Windows" };
          },
        };
      },
      configurable: true,
    });
    console.log("[STRIDE-CC] userAgentData PATCHED");
  } catch (e) {
    console.warn("[STRIDE-CC] userAgentData patch FAILED:", e);
  }

  // ── DIAGNÓSTICO — valores DESPUÉS del patch ──────────────────────────────────
  console.log("[STRIDE-CC] vendor_after='" + navigator.vendor + "'");
  var _uadAfter = navigator.userAgentData;
  console.log("[STRIDE-CC] userAgentData.brands_after=" +
    JSON.stringify(_uadAfter ? (_uadAfter.brands||[]).map(function(b){return b.brand;}) : null));
})();
