/* ▓▓▓ native-bridge.js · VERSION 1 ▓▓▓
   Pont natif AURA <-> app Android (Capacitor + cordova-plugin-background-mode).
   Active le service premier plan + wake lock pour que le bot continue de
   tourner ecran eteint. TOTALEMENT INERTE dans un navigateur normal :
   si window.cordova est absent, aucune action n'est faite. */
(function () {
  'use strict';

  function log(m) { try { console.log('[native-bridge] ' + m); } catch (e) {} }

  function activate() {
    var bm = window.cordova && window.cordova.plugins && window.cordova.plugins.backgroundMode;
    if (!bm) { return; }                 // navigateur normal : on ne fait rien

    try {
      bm.configure({
        title:   'AURA8',
        text:    'Bot actif en arriere-plan',
        icon:    'icon',
        color:   '38d4f5',               // cyan AURA
        resume:  true,
        hidden:  false,
        silent:  false,
        bigText: false
      });
    } catch (e) { log('configure KO: ' + e); }

    try { bm.enable(); log('background mode ENABLE'); }
    catch (e) { log('enable KO: ' + e); }

    // Demande (une fois) a sortir AURA de l'optimisation batterie Samsung.
    try { if (typeof bm.disableBatteryOptimizations === 'function') bm.disableBatteryOptimizations(); }
    catch (e) {}

    // A chaque passage en arriere-plan : lever les bridages WebView (timers JS).
    try {
      bm.on('activate', function () {
        log('ARRIERE-PLAN actif');
        try { if (typeof bm.disableWebViewOptimizations === 'function') bm.disableWebViewOptimizations(); }
        catch (e) {}
      });
      bm.on('deactivate', function () { log('retour premier plan'); });
    } catch (e) { log('on() KO: ' + e); }
  }

  // Cordova/Capacitor pret.
  document.addEventListener('deviceready', activate, false);

  // Filet : si deviceready a deja ete emis avant le chargement de ce script.
  var tries = 0;
  var iv = setInterval(function () {
    tries++;
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.backgroundMode) {
      clearInterval(iv);
      activate();
    } else if (tries > 20) {             // ~10 s puis on abandonne (= navigateur normal)
      clearInterval(iv);
    }
  }, 500);
})();
