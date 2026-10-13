// ═══ [GO DÉMO · 12/10/2026] VERSION 20261012a · « go démo » (Rams, 12/10 22:51 : « on l'enlève complètement, le mode démo ne sert à rien ») ═══
// POURQUOI : le Mode Démo (05, v51) écrivait un compte FICTIF dans le vrai état — compte du mode à l'écran, historique de chaque paire, fitness de
// tous les agents — et ne gardait le vrai qu'en mémoire vive. Le 11/10/2026 à 18:33, un appui sur la carte « Gestion de Crise » puis l'app passée en
// arrière-plan (la sauvegarde de sortie de 09b2 n'avait pas la garde du 09/08) ont remplacé le compte EV de Rams — 1 085,46 $, 342 trades — par
// 880,20 $ et 47 trades ; la relance a rendu la fiction définitive. Le Mode Démo est retiré de l'app dans cette livraison (05, 07, 09b2, 02, css 22).
// Ce fichier fait UNE chose : rendre son vrai compte à un portefeuille qui porte encore ces faux chiffres, depuis un backup d'AVANT l'accident
// choisi par Rams, en gardant tout ce qui s'est passé depuis (trades, frais, registre fiscal).
//
// COMMENT (la règle, écrite avant le code — banc-demo-retire.js la rejoue contre le VRAI texte du Mode Démo gardé en témoin) :
//   1) EMPREINTE : les trois cartes du Mode Démo posaient dans CHAQUE paire un faux trade parmi trois, sans prix ni mise (« Il y a 15min », …).
//      Un portefeuille qui en porte encore un est un compte faux ; la carte reconnue donne le compte fictif posé (880,20 / 875,00 / 5,20 pour « Crise »).
//   2) Tout ce qui est arrivé APRÈS l'accident s'est ajouté au compte fictif exactement comme il se serait ajouté au vrai (mises, gains, pertes, frais).
//      Donc : vrai compte d'aujourd'hui = compte d'aujourd'hui + (vrai compte d'avant − compte fictif de la carte). Rien d'autre n'est calculé.
//   3) Le backup choisi doit être le dernier état d'AVANT : il ne porte aucun faux trade, n'a pas de position ouverte, et son compteur de fermetures
//      (fees.tradeCount, que le Mode Démo ne touchait pas) + les fermetures faites depuis = le compteur d'aujourd'hui. Sinon : refus, avec la raison.
//      Refus aussi dès que l'écart ne serait plus celui du backup : une position ouverte à l'instant de l'accident (une fermeture, ou une position en
//      cours, sans son ouverture après le faux trade), un transfert caisse ↔ trading, un apport, le dépôt fiscal ou le levier qui ont bougé depuis,
//      une fermeture d'urgence « tout fermer » (06 : elle ne laisse ni ligne d'historique ni frais) ; et si le backup n'est pas complet (compteurs des
//      paires qui ne font pas le total, historique ou agents absents) ou si le compte rendu sortait négatif.
//   4) Par paire : historique = celui du backup + les vrais trades faits depuis (le faux trade sort) ; compteurs = ceux du backup + ce qui s'est ajouté.
//   5) Les repères de résultat posés APRÈS l'accident (départ de session, du jour, de la semaine, du mois, courbe, référence du bunker) montent du même
//      écart : la correction n'est ni un gain ni une perte. Le cumul reprend l'écart que la relance avait compté comme une perte.
//   6) Agents : un siège reprend sa fitness du backup seulement s'il est le MÊME qu'au backup (nom, cycle de naissance), s'il porte encore la valeur
//      tirée par la carte (non entière, dans sa bande — ou 350 juste, quand la relance a reposé à 350 un siège sans preuve tiré sous 350, 09b2) et si
//      aucun jugement ne l'a réécrite : pas jugé depuis le backup, ou jugé SANS preuve (03 _fitJudge n'écrit rien sous 5 jugements). Les autres se
//      sont recalculés seuls à leur premier jugement : pas touchés. Le portefeuille de marché d'un siège (lmsrWallet) n'est jamais touché.
//   LIMITES DITES : une ligne d'historique journalier est écrite au centime — remontée, elle peut différer d'un centime ; l'app ne garde que 40 lignes
//   d'historique par paire (09b2) : après une vingtaine de trades sur une même paire le faux trade en sort, et la réparation refuse (« à faire avec Claude »).
// CE QUE CE FICHIER NE FAIT PAS : il n'ouvre ni ne ferme aucune position, ne touche ni la décision, ni les deux autres portefeuilles, ni le registre
// fiscal, ni les frais, ni la poche tendance ; il ne lit le fichier que comme du JSON (jamais exécuté) ; sans empreinte il est INERTE (aucune
// minuterie après le premier contrôle, aucun élément à l'écran). À retirer quand plus aucun compte ne porte l'empreinte (le dire dans la passation).
(function () {
  'use strict';
  var V = '20261012a';
  var MODES = ['sim', 'paperReal', 'real'], NOM = { sim: 'AA', paperReal: 'EV', real: 'RE' };
  // Les trois cartes du Mode Démo retiré : le compte fictif posé, la fitness tirée (± 100), et les trois faux trades [paire, sens, gain $, gain %, heure dite, âge au lancement en ms].
  var CARTES = {
    debutant: { nom: 'Débutant', portfolio: 523.40, tradingAccount: 521.80, cashAccount: 1.60, fit: 650,
      trades: [['BTC/USDT', 'buy', 4.20, 0.84, 'Il y a 2h', 7200000], ['ETH/USDT', 'sell', -2.10, -0.42, 'Il y a 5h', 18000000], ['SOL/USDT', 'buy', 6.80, 1.36, 'Hier', 86400000]] },
    pro: { nom: 'Trader Pro', portfolio: 8542.30, tradingAccount: 8400.00, cashAccount: 142.30, fit: 1750,
      trades: [['BTC/USDT', 'buy', 85.20, 1.02, 'Il y a 30min', 1800000], ['ETH/USDT', 'buy', 42.10, 0.84, 'Il y a 1h', 3600000], ['XRP/USDT', 'sell', -18.30, -0.37, 'Il y a 2h', 7200000]] },
    crise: { nom: 'Gestion de Crise', portfolio: 880.20, tradingAccount: 875.00, cashAccount: 5.20, fit: 320,
      trades: [['BTC/USDT', 'buy', -28.40, -0.57, 'Il y a 15min', 900000], ['DOGE/USDT', 'buy', -12.60, -0.25, 'Il y a 1h', 3600000], ['SOL/USDT', 'sell', 8.20, 0.16, 'Il y a 2h', 7200000]] }
  };
  var EPS = 1e-6;
  var num = function (v) { return (typeof v === 'number' && isFinite(v)) ? v : 0; };
  var estObj = function (o) { return !!o && typeof o === 'object' && !Array.isArray(o); };
  var a2 = function (v) { return Math.round(v * 100) / 100; };
  var entier = function (v) { return typeof v === 'number' && isFinite(v) && v >= 0 && v === Math.floor(v); };
  // un siège a-t-il une preuve (03 _fitCurrent : record aux horizons, ou 5 jugements) ? true / false ; null si l'app ne le dit pas
  var preuve = function (a) { try { if (typeof window._fitCurrent === 'function') return window._fitCurrent(a) !== null; } catch (e) {} return null; };
  var eng = function (w) { var s = 0, L = Array.isArray(w.openPositions) ? w.openPositions : []; for (var i = 0; i < L.length; i++) s += num(L[i] && Number(L[i].stakeUsdt)); return s; };

  // Un faux trade du Mode Démo : la copie exacte d'un des neuf, SANS prix, mise ni quantité (un vrai trade fermé les porte toujours — 02 closePosition).
  function faux(t) {
    if (!estObj(t) || t.type !== 'position' || typeof t.time !== 'string') return null;
    if ('price' in t || 'stakeUsdt' in t || 'amount' in t || 'entryPrice' in t) return null;
    for (var k in CARTES) {
      var L = CARTES[k].trades;
      for (var i = 0; i < L.length; i++) if (t.pair === L[i][0] && t.side === L[i][1] && t.pnlUsdt === L[i][2] && t.pnl === L[i][3] && t.time === L[i][4]) return { carte: k, i: i, pnlUsdt: L[i][2], age: L[i][5], ts: num(t.ts) };
    }
    return null;
  }
  // L'empreinte d'un portefeuille : par paire, les faux trades trouvés. cartes = les cartes vues (une seule attendue) ; lance = l'heure du lancement de la session de l'accident.
  function trace(w) {
    var out = { n: 0, paires: {}, cartes: [], lance: 0 };
    if (!estObj(w) || !estObj(w.pairStates)) return out;
    for (var p in w.pairStates) {
      var ps = w.pairStates[p]; if (!estObj(ps) || !Array.isArray(ps.trades)) continue;
      for (var i = 0; i < ps.trades.length; i++) {
        var f = faux(ps.trades[i]); if (!f) continue;
        (out.paires[p] = out.paires[p] || []).push(f); out.n++;
        if (out.cartes.indexOf(f.carte) < 0) out.cartes.push(f.carte);
        if (f.ts > 0 && f.ts + f.age > out.lance) out.lance = f.ts + f.age;
      }
    }
    return out;
  }
  function refus(code, msg, extra) { var r = { ok: false, code: code, msg: msg }; if (extra) for (var k in extra) r[k] = extra[k]; return r; }

  // LE PLAN : ne modifie rien. etat = l'état vivant (S), fichier = l'état du backup (la partie « aura »), mode = le portefeuille à rendre.
  function plan(etat, fichier, mode) {
    if (MODES.indexOf(mode) < 0) return refus('mode', 'Portefeuille inconnu.');
    if (!estObj(etat) || !estObj(etat.walletStore) || !estObj(etat.walletStore[mode])) return refus('etat', 'L\'état de l\'app n\'est pas prêt.');
    if (!estObj(fichier) || !estObj(fichier.walletStore) || !estObj(fichier.walletStore[mode]) || !estObj(fichier.walletStore[mode].pairStates))
      return refus('fichier', 'Ce fichier n\'est pas un backup d\'AURA (aucun portefeuille ' + NOM[mode] + ' dedans).');
    var w = etat.walletStore[mode], f = fichier.walletStore[mode], tr = trace(w);
    if (!tr.n) return refus('sain', 'Le compte ' + NOM[mode] + ' ne porte pas les chiffres du Mode Démo : rien à réparer.');
    if (tr.cartes.length !== 1) return refus('empreinte', 'Le compte ' + NOM[mode] + ' porte les traces de plusieurs cartes du Mode Démo : réparation à faire avec Claude.');
    var carte = CARTES[tr.cartes[0]];
    if (trace(f).n) return refus('fichier-faux', 'Ce backup porte lui aussi les faux chiffres du Mode Démo : il date d\'après l\'accident. Choisis-en un plus ancien.');
    // le backup est-il COMPLET ? (un état allégé, sans l'historique des paires ou sans les agents, rendrait un compte amputé sans le dire)
    var entiereF = estObj(f.pnlPeriod) && Array.isArray(fichier.agents) && fichier.agents.length > 0 && fichier.agents.every(function (a) { return estObj(a) && a.id != null && typeof a.fitness === 'number' && isFinite(a.fitness); }), sT = 0, sW = 0;
    for (var pf in f.pairStates) {
      var x0 = f.pairStates[pf];
      if (!estObj(x0) || !Array.isArray(x0.trades) || !x0.trades.every(estObj) || !entier(x0.totalTrades) || !entier(x0.winTrades) || x0.winTrades > x0.totalTrades || typeof x0.totalPnlUsd !== 'number' || !isFinite(x0.totalPnlUsd)) { entiereF = false; break; }
      sT += x0.totalTrades; sW += x0.winTrades;
    }
    if (!entiereF || sT !== f.totalTrades || sW !== f.winTrades) return refus('fichier-partiel', 'Ce backup est incomplet (historique des paires, compteurs ou agents) : il faut un backup complet d\'AURA (« aura_guardian_full »).');
    if (typeof fichier.cycle === 'number' && typeof etat.cycle === 'number' && fichier.cycle > etat.cycle) return refus('futur', 'Ce backup est plus récent que l\'app : ce n\'est pas le bon fichier.');
    if (Array.isArray(f.openPositions) && f.openPositions.length) return refus('positions-avant', 'Ce backup a des positions ouvertes : la réparation ne sait pas les suivre. À faire avec Claude.');
    var chiffres = ['cashAccount', 'tradingAccount', 'portfolio'];
    for (var c = 0; c < chiffres.length; c++) if (typeof f[chiffres[c]] !== 'number' || !isFinite(f[chiffres[c]]) || typeof w[chiffres[c]] !== 'number' || !isFinite(w[chiffres[c]]) || f[chiffres[c]] < 0) return refus('chiffres', 'Compte illisible (' + chiffres[c] + ').');
    if (Math.abs(f.portfolio - (f.cashAccount + f.tradingAccount)) > 0.01) return refus('backup-incoherent', 'Dans ce backup, le compte ' + NOM[mode] + ' ne tombe pas juste (portefeuille ≠ caisse + trading).');
    if (Math.abs(num(f.ownFundsInjected) - num(w.ownFundsInjected)) > EPS || (Array.isArray(f.ownFundsLog) ? f.ownFundsLog.length : 0) !== (Array.isArray(w.ownFundsLog) ? w.ownFundsLog.length : 0))
      return refus('apports', 'Un apport ou un retrait a eu lieu depuis ce backup : la réparation ne sait pas le classer. À faire avec Claude.');
    if (Math.abs(num(f.fiscalReserveAccount) - num(w.fiscalReserveAccount)) > EPS) return refus('fiscal', 'Le dépôt fiscal a bougé depuis ce backup : à faire avec Claude.');
    if (num(f.leverage) || num(w.leverage) || num(f.leverageBorrowed) || num(w.leverageBorrowed)) return refus('levier', 'Le levier est en service sur le compte ' + NOM[mode] + ' : la réparation ne sait pas suivre un emprunt. À faire avec Claude.');
    // journal de caisse (02 : du plus récent au plus ancien, 200 lignes au plus) : un transfert caisse ↔ trading fait depuis le backup a pu l'être AVANT l'accident — la carte l'aurait effacé
    var tF = 0, neufs = 0, transfert = false;
    (Array.isArray(f.cashLog) ? f.cashLog : []).forEach(function (e) { if (estObj(e) && num(e.ts) > tF) tF = e.ts; });
    (Array.isArray(w.cashLog) ? w.cashLog : []).forEach(function (e) { if (estObj(e) && num(e.ts) > tF) { neufs++; if (e.source !== 'profit_split') transfert = true; } });
    // fermeture d'urgence (06 urgenceCloseAll) : la mise et le gain reviennent au trading sans ligne d'historique, sans frais, sans compteur — seul le journal durable la dit
    var tSauve = Date.parse(typeof fichier.savedAt === 'string' ? fichier.savedAt : ''); if (!(tSauve > 0)) tSauve = 0;
    if ((Array.isArray(etat.eventLog) ? etat.eventLog : []).some(function (e) { return estObj(e) && typeof e.d === 'string' && e.d.indexOf('URGENCE:') === 0 && num(e.t) > tSauve && (!e.m || e.m === mode); }))
      return refus('urgence', 'Une fermeture d\'urgence (« tout fermer ») a eu lieu depuis ce backup : elle ne laisse pas de trace dans l\'historique. À faire avec Claude.');
    if (transfert || neufs >= 200) return refus('caisse', 'Un mouvement de caisse fait depuis ce backup ne peut pas être classé (transfert caisse ↔ trading, ou journal de caisse plein) : à faire avec Claude.');
    var dT = f.tradingAccount - carte.tradingAccount, dC = f.cashAccount - carte.cashAccount, dP = dT + dC;

    // ── par paire : l'historique et les compteurs ──
    var paires = {}, depuis = 0, nP = 0;
    for (var p in w.pairStates) {
      var ps = w.pairStates[p]; if (!estObj(ps)) continue;
      var fps = estObj(f.pairStates[p]) ? f.pairStates[p] : null, fx = tr.paires[p];
      if (!fx) {
        if (fps) return refus('empreinte-partielle', 'La paire ' + p + ' ne porte plus son faux trade : la réparation ne peut pas séparer le vrai du faux. À faire avec Claude.');
        depuis += num(ps.totalTrades); continue;   // paire née après l'accident : le Mode Démo ne l'a pas touchée
      }
      if (fx.length !== 1) return refus('empreinte', 'La paire ' + p + ' porte ' + fx.length + ' faux trades : à faire avec Claude.');
      var ft = Array.isArray(fps && fps.trades) ? fps.trades : [], vrais = (ps.trades || []).filter(function (t) { return !faux(t); });
      // une position ouverte AVANT l'accident : la carte a effacé son ouverture de l'historique, et sa mise était déjà sortie du vrai compte — l'écart ne serait plus celui du backup
      var nOuv = 0, nFerm = 0, enCours = 0;
      vrais.forEach(function (t) { if (estObj(t) && t.type === 'open') nOuv++; else if (estObj(t) && t.type === 'position') nFerm++; });
      (Array.isArray(w.openPositions) ? w.openPositions : []).forEach(function (q) { if (q && q.pair === p) enCours++; });
      if (nFerm + enCours > nOuv) return refus('position-accident', 'Une position de ' + p + ' était ouverte au moment de l\'accident : la réparation ne sait pas la suivre. À faire avec Claude.');
      var nT = num(ps.totalTrades) - 1, nW = num(ps.winTrades) - (fx[0].pnlUsdt > 0 ? 1 : 0), nU = num(ps.totalPnlUsd) - fx[0].pnlUsdt;
      if (nT < 0 || nW < 0 || nW > nT) return refus('compteurs', 'Les compteurs de ' + p + ' ne tombent pas juste : à faire avec Claude.');
      depuis += nT; nP++;
      var tous = ft.concat(vrais);
      paires[p] = { trades: tous.length > 100 ? tous.slice(tous.length - 100) : tous, totalTrades: num(fps && fps.totalTrades) + nT, winTrades: num(fps && fps.winTrades) + nW, totalPnlUsd: num(fps && fps.totalPnlUsd) + nU, rendus: ft.length };
    }
    // ── le backup est-il bien le dernier état d'avant ? le compteur de fermetures des frais ne ment pas (le Mode Démo ne le touchait pas) ──
    var cF = (estObj(f.fees) && typeof f.fees.tradeCount === 'number') ? f.fees.tradeCount : null, cW = (estObj(w.fees) && typeof w.fees.tradeCount === 'number') ? w.fees.tradeCount : null;
    if (cF === null || cW === null) return refus('frais', 'Le compteur de fermetures manque (frais) : à faire avec Claude.');
    if (cW - cF !== depuis) {
      var manque = (cW - cF) - depuis;
      return refus('pas-le-dernier', manque > 0 ? ('Ce backup est trop ancien : il manque ' + manque + ' trade' + (manque > 1 ? 's' : '') + ' entre lui et l\'accident. Prends le dernier backup d\'avant.') : 'Ce backup ne correspond pas à ce compte (compteurs de fermetures).', { manque: manque });
    }
    // ── le compte ──
    var W = {};
    W.tradingAccount = w.tradingAccount + dT; W.cashAccount = w.cashAccount + dC; W.portfolio = W.cashAccount + W.tradingAccount + eng(w);
    if (!(W.tradingAccount >= 0) || !(W.cashAccount >= 0)) return refus('resultat', 'Avec ce backup le compte rendu serait négatif : ce n\'est pas le bon fichier. À faire avec Claude.');
    // un repère posé AVANT l'accident vaut celui du backup, ou la valeur du compte dans le backup (constante jusqu'à l'accident : ni ouverture ni fermeture entre les deux) ; sinon il a été posé sur le compte fictif
    var vraiRepere = function (v, vf, cst) { return typeof v !== 'number' || !isFinite(v) || (typeof vf === 'number' && Math.abs(v - vf) < EPS) || Math.abs(v - (cst === undefined ? f.portfolio : cst)) < EPS; };
    // une relance a eu lieu depuis l'accident : elle a recalé le départ de session sur le compte fictif et compté l'écart dans le cumul (09b2 ne le fait que pour un départ > 0)
    var relance = typeof w._startPortfolio === 'number' && w._startPortfolio > 0 && !vraiRepere(w._startPortfolio, f._startPortfolio);
    if (relance) W._startPortfolio = w._startPortfolio + dP;
    if (relance && typeof w._totalCompounded === 'number' && isFinite(w._totalCompounded)) W._totalCompounded = w._totalCompounded + dP;
    var pp = estObj(w.pnlPeriod) ? w.pnlPeriod : null, fp = estObj(f.pnlPeriod) ? f.pnlPeriod : {};
    if (pp) {
      W.pnlPeriod = {};
      ['todayStartPortfolio', 'weekStartPortfolio', 'monthStartPortfolio'].forEach(function (k) { if (typeof pp[k] === 'number' && isFinite(pp[k]) && !vraiRepere(pp[k], fp[k])) W.pnlPeriod[k] = pp[k] + dP; });
      if (Array.isArray(pp.history)) {
        var connu = {}; (Array.isArray(fp.history) ? fp.history : []).forEach(function (h) { if (estObj(h)) connu[h.date] = true; });
        var auCent = function (x, ref) { return typeof ref === 'number' && Math.abs(x - ref) < 0.00501; };   // une ligne est écrite au centime (10c : toFixed(2))
        W.pnlPeriod.history = pp.history.map(function (h) {
          if (!estObj(h) || connu[h.date] === true) return h;   // un jour déjà dans le backup : sa ligne a été écrite avant l'accident (10c n'en écrit qu'une par jour, à la fin du jour)
          // départ d'avant l'accident : le portefeuille du backup, ou le départ du jour du backup (jour de l'accident fini sans relance entre les deux) ; fin d'avant : le portefeuille du backup
          var sAvant = typeof h.start !== 'number' || auCent(h.start, f.portfolio) || (h.date === fp.todayDate && auCent(h.start, fp.todayStartPortfolio)), eAvant = typeof h.end !== 'number' || auCent(h.end, f.portfolio);
          if (sAvant && eAvant) return h;
          var o = {}; for (var k in h) o[k] = h[k];
          if (!sAvant) o.start = a2(h.start + dP);
          if (!eAvant) o.end = a2(h.end + dP);
          if (typeof o.start === 'number' && typeof o.end === 'number') { o.pnlUsd = a2(o.end - o.start); o.pnlPct = o.start > 0 ? a2((o.end - o.start) / o.start * 100) : 0; }
          return o;
        });
      }
    }
    if (Array.isArray(w.pnlHistory)) {   // la courbe : ses premiers points sont encore ceux du backup (même suite) — pas touchés ; les suivants montent, sauf ceux posés entre le backup et l'accident
      var ch = w.pnlHistory, fh = Array.isArray(f.pnlHistory) ? f.pnlHistory : [], k0 = 0;
      for (var n = Math.min(fh.length, ch.length); n > 0 && !k0; n--) { var meme = true; for (var i = 0; i < n && meme; i++) meme = fh[fh.length - n + i] === ch[i]; if (meme) k0 = n; }
      W.pnlHistory = ch.map(function (v, j) { return (j < k0 || typeof v !== 'number' || !isFinite(v) || Math.abs(v - f.portfolio) < EPS) ? v : v + dP; });
    }
    var bk = estObj(w.bunker) ? w.bunker : null, fbk = estObj(f.bunker) ? f.bunker : {};
    if (bk && typeof bk.capRef === 'number' && bk.capRef > 0 && !vraiRepere(bk.capRef, fbk.capRef, f.tradingAccount)) W.bunkerCapRef = bk.capRef + dT;
    // réserve de levier : 02 syncLeverageReserve la pose à l'ouverture, à la fermeture, à la relance = 10 × (caisse + trading + mises) à CET instant (rien d'emprunté : le levier
    // en service est refusé plus haut). Posée après l'accident, elle monte de 10 × l'écart, comme si l'accident n'avait pas eu lieu (la recalculer ici la décalerait d'une
    // mise en cours) ; restée celle du backup, ou posée entre le backup et l'accident (10 × le portefeuille du backup), elle est d'AVANT : pas touchée.
    if (typeof w.leverageReserve === 'number' && isFinite(w.leverageReserve) && !vraiRepere(w.leverageReserve, f.leverageReserve, f.portfolio * 10)) W.leverageReserve = Math.max(0, w.leverageReserve + 10 * dP);
    if ('leverageReserve' in W && !isFinite(W.leverageReserve)) return refus('resultat', 'Avec ce backup le compte rendu ne tombe pas juste (réserve de levier) : ce n\'est pas le bon fichier. À faire avec Claude.');
    var tT = 0, tW = 0, gardes = 0, gardesAvant = 0;
    for (var q in w.pairStates) {
      var qs = w.pairStates[q]; if (!estObj(qs)) continue;
      tT += paires[q] ? paires[q].totalTrades : num(qs.totalTrades); tW += paires[q] ? paires[q].winTrades : num(qs.winTrades);
      gardes += paires[q] ? paires[q].trades.length : (Array.isArray(qs.trades) ? qs.trades.length : 0); gardesAvant += Array.isArray(qs.trades) ? qs.trades.length : 0;
    }
    W.totalTrades = tT; W.winTrades = tW;

    // ── agents : seulement ceux que la carte a laissés avec une valeur tirée au hasard et qu'aucun jugement n'a recalculés depuis le backup ──
    var agents = [], fa = {};
    (Array.isArray(fichier.agents) ? fichier.agents : []).forEach(function (a) { if (estObj(a) && a.id != null) fa[a.id] = a; });
    (Array.isArray(etat.agents) ? etat.agents : []).forEach(function (a) {
      if (!estObj(a) || a.id == null || !fa[a.id]) return;
      var b = fa[a.id], x = a.fitness, y = b.fitness;
      if (typeof x !== 'number' || !isFinite(x) || typeof y !== 'number' || !isFinite(y) || x === y) return;
      if (a.name !== b.name || num(a._bornCycle) !== num(b._bornCycle)) return;                             // le siège a changé de génome depuis le backup (naissance, 07) : sa fitness est celle du nouveau-né
      var sansPreuve = preuve(a) === false;
      var tiree = x !== Math.round(x) && x >= carte.fit - 100 && x <= carte.fit + 100;                      // la valeur de la carte, encore en place (un jugement écrit une fitness entière)
      var reposee = x === 350 && y > 350 && carte.fit - 100 < 350 && sansPreuve && !a.isBot && !a.isMeta && a.id !== 'composite';   // tirée sous 350 puis reposée à 350 par la relance (09b2 : siège sans preuve)
      if (!tiree && !reposee) return;
      if (JSON.stringify(a._judgments || []) !== JSON.stringify(b._judgments || []) && !sansPreuve) return; // jugé depuis le backup AVEC preuve : son prochain jugement la recalcule, pas touché
      agents.push({ id: a.id, name: String(a.name || '').slice(0, 40), de: x, a: y });
    });

    return { ok: true, v: V, mode: mode, carte: tr.cartes[0], carteNom: carte.nom, lance: tr.lance, fichierDate: (typeof fichier.savedAt === 'string' ? fichier.savedAt : null),
      ecart: { portfolio: dP, tradingAccount: dT, cashAccount: dC }, fermeturesDepuis: depuis, pairesRendues: nP, relance: relance,
      avant: { portfolio: w.portfolio, tradingAccount: w.tradingAccount, cashAccount: w.cashAccount, totalTrades: num(w.totalTrades), winTrades: num(w.winTrades), tradesGardes: gardesAvant },
      apres: { portfolio: W.portfolio, tradingAccount: W.tradingAccount, cashAccount: W.cashAccount, totalTrades: tT, winTrades: tW, tradesGardes: gardes },
      compteurFrais: cW, compte: W, paires: paires, agents: agents };
  }

  // L'ÉCRITURE : refait le plan sur l'état du moment (il a pu bouger depuis le choix du fichier) et l'écrit d'un seul tenant. Rend le plan appliqué, ou le refus.
  function appliquer(etat, fichier, mode) {
    var pl = plan(etat, fichier, mode); if (!pl.ok) return pl;
    var w = etat.walletStore[mode], W = pl.compte, k;
    w.tradingAccount = W.tradingAccount; w.cashAccount = W.cashAccount; w.portfolio = W.portfolio;
    if ('_startPortfolio' in W) w._startPortfolio = W._startPortfolio;
    if ('_totalCompounded' in W) w._totalCompounded = W._totalCompounded;
    if (W.pnlPeriod) { for (k in W.pnlPeriod) w.pnlPeriod[k] = W.pnlPeriod[k]; }
    if (W.pnlHistory) w.pnlHistory = W.pnlHistory;
    if ('bunkerCapRef' in W) w.bunker.capRef = W.bunkerCapRef;
    if ('leverageReserve' in W) w.leverageReserve = W.leverageReserve;
    for (var p in pl.paires) { var ps = w.pairStates[p], n = pl.paires[p]; ps.trades = n.trades; ps.totalTrades = n.totalTrades; ps.winTrades = n.winTrades; ps.totalPnlUsd = n.totalPnlUsd; }
    w.totalTrades = W.totalTrades; w.winTrades = W.winTrades;
    var parId = {}; (Array.isArray(etat.agents) ? etat.agents : []).forEach(function (a) { if (a && a.id != null) parId[a.id] = a; });
    pl.agents.forEach(function (x) { var ag = parId[x.id]; if (ag) ag.fitness = x.a; });   // écriture de fitness connue de l'invariant de banc-masque (D4) : la valeur du backup, rendue
    pl.applique = true;
    return pl;
  }

  // ───────────────────────── l'écran : un bandeau, seulement si un compte porte l'empreinte ─────────────────────────
  var st = { v: V, vu: false, modes: [], fait: null, sauve: null, err: null };
  var vivant = function () { try { return (0, eval)('S'); } catch (e) { try { return window.S || null; } catch (e2) { return null; } } };   // S est un const de script (02) : lu comme 09b2 le lit
  var argent = function (v) { var s = (Math.round(v * 100) / 100).toFixed(2).split('.'), e = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f'); return e + ',' + s[1] + '\u00a0$'; };   // 1 082,27 $ : espace fine insécable des milliers, espace insécable avant $
  var quand = function (ms) { var d = new Date(ms), z = function (n) { return (n < 10 ? '0' : '') + n; }; return z(d.getDate()) + '/' + z(d.getMonth() + 1) + ' à ' + z(d.getHours()) + ':' + z(d.getMinutes()); };
  var bandeau = null, choisi = null, plusTard = false, champ = null, lecture = 0;
  function atteints() { var S0 = vivant(), out = []; if (!S0 || !estObj(S0.walletStore)) return out; MODES.forEach(function (m) { var t = trace(S0.walletStore[m]); if (t.n) out.push({ mode: m, trace: t }); }); return out; }
  function poser(titre, texte, boutons, couleur) {
    if (!bandeau) {
      bandeau = document.createElement('div'); bandeau.id = 'demoReparationBandeau';
      bandeau.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99998;color:#fff;padding:12px 14px;box-shadow:0 4px 20px rgba(0,0,0,.5);font-family:-apple-system,system-ui,sans-serif;display:flex;align-items:center;gap:10px;flex-wrap:wrap';
      document.body.appendChild(bandeau);
    }
    bandeau.style.background = couleur || 'linear-gradient(135deg,#7a4a0c,#b36b12)';
    while (bandeau.firstChild) bandeau.removeChild(bandeau.firstChild);
    var bloc = document.createElement('div'); bloc.style.cssText = 'flex:1 1 240px;min-width:200px';
    var t1 = document.createElement('div'); t1.style.cssText = 'font-weight:800;font-size:14px;margin-bottom:3px'; t1.textContent = titre;
    var t2 = document.createElement('div'); t2.style.cssText = 'font-size:12px;line-height:1.45;opacity:.96'; t2.textContent = texte;
    bloc.appendChild(t1); bloc.appendChild(t2); bandeau.appendChild(bloc);
    (boutons || []).forEach(function (b) {
      var el = document.createElement('button'); el.textContent = b[0];
      el.style.cssText = b[2] ? 'flex:0 0 auto;background:#fff;color:#7a4a0c;border:none;border-radius:8px;padding:10px 16px;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit' : 'flex:0 0 auto;background:rgba(255,255,255,.18);color:#fff;border:1px solid rgba(255,255,255,.4);border-radius:8px;padding:10px 13px;font-weight:700;font-size:12px;cursor:pointer;font-family:inherit';
      el.onclick = b[1]; bandeau.appendChild(el);
    });
  }
  function oter() { try { if (bandeau) bandeau.remove(); } catch (e) {} bandeau = null; choisi = null; }
  function accueil() {
    var A = atteints(); st.modes = A.map(function (a) { return a.mode; });
    if (!A.length) { oter(); return; }
    var a = A[0], lance = a.trace.lance;
    poser('⚠️ Compte ' + NOM[a.mode] + ' : ce sont encore les faux chiffres du Mode Démo',
      'Ton vrai compte est dans ton dernier backup d\'AVANT l\'accident' + (lance ? ' (le Mode Démo a été lancé dans la session ouverte le ' + quand(lance) + ')' : '') + '. Choisis ce fichier : je remets ton compte et son historique en place, avec tes trades faits depuis.',
      [['📂 Choisir le backup', function () { ouvrir(a.mode); }, true], ['Plus tard', function () { plusTard = true; oter(); }]]);
  }
  function ouvrir(mode) {
    try { if (champ) champ.remove(); } catch (e) {}
    var inp = champ = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json'; inp.style.display = 'none';
    inp.onchange = function () {
      var fl = inp.files && inp.files[0]; try { inp.remove(); } catch (e) {} if (champ === inp) champ = null;
      if (!fl) return;
      if (fl.size > 60000000) { echec(mode, 'Fichier trop gros pour un backup d\'AURA.'); return; }
      var rd = new FileReader(), moi = ++lecture;   // un fichier choisi pendant qu'un autre se lit : seule la dernière lecture demandée compte
      rd.onerror = function () { if (!plusTard && moi === lecture) echec(mode, 'Le fichier n\'a pas pu être lu.'); };
      rd.onload = function () {
        if (plusTard || moi !== lecture) return;   // « Plus tard » appuyé pendant la lecture : le bandeau ne revient pas
        var o = null; try { o = JSON.parse(String(rd.result)); } catch (e) { echec(mode, 'Ce fichier n\'est pas un backup d\'AURA (JSON illisible).'); return; }
        var etatF = (estObj(o) && o._type === 'aura_guardian_full' && estObj(o.aura)) ? o.aura : o;
        var S0 = vivant(), pl; try { if (window._perfOp) window._perfOp('reparationDemo'); } catch (e) {}
        try { pl = plan(S0, etatF, mode); } catch (e) { st.err = String(e && e.message || e); echec(mode, 'La lecture du backup a échoué : ' + st.err); return; }
        if (!pl.ok) { echec(mode, pl.msg); return; }
        choisi = { mode: mode, etatF: etatF };
        poser('✅ Backup ' + (pl.fichierDate && !isNaN(Date.parse(pl.fichierDate)) ? 'du ' + quand(Date.parse(pl.fichierDate)) + ' ' : '') + 'reconnu',
          'Compte ' + NOM[mode] + ' : ' + argent(pl.avant.portfolio) + ' → ' + argent(pl.apres.portfolio) + ' · ' + pl.avant.totalTrades + ' trades → ' + pl.apres.totalTrades + ' · historique de ' + pl.pairesRendues + ' paires rendu' + (pl.agents.length ? ' · ' + pl.agents.length + ' agent' + (pl.agents.length > 1 ? 's remis' : ' remis') + ' à leur valeur' : '') + '.',
          [['Rendre mon vrai compte', confirmer, true], ['Annuler', function () { choisi = null; accueil(); }]], 'linear-gradient(135deg,#0c5a3a,#128a57)');
      };
      rd.readAsText(fl);
    };
    document.body.appendChild(inp); inp.click();
  }
  function echec(mode, msg) {
    choisi = null;
    poser('❌ Ce fichier ne convient pas', msg, [['📂 Choisir un autre fichier', function () { ouvrir(mode); }, true], ['Plus tard', function () { plusTard = true; oter(); }]], 'linear-gradient(135deg,#7a0c1e,#b3122c)');
  }
  function confirmer() {
    if (!choisi) return;
    var S0 = vivant(), mode = choisi.mode, pl;
    try { pl = appliquer(S0, choisi.etatF, mode); } catch (e) { st.err = String(e && e.message || e); echec(mode, 'La réparation a échoué avant d\'écrire : ' + st.err); return; }
    if (!pl.ok) { echec(mode, pl.msg); return; }
    choisi = null; st.sauve = null; st.fait = { mode: mode, t: Date.now(), portfolio: pl.apres.portfolio, totalTrades: pl.apres.totalTrades, agents: pl.agents.length };
    var ligne = 'Compte ' + NOM[mode] + ' rendu · faux chiffres du Mode démo effacés · ' + argent(pl.apres.portfolio) + ' · ' + pl.apres.totalTrades + ' trades · historique de ' + pl.pairesRendues + ' paires' + (pl.agents.length ? ' · ' + pl.agents.length + ' agents' : '');
    try { if (Array.isArray(S0.chainLog)) S0.chainLog.push({ icon: '✅', desc: ligne, hash: Math.random().toString(36).slice(2, 8), time: new Date().toLocaleTimeString() }); } catch (e) {}
    try { if (typeof window.renderAll === 'function') window.renderAll(); } catch (e) {}
    try { if (typeof window.showToast === 'function') window.showToast('✅ Compte ' + NOM[mode] + ' rendu : ' + argent(pl.apres.portfolio), 4000, 'win'); } catch (e) {}
    poser('✅ Compte ' + NOM[mode] + ' rendu', argent(pl.apres.portfolio) + ' · ' + pl.apres.totalTrades + ' trades · ' + pl.apres.tradesGardes + ' trades dans l\'historique.', [['Fermer', function () { oter(); accueil(); }, true]], 'linear-gradient(135deg,#0c5a3a,#128a57)');
    setTimeout(function () { try { if (bandeau && !choisi && st.sauve !== false) { oter(); accueil(); } } catch (e) {} }, 12000);
    // l'enregistrement, en dernier (09b2 saveState rend une promesse : vrai si l'état est écrit) : s'il répond non, échoue ou manque, le bandeau le dit et reste
    var pasSauve = function () { st.sauve = false; try { if (bandeau && st.fait) poser('✅ Compte ' + NOM[mode] + ' rendu — pas encore enregistré', 'L\'enregistrement n\'a pas répondu. Laisse l\'app ouverte une minute : elle enregistre seule.', [['Fermer', function () { oter(); accueil(); }, true]], 'linear-gradient(135deg,#7a4a0c,#b36b12)'); } catch (e) {} };
    try { var pr = (typeof window.saveState === 'function') ? window.saveState(true) : false; if (pr === false) pasSauve(); else if (pr && typeof pr.then === 'function') pr.then(function (ok) { if (ok === false) pasSauve(); else st.sauve = true; }, pasSauve); } catch (e) { pasSauve(); }
  }

  window._demoReparation = Object.freeze({ V: V, CARTES: CARTES, faux: faux, trace: trace, plan: plan, appliquer: appliquer, atteints: atteints });
  window._demoReparationStatus = st;
  // Un seul contrôle, quand l'état est prêt (au plus 2 min d'attente) : sans empreinte, plus rien ne tourne.
  try {
    var essais = 0, iv = setInterval(function () {
      essais++;
      var pret = false; try { pret = window._stateReady === true; } catch (e) {}
      if (!pret && essais < 120) return;
      clearInterval(iv);
      if (!pret) return;
      st.vu = true;
      try { accueil(); } catch (e) { st.err = String(e && e.message || e); }
    }, 1000);
  } catch (e) {}
})();
