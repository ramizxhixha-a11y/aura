/* ▓▓▓ native-bridge.js · VERSION 4 ▓▓▓
   Pont natif AURA <-> app Android (Capacitor + cordova-plugin-background-mode).
   1) Service premier plan : garde le process en vie ecran eteint.
   2) Anti-bridage : oscillateur Web Audio 45 Hz, gain tres faible, CONTINU
      (aucune boucle, donc aucun micro-trou). Le systeme le compte comme
      "audio actif" en permanence => ne ralentit plus les timers JS
      (simTick + chrono) ecran eteint. La tablette ne reproduit pas 45 Hz :
      aucun son entendu.
   TOTALEMENT INERTE dans un navigateur normal (ni Capacitor ni cordova). */
(function () {
  'use strict';

  var isNative = !!(window.Capacitor || window.cordova);
  function log(m) { try { console.log('[native-bridge] ' + m); } catch (e) {} }

  /* ============ ANTI-BRIDAGE : oscillateur continu ============ */
  var _ac = null, _osc = null, _kaOn = false;

  function startKeepAlive() {
    if (!isNative) return;
    try {
      if (!_ac) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) { log('AudioContext indispo'); return; }
        _ac  = new AC();
        _osc = _ac.createOscillator();
        var g = _ac.createGain();
        _osc.type = 'sine';
        _osc.frequency.value = 45;   // inaudible sur HP de tablette
        g.gain.value = 0.05;         // puissance non nulle, gardee tres basse
        _osc.connect(g); g.connect(_ac.destination);
        _osc.start();
      }
      if (_ac.state === 'suspended' && _ac.resume) {
        _ac.resume().then(function () {
          if (!_kaOn) { _kaOn = true; log('keepalive ON'); }
        }).catch(function (e) { log('resume KO: ' + e); });
      } else if (!_kaOn) {
        _kaOn = true; log('keepalive ON');
      }
    } catch (e) { log('keepalive KO: ' + e); }
  }

  if (isNative) {
    setTimeout(startKeepAlive, 2000);
    var kick = function () { startKeepAlive(); };
    document.addEventListener('touchstart', kick);
    document.addEventListener('click', kick);
    document.addEventListener('visibilitychange', startKeepAlive);
  }

  /* ============ SERVICE PREMIER PLAN ============ */
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
        startKeepAlive();
        try { if (typeof bm.disableWebViewOptimizations === 'function') bm.disableWebViewOptimizations(); } catch (e) {}
      });
    } catch (e) { log('on() KO: ' + e); }
  }

  document.addEventListener('deviceready', activateBg, false);
  var tries = 0;
  var iv = setInterval(function () {
    tries++;
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.backgroundMode) {
      clearInterval(iv); activateBg();
    } else if (tries > 20) { clearInterval(iv); }
  }, 500);
})();
