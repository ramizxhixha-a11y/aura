// ═══ [GO LIBÉRER · 21/11/2026] VERSION 20261121b · L'EV LIBÉRÉE : LES BOTS Y DÉCIDENT COMME DANS L'AA ═══
// Rams (21/11 09:00) : « Laisse le bot prendre, arrête avec tes voix qui ne servent à rien » ; (09:03) « C'est un système de simulation, bloquer
// l'EV ça ne sert à rien ». Deux blocages de l'EV sont levés, rien d'autre :
//   1. la voix tendance lâche l'EV : UNE fois, S.tendance.reel.on = 0 — l'interrupteur qui existait déjà dans 15b (sync n'ouvre ni ne ferme plus
//      rien, _tlrTientEV rend faux) ; 09c:75 laisse donc les bots ouvrir en EV. Marque reel.libre = '20261121' : remettre la voix = reel.on = 1, ce
//      module ne la recoupe pas. Revérifié toutes les 20 s (un import de backup d'avant ce jour la rallumerait). Une position de la voix encore
//      ouverte reste à Rams (✕ de la fiche). La poche (js/15) n'a pas d'argent : elle continue de mesurer, sans effet.
//   2. le seuil appris ne décide plus des ouvertures EN EV : _thLevel (03) rend null en EV → 10f prend les portes par régime, comme dans l'AA.
//      Le moteur continue de MESURER (trades virtuels, bilan aux horizons, _thPick). Le RE — seul chemin vers l'argent réel — garde le seuil.
// Tout le reste ne change pas : AUTO / MANU (Rams), réseau, anti-revenge, plafonds de positions, jamais sous zéro, urgence, Bunker, garde-fous des
// positions, et l'AA. Écrit à part (sans retoucher 03 ni 15b) : les bancs qui épinglent leur texte restent vrais.
(function () {
  'use strict';
  var MARQUE = '20261121';

  // 2 · le seuil appris ne ferme plus l'EV (le RE le garde ; hors EV / RE, _thLevel rendait déjà null)
  function enveloppe() {
    var o = (typeof window !== 'undefined') ? window._thLevel : null;
    if (typeof o !== 'function' || o._libre) return false;
    var f = function () {
      try { if (typeof S !== 'undefined' && S && S.tradingMode === 'paperReal') return null; } catch (e) {}
      return o.apply(this, arguments);
    };
    f._libre = true; f._avant = o;
    window._thLevel = f;
    return true;
  }

  // 1 · la voix lâche l'EV, une fois
  function lacher() {
    try {
      if (typeof S === 'undefined' || !S || !S.tendance || typeof S.tendance !== 'object') return false;
      var r = S.tendance.reel;
      if (!r || typeof r !== 'object' || r.v !== 1 || r.libre === MARQUE) return false;
      r.libre = MARQUE;
      if (r.on !== 1) return false;
      r.on = 0;
      if (S.chainLog) {
        S.chainLog.push({ icon: '🔓', desc: 'Libéré (Rams, 21/11) · la voix tendance ne tient plus l\'EV : les bots y décident, comme dans l\'AA',
          hash: (typeof rndHash === 'function') ? rndHash() : Math.random().toString(36).slice(2, 8),
          time: (typeof nowStr === 'function') ? nowStr() : new Date().toLocaleTimeString() });
        if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
      }
      return true;
    } catch (e) { return false; }
  }

  function tic() { enveloppe(); if (typeof window !== 'undefined' && window._stateReady === true) lacher(); }
  enveloppe();
  if (typeof setInterval === 'function') {
    var boot = setInterval(function () { if (typeof window !== 'undefined' && window._stateReady === true) { clearInterval(boot); tic(); } }, 500);
    setInterval(tic, 20000);
  }
  if (typeof window !== 'undefined') window._libre = { marque: MARQUE, lacher: lacher, enveloppe: enveloppe };
})();
