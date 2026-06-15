/* ▓▓▓ native-bridge.js · VERSION 2 ▓▓▓
   Pont natif AURA <-> app Android (Capacitor + cordova-plugin-background-mode).
   1) Service premier plan : garde le process en vie ecran eteint.
   2) Audio silencieux en boucle : empeche Chrome/WebView de RALENTIR
      les timers JS (simTick) quand l'ecran est eteint.
   TOTALEMENT INERTE dans un navigateur normal (ni Capacitor ni cordova). */
(function () {
  'use strict';

  var isNative = !!(window.Capacitor || window.cordova);
  function log(m) { try { console.log('[native-bridge] ' + m); } catch (e) {} }

  /* ============ 1) SERVICE PREMIER PLAN ============ */
  function activateBg() {
    var bm = window.cordova && window.cordova.plugins && window.cordova.plugins.backgroundMode;
    if (!bm) { return; }
    try {
      bm.configure({
        title: 'AURA8', text: 'Bot actif en arriere-plan', icon: 'icon',
        color: '38d4f5', resume: true, hidden: false, silent: false, bigText: false
      });
    } catch (e) { log('configure KO: ' + e); }
    try { bm.enable(); log('background mode ENABLE'); } catch (e) { log('enable KO: ' + e); }
    try { if (typeof bm.disableBatteryOptimizations === 'function') bm.disableBatteryOptimizations(); } catch (e) {}
    try {
      bm.on('activate', function () {
        log('ARRIERE-PLAN actif');
        try { if (typeof bm.disableWebViewOptimizations === 'function') bm.disableWebViewOptimizations(); } catch (e) {}
      });
    } catch (e) { log('on() KO: ' + e); }
  }

  /* ============ 2) ANTI-BRIDAGE : AUDIO SILENCIEUX ============ */
  /* WAV 100% silencieux (inaudible), joue en boucle a volume normal :
     le systeme voit "media en lecture" => ne ralentit plus le JS. */
  var SILENT = 'data:audio/wav;base64,UklGRmQGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YUAGAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA';
  var _ka = null, _kaOn = false;

  function startKeepAlive() {
    if (_kaOn || !isNative) return;
    try {
      _ka = new Audio(SILENT);
      _ka.loop = true;
      _ka.setAttribute('playsinline', '');
      var p = _ka.play();
      if (p && p.then) {
        p.then(function () { _kaOn = true; log('keepalive audio ON'); })
         .catch(function (e) { _kaOn = false; log('keepalive play KO: ' + e); });
      } else { _kaOn = true; }
    } catch (e) { log('keepalive KO: ' + e); }
  }

  if (isNative) {
    setTimeout(startKeepAlive, 2000);                          // tentative immediate
    var kick = function () { startKeepAlive(); };              // sinon au 1er geste
    document.addEventListener('touchstart', kick, { once: true });
    document.addEventListener('click', kick, { once: true });
    document.addEventListener('visibilitychange', function () {  // relance si coupe
      if (_ka) { try { var q = _ka.play(); if (q && q.catch) q.catch(function () {}); } catch (e) {} }
    });
  }

  /* ============ Demarrage ============ */
  document.addEventListener('deviceready', activateBg, false);
  var tries = 0;
  var iv = setInterval(function () {
    tries++;
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.backgroundMode) {
      clearInterval(iv); activateBg();
    } else if (tries > 20) { clearInterval(iv); }
  }, 500);
})();
