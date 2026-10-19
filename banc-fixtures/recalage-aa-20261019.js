// [TÉMOIN · 19/10/2026] texte de js/18-recalage-aa.js tel que livré (20261019a) et exécuté sur la tablette le 19/10 15:50 — retiré de l'app ensuite (go nettoyage, suite). Ne rien y retoucher : banc-nettoyage-argent.js (partie H) le rejoue.
// ═══ [GO NETTOYAGE · 19/10/2026] VERSION 20261019a · recalage de l'AA (ETAT n° 51, décision de Rams du 18/10 : « retirer ce que les trades n'expliquent pas ») ═══
// POURQUOI : le 18/10 entre 10:30 et 15:18 UTC (app en 20261018b, avant le correctif « go levier » n° 25), l'AA a fait des trades MANUELS de 1 000 à 30 000 $
// de mise sur ~1 000 $ à soi, avec le levier. Son portefeuille porte depuis un écart que ses fermetures n'expliquent pas. Cause SUPPOSÉE (chemin exact non
// reconstitué ; le registre fiscal ne montre que 1 619,85 $ d'emprunt « juste à temps ») : l'emprunt du levier effacé à la fermeture sans être repris
// (n° 25, corrigé par go levier). Le MONTANT, lui, est mesuré (pont, etat.json toutes les 5 min ; backup du 18/10 21:37, registre des frais `fees.feeLog`) :
//   · 10:30:04 UTC — AA 999,48 $ (trading 952,09 + caisse 47,39), aucune position, 2 152 fermetures ;
//   · entre les deux, 33 fermetures : résultat brut +227,xx $, frais −546,xx $ → net −319,36 $ (rien d'autre n'a bougé : caisse 47,39 $ toute la journée,
//     aucun apport, aucun transfert ; les intervalles calmes se recalculent au centime, ex. 14:32 → 14:48 : −6,10 $ pour trois fermetures à −6,094 $) ;
//   · 19:22:02 UTC — AA 4 387,76 $ (trading 4 340,37 + caisse 47,39), aucune position, 2 185 fermetures ;
//   → attendu 999,48 − 319,36 = 680,12 $ ; écart = 3 707,64 $ (au centime près : etat.json arrondit au centime). L'estimation « ≈ 3 160 $ » du 18/10
//     ne comptait que le résultat BRUT des fermetures (+225 $), pas leurs frais (−546 $).
//   Supposé (non mesuré) : la dette de l'AA était nulle à 10:30 (aucun levier tenu avant ; portefeuille AA en pente douce de 1 068 à 1 003 $ du 08 au 17/10).
// CE QUE FAIT CE FICHIER : si le portefeuille AA porte encore cet écart (≥ 2 185 fermetures, trading ≥ 3 707,64 $, recalage pas encore fait), un bandeau le dit
// (contrôle au lancement puis toutes les minutes tant que ce n'est pas fait : l'AA peut tenir des positions, son trading est alors sous l'écart) ; Rams appuie sur « Recaler l'AA » → une question dit le montant exact, d'où il vient et ce qui ne change pas → sur « OK » seulement :
// trading AA − 3 707,64 $ ; les repères de résultat posés PENDANT l'écart (départ de session, du jour, de la semaine, référence du bunker, courbe, lignes
// journalières depuis le 18/10) baissent du même montant — le recalage n'est ni une perte ni un gain du jour ; une trace `w._recalages` (gardée avec
// walletStore) empêche de le refaire ; journal. « Plus tard » : rien ne change, le bandeau revient au lancement suivant.
// CE QU'IL NE FAIT PAS : aucune position ouverte ni fermée, rien sur EV / RE, ni l'historique, ni les agents, ni le registre fiscal (l'écart n'est pas
// un trade), ni AUTO / MANU, ni la décision. Sans écart il est INERTE (un seul contrôle au lancement, aucun élément à l'écran).
// À retirer (ce fichier et sa ligne du HTML) quand `_recalageAA.etat()` dit `fait` sur la tablette.
(function () {
  'use strict';
  var ID = 'n51-20261018', ECART = 3707.64, MIN_FERMETURES = 2185, DATE_ECART = '2026-10-18';
  function w() { try { return (S && S.walletStore && S.walletStore.sim) || null; } catch (e) { return null; } }
  function num(v) { v = Number(v); return isFinite(v) ? v : 0; }
  function fait(x) { return !!(x && Array.isArray(x._recalages) && x._recalages.some(function (r) { return r && r.id === ID; })); }
  function fermetures(x) { return Math.max(num(x && x.totalTrades), num(x && x.fees && x.fees.tradeCount)); }
  // l'état du portefeuille AA : 'fait' | 'porte' (l'écart est là, le bandeau s'affiche) | 'avant' (état d'avant l'écart final) | 'manque' (trading < écart) | 'absent'
  function etat(x) {
    x = x || w();
    if (!x) return 'absent';
    if (fait(x)) return 'fait';
    if (fermetures(x) < MIN_FERMETURES) return 'avant';
    if (num(x.tradingAccount) < ECART) return 'manque';
    return 'porte';
  }
  // le plan : ce qui change, sans rien écrire
  function plan(x) {
    x = x || w();
    var p = { ok: etat(x) === 'porte', etat: etat(x), ecart: ECART, trading: [num(x && x.tradingAccount), num(x && x.tradingAccount) - ECART], reperes: [] };
    if (!p.ok) return p;
    var bas = function (v) { return typeof v === 'number' && isFinite(v) && v >= ECART; };
    if (bas(x._startPortfolio)) p.reperes.push(['départ de session', x._startPortfolio]);
    if (x.bunker && bas(x.bunker.capRef)) p.reperes.push(['référence du bunker', x.bunker.capRef]);
    var pp = x.pnlPeriod || {};
    ['todayStartPortfolio', 'weekStartPortfolio', 'monthStartPortfolio'].forEach(function (k) { if (bas(pp[k])) p.reperes.push([k, pp[k]]); });
    p.courbe = (Array.isArray(x.pnlHistory) ? x.pnlHistory : []).filter(bas).length;
    p.jours = (Array.isArray(pp.history) ? pp.history : []).filter(function (h) { return h && String(h.date) >= DATE_ECART && (bas(h.start) || bas(h.end)); }).length;
    return p;
  }
  function appliquer() {
    var x = w(), p = plan(x);
    if (!p.ok) return { ok: false, etat: p.etat };
    var bas = function (v) { return typeof v === 'number' && isFinite(v) && v >= ECART; }, moins = function (v) { return Math.max(0, v - ECART); };
    var avant = { trading: num(x.tradingAccount), portefeuille: num(x.portfolio) };
    x.tradingAccount = num(x.tradingAccount) - ECART;
    if (bas(x._startPortfolio)) x._startPortfolio = moins(x._startPortfolio);
    if (x.bunker && bas(x.bunker.capRef)) x.bunker.capRef = moins(x.bunker.capRef);
    var pp = x.pnlPeriod;
    if (pp && typeof pp === 'object') {
      ['todayStartPortfolio', 'weekStartPortfolio', 'monthStartPortfolio'].forEach(function (k) { if (bas(pp[k])) pp[k] = moins(pp[k]); });
      if (Array.isArray(pp.history)) pp.history.forEach(function (h) {
        if (!h || String(h.date) < DATE_ECART) return;
        var s0 = bas(h.start), e0 = bas(h.end);
        if (!s0 && !e0) return;
        if (s0) h.start = Math.round(moins(h.start) * 100) / 100;
        if (e0) h.end = Math.round(moins(h.end) * 100) / 100;
        h.pnlUsd = Math.round((num(h.end) - num(h.start)) * 100) / 100;
        h.pnlPct = num(h.start) > 0 ? Math.round(h.pnlUsd / num(h.start) * 10000) / 100 : 0;
      });
    }
    if (Array.isArray(x.pnlHistory)) x.pnlHistory = x.pnlHistory.map(function (v) { return bas(v) ? moins(v) : v; });
    try { x.portfolio = (typeof _computePortfolio === 'function') ? _computePortfolio(x) : num(x.cashAccount) + num(x.tradingAccount); } catch (e) {}
    if (!Array.isArray(x._recalages)) x._recalages = [];
    x._recalages.push({ id: ID, t: Date.now(), montant: -ECART, raison: 'ETAT n° 51 : écart que les fermetures de l’AA n’expliquent pas, le 18/10 (cause supposée : emprunt du levier resté au trading)', avant: avant, apres: { trading: num(x.tradingAccount), portefeuille: num(x.portfolio) } });
    try {
      S.chainLog.push({ icon: '⚖️', desc: 'Recalage AA (ETAT n° 51, confirmé par Rams) · −' + ECART.toFixed(2) + ' $ retirés du trading AA : l’écart que ses fermetures du 18/10 n’expliquent pas · trading ' + avant.trading.toFixed(2) + ' → ' + num(x.tradingAccount).toFixed(2) + ' $', hash: (typeof rndHash === 'function' ? rndHash() : ''), time: (typeof nowStr === 'function' ? nowStr() : '') });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
    } catch (e) {}
    try { if (typeof saveState === 'function') saveState(true); } catch (e) {}
    return { ok: true, avant: avant, apres: { trading: num(x.tradingAccount), portefeuille: num(x.portfolio) } };
  }
  function question(p) {
    return 'RECALER L’AA ?\n\n'
      + 'Ton portefeuille AA porte ' + ECART.toFixed(2) + ' $ que ses trades n’expliquent pas. Mesure : le 18/10, 999,48 $ à 12:30, puis 33 fermetures à −319,36 $ net de frais, '
      + 'donc 680,12 $ attendus à 21:22 au lieu de 4 387,76 $.\n'
      + 'Cause supposée (non prouvée) : l’emprunt du levier de tes trades manuels, resté au trading à leur fermeture (défaut corrigé depuis).\n\n'
      + 'Trading AA : ' + p.trading[0].toFixed(2) + ' $ → ' + p.trading[1].toFixed(2) + ' $.\n'
      + 'Les repères de résultat posés depuis (départ de session, du jour, bunker, courbe — ceux posés avant le 18/10 ne bougent pas) baissent du même montant : ce n’est ni une perte ni un gain.\n\n'
      + 'Rien d’autre ne change : positions, historique, agents, fiscal, EV et RE, AUTO / MANU.';
  }
  // ───────────────────────── l'écran : un bandeau, seulement si l'AA porte l'écart ─────────────────────────
  var bandeau = null;
  function oter() { try { if (bandeau) bandeau.remove(); } catch (e) {} bandeau = null; }
  function poser(titre, texte, boutons, fond) {
    if (typeof document === 'undefined' || !document.body) return;
    if (!bandeau) {
      bandeau = document.createElement('div'); bandeau.id = 'recalageAABandeau';
      bandeau.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99998;color:#fff;padding:12px 14px;box-shadow:0 4px 20px rgba(0,0,0,.5);font-family:-apple-system,system-ui,sans-serif;display:flex;align-items:center;gap:10px;flex-wrap:wrap';
      document.body.appendChild(bandeau);
    }
    bandeau.style.background = fond || 'linear-gradient(135deg,#0c4a7a,#125fb3)';
    while (bandeau.firstChild) bandeau.removeChild(bandeau.firstChild);
    var bloc = document.createElement('div'); bloc.style.cssText = 'flex:1 1 240px;min-width:200px';
    var t1 = document.createElement('div'); t1.style.cssText = 'font-weight:800;font-size:14px;margin-bottom:3px'; t1.textContent = titre;
    var t2 = document.createElement('div'); t2.style.cssText = 'font-size:12px;line-height:1.45;opacity:.96'; t2.textContent = texte;
    bloc.appendChild(t1); bloc.appendChild(t2); bandeau.appendChild(bloc);
    (boutons || []).forEach(function (b) {
      var el = document.createElement('button'); el.textContent = b[0];
      el.style.cssText = 'border:0;border-radius:10px;padding:9px 14px;font-weight:800;font-size:13px;cursor:pointer;' + (b[2] ? 'background:rgba(255,255,255,.18);color:#fff' : 'background:#fff;color:#0c3a63');
      el.onclick = b[1]; bandeau.appendChild(el);
    });
  }
  function proposer() {
    var p = plan();
    if (!p.ok) { oter(); return; }
    poser('⚖️ AA : ' + ECART.toFixed(2) + ' $ que les trades n’expliquent pas',
      'Mesuré sur tes trades manuels du 18/10 (cause supposée : l’emprunt du levier resté au trading). Ta décision : le retirer. Une question te dira le montant exact avant tout changement.',
      [['Recaler l’AA', function () {
        var q = plan(); if (!q.ok) { oter(); return; }
        var ok = false; try { ok = (typeof confirm === 'function') && confirm(question(q)); } catch (e) { ok = false; }
        if (!ok) { try { if (typeof showToast === 'function') showToast('Recalage annulé · rien n’a changé', 2500, 'user'); } catch (e) {} return; }
        var r = appliquer();
        if (!r.ok) { poser('Recalage impossible', 'L’AA n’est plus dans l’état mesuré (' + r.etat + ') : rien n’a changé.', [['Fermer', oter, true]], 'linear-gradient(135deg,#7a4a0c,#b36b12)'); return; }
        poser('✅ AA recalé', 'Trading AA ' + r.avant.trading.toFixed(2) + ' $ → ' + r.apres.trading.toFixed(2) + ' $ (−' + ECART.toFixed(2) + ' $).', [['Fermer', oter, true]], 'linear-gradient(135deg,#0c6b3a,#12a35a)');
        setTimeout(oter, 12000);
        try { if (typeof renderHome === 'function') renderHome(); } catch (e) {}
      }], ['Plus tard', function () { plusTard = true; oter(); }, true]]);
  }
  window._recalageAA = { etat: function () { return etat(); }, plan: function () { return plan(); }, ID: ID, ECART: ECART, _etatDe: etat, _planDe: plan, _appliquer: appliquer };
  // le contrôle : quand l'état est relu (09b2 pose window._stateReady ; 2 min au plus), puis une fois par minute tant que le recalage n'est pas fait — l'AA
  // peut tenir des positions au lancement, son trading est alors sous l'écart (relecture du 19/10). « Plus tard » l'écarte jusqu'au lancement suivant.
  var plusTard = false;
  if (typeof window !== 'undefined' && typeof setInterval === 'function') {
    var essais = 0, premier = true, iv = setInterval(function () {
      essais++;
      var pret = false; try { pret = window._stateReady === true; } catch (e) {}
      if (!pret && essais < 120) return;
      if (!premier && essais % 60 !== 0) return;
      premier = false;
      try {
        var e0 = etat();
        if (e0 === 'fait') { clearInterval(iv); return; }
        if (e0 === 'porte' && !plusTard && !bandeau) proposer();
      } catch (e) { try { window._decErr && window._decErr(e); } catch (_e) {} }
    }, 1000);
  }
})();
