// ═══ [ENREGISTREMENT · 04/10/2026] VERSION 20261004a · « go enregistrement » (Rams, 04/10 03:19) ═══
// POURQUOI : les portes TALENT (15 min → 24 h) et SOURCE + RÉPLIQUE (24 h → 7 j) n'ont trouvé, sur les données publiques
// archivées, aucun avantage après frais. Les liquidations (USDT-M) et les news n'ont AUCUNE archive : on ne peut les juger que
// sur ce que l'app enregistre elle-même. Ce module garde donc, chaque jour, ce que l'app reçoit déjà — la porte TALENT les jugera
// dans 6 à 12 mois. Il garde aussi le carnet et le flux de trades TELS QUE L'APP LES VOIT : une archive Binance existe pour ces
// deux-là (carnet futures toutes les 30 s depuis 01/2023, tous les trades spot depuis 2017), mais l'app n'en voit qu'une partie
// (4 trades/s/paire au plus, 20 niveaux du carnet spot) ; l'enregistrement permet de comparer sa vue à la vérité.
//
// LECTURE SEULE — ce module :
//   • n'écrit RIEN dans S, ne remplace ni n'enveloppe AUCUNE fonction de l'app, n'ouvre AUCUNE connexion, n'appelle jamais
//     Math.random (le rejeu le sème) ; seule trace indirecte possible : un rappel de plus de 1 s serait noté par le chrono de 00
//     (S.chainLog / S.perfLog.lent, diagnostic), comme n'importe quel code ;
//   • LIT S.flowStats (seaux 1 min des trades, 02), S.liqStats (seaux 1 min des liquidations, 02), S.orderBook (résumé du carnet, 02),
//     _newsStore (news, 10e7), l'état des connexions (_bgCollectorWSMap, _realCandlesState, _liqWs, 02) ;
//   • ajoute un ÉCOUTEUR 'message' (addEventListener) sur la connexion des liquidations de l'app (_liqWs, 02) — son onmessage reste intact.
// STOCKAGE : base IndexedDB à part « aura_rec » (jamais NEXUS_DB ni le snapshot), un lot par minute. Une fois le jour UTC terminé,
// le jour part en UN fichier dans Download/AURA (même écriture native que les backups) : aura_guardian_full_rec-AAAAMMJJ.json
// (préfixe des backups : c'est le seul nom que DriveSync envoie sur le Drive ; « _rec- » le distingue d'un backup, dont le nom
// continue par une date ; les restaurations de 09b3 refusent ce fichier). Le jour n'est effacé de la base qu'APRÈS l'écriture
// réussie. Si l'écriture échoue ou manque depuis plus de 14 jours, le plus vieux jour est effacé et la perte est ENREGISTRÉE.
// FICHIER : un objet JSON { _type:'aura_rec', v, day, part, parts, lines, written, rec:[ une ligne par enregistrement ] } :
//   boot — démarrage : version, token du script, définitions et règles ; cfg — paires suivies (à l'état prêt, puis à chaque changement) ;
//   m    — une minute finie (t = début de minute) : al = battements vivants (1 toutes les 2 s, 30 au plus), lq = battements avec la
//          connexion des liquidations ouverte et écoutée, off = battements hors ligne, ws = { paire : battements avec son flux @trade
//          ouvert }, cp = { paire : battements où elle est la paire du graphique (02 n'enregistre PAS ses trades dans S.flowStats) } ;
//          fl = { paire : seau de trades de l'app } ; lqs = { paire : seau de liquidations de l'app } ; lqx = liquidations des autres
//          symboles reçues pendant la minute [n, long $, short $] ; ob = [ résumés du carnet reçus depuis la ligne précédente ] ;
//          re:1 = seau d'une minute déjà écrite qui a changé (trade arrivé en retard) : l'analyse garde la DERNIÈRE ligne par
//          paire et par t ; une ligne re ne porte pas de couverture ;
//   lq   — une liquidation brute d'une paire de l'app, telle que Binance l'envoie (w = heure de réception) ;
//   nw   — un article de news la première fois que l'app l'a (w = vu, ts = date de l'article) ; nf = état du fetch des news ;
//   perte — lignes perdues (file pleine, n, de/à) ou jour effacé faute d'écriture.
// Un fichier = les lots rangés ce jour-là (UTC) : la fin du jour J peut être au début du fichier J+1 ; chaque ligne porte son
// heure, l'analyse trie. Un article revu après un redémarrage réapparaît (l'app recharge 24 h) : l'analyse garde le premier w.
(function () {
  'use strict';
  if (typeof window === 'undefined' || window._rec) return;

  var REC_V = '20261004a';
  var DB_NAME = 'aura_rec', DB_STORE = 'lots';
  var MIN = 60000, GRACE_MS = 5000, CATCHUP_MIN = 30, KEEP_DAYS = 14, PART_MAX = 3000000;
  var QMAX = 20000, QBYTES = 8000000, BATCH_MAX = 5000, IDB_TIMEOUT_MS = 10000, NEWS_SEEN_MS = 48 * 3600000;
  var FILE_PREFIX = 'aura_guardian_full_rec-';
  var FL_FIELDS = ['buyQ', 'sellQ', 'buyN', 'sellN', 'notionalUsd', 'bigBuy', 'bigSell', 'bigBuyUsd', 'bigSellUsd'];
  var LQS_FIELDS = ['longUsd', 'shortUsd', 'n'];
  var OB_FIELDS = ['pair', 't', 'imb', 'bidQ', 'askQ', 'spreadPct', 'bidWallP', 'bidWallQ', 'askWallP', 'askWallQ'];
  var RULES = 'fl.t, lqs.t et lq.E = heure Binance ; w, ob.t, nw.w = heure de la tablette (écart ≈ lq.w − lq.E). Sans regard sur le futur, ' +
    'une minute t ne sert à une décision prise à D que si t + 60000 ≤ D (l\'app, elle, lit aussi la minute en cours). Binance n\'envoie ' +
    'que la dernière liquidation par symbole et par seconde : lq est déjà un échantillon. Lignes re : garder la dernière par paire et par t.';

  var st = { v: REC_V, started: 0, lines: 0, flushes: 0, lastFlush: 0, lost: 0, liqAttach: 0, files: [], dropped: [], err: null, warn: null };
  var queue = [], qBytes = 0, lostN = 0, lostFrom = 0, lostTo = 0, seq = 0, flushing = false, flushAgain = false, finalizing = false, dbP = null;
  var lastMinDone = 0, flowSent = {}, liqSent = {}, obLastT = {}, obPending = [], cover = {}, liqX = {};
  var liqSock = null, newsSeen = new Map(), newsSig = '', newsPrunedAt = 0, cfgSig = null;
  var SCRIPT_V = null;
  try { var cs = document.currentScript, mv = cs && /[?&]v=([0-9a-z]+)/.exec(cs.src || ''); SCRIPT_V = mv ? mv[1] : null; } catch (e) {}

  // ── outils purs ──
  function pad(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }
  function dayUTC(ms) { var d = new Date(ms); return d.getUTCFullYear() + pad(d.getUTCMonth() + 1, 2) + pad(d.getUTCDate(), 2); }
  function rn(x, sig) { x = Number(x); if (!isFinite(x)) return null; if (x === 0) return 0; return Number(x.toPrecision(sig || 10)); }
  function flowRow(b) {
    return [rn(b.buyQ), rn(b.sellQ), b.buyN | 0, b.sellN | 0, rn(b.notional), b.bigBuy | 0, b.bigSell | 0, rn(b.bigBuyUsd), rn(b.bigSellUsd)];
  }
  function liqRow(b) { return [rn(b.longUsd), rn(b.shortUsd), b.n | 0]; }
  function obRow(pair, ob) {
    var bw = ob.bidWall, aw = ob.askWall;
    return [pair, ob.t, rn(ob.imb), rn(ob.bidQ), rn(ob.askQ), ob.spreadPct == null ? null : rn(ob.spreadPct),
      bw ? rn(bw.p) : null, bw ? rn(bw.q) : null, aw ? rn(aw.p) : null, aw ? rn(aw.q) : null];
  }
  function push(o) {
    var s = JSON.stringify(o);
    queue.push(s); qBytes += s.length;
    if (queue.length > QMAX || qBytes > QBYTES) {   // file pleine (base indisponible longtemps) : les plus vieilles lignes partent, la perte est comptée
      var now = Date.now(), k = 0;
      while (queue.length > 1 && (queue.length > QMAX || qBytes > QBYTES)) { qBytes -= queue.shift().length; k++; }
      if (k) { if (!lostN) lostFrom = now; lostN += k; lostTo = now; st.lost += k; }
    }
  }
  function liveS() { try { return (typeof S !== 'undefined' && S) ? S : null; } catch (e) { return null; } }
  function timed(p, what) {   // une base qui ne répond plus ne bloque jamais l'enregistreur : 10 s, puis on repart de zéro
    return new Promise(function (res, rej) {
      var done = false, to = setTimeout(function () { if (done) return; done = true; dbP = null; rej(new Error(what + ' : pas de réponse en ' + IDB_TIMEOUT_MS / 1000 + ' s')); }, IDB_TIMEOUT_MS);
      p.then(function (v) { if (done) return; done = true; clearTimeout(to); res(v); }, function (e) { if (done) return; done = true; clearTimeout(to); rej(e); });
    });
  }
  // Découpe un jour en fichiers de PART_MAX caractères au plus (une écriture de 3,5 Mo est déjà prouvée sur la tablette).
  function splitParts(day, lines, max, nowIso) {
    max = max || PART_MAX;
    var groups = [], cur = [], size = 0;
    for (var i = 0; i < lines.length; i++) {
      var L = lines[i].length + 2;
      if (cur.length && size + L > max) { groups.push(cur); cur = []; size = 0; }
      cur.push(lines[i]); size += L;
    }
    if (cur.length) groups.push(cur);
    var n = groups.length;
    return groups.map(function (g, j) {
      var head = { _type: 'aura_rec', v: REC_V, day: day, part: j + 1, parts: n, lines: g.length, written: nowIso || new Date().toISOString() };
      var h = JSON.stringify(head);
      return { name: FILE_PREFIX + day + (n > 1 ? '-p' + (j + 1) : '') + '.json', text: h.slice(0, -1) + ',"rec":[\n' + g.join(',\n') + '\n]}' };
    });
  }

  // ── battement (2 s) : couverture de la minute courante + écouteur des liquidations ──
  function watch(now) {
    now = now || Date.now();
    var M = Math.floor(now / MIN) * MIN, c = cover[M] || (cover[M] = { a: 0, l: 0, o: 0, ws: {}, cp: {} });
    c.a++;
    var w = null; try { w = (typeof _liqWs !== 'undefined') ? _liqWs : null; } catch (e) {}
    if (w && w !== liqSock && typeof w.addEventListener === 'function') {
      try { w.addEventListener('message', onLiqMsg); liqSock = w; st.liqAttach++; } catch (e) {}
    }
    if (w && w === liqSock && w.readyState === 1) c.l++;
    if (window._auraNetOffline) c.o++;
    try {
      var wm = (typeof _bgCollectorWSMap !== 'undefined') ? _bgCollectorWSMap : null;
      if (wm) Object.keys(wm).forEach(function (p) { if (wm[p] && wm[p].readyState === 1) c.ws[p] = (c.ws[p] || 0) + 1; });
      var rc = (typeof _realCandlesState !== 'undefined') ? _realCandlesState : null;
      if (rc && rc.wsConnected && rc.wsPair) c.cp[rc.wsPair] = (c.cp[rc.wsPair] || 0) + 1;
    } catch (e) {}
  }
  function onLiqMsg(evt) {
    try {
      var m = JSON.parse(evt.data), o = m && m.o;
      if (!o) return;
      var now = Date.now();
      if (typeof _liqPairOf === 'function' && !_liqPairOf(o.s)) {   // autre symbole : agrégé par minute (aucune archive USDT-M)
        var M = Math.floor(now / MIN) * MIN, x = liqX[M] || (liqX[M] = [0, 0, 0]), usd = Number(o.ap || o.p) * Number(o.q);
        if (isFinite(usd) && usd > 0) { x[0]++; if (String(o.S).toUpperCase() === 'SELL') x[1] += usd; else x[2] += usd; }
        return;
      }
      push({ k: 'lq', w: now, E: m.E, s: o.s, S: o.S, o: o.o, f: o.f, q: o.q, p: o.p, ap: o.ap, X: o.X, l: o.l, z: o.z, T: o.T });
    } catch (e) {}
  }

  // ── relevé (15 s) : minutes finies (couverture, seaux de trades et de liquidations), carnet, news, paires ──
  function collect(now) {
    now = now || Date.now();
    var S0 = liveS();
    var done = Math.floor((now - GRACE_MS) / MIN) * MIN;   // minutes < done : finies (5 s de grâce pour les trades en retard)
    var from = Math.max(lastMinDone ? lastMinDone + MIN : done - MIN, done - CATCHUP_MIN * MIN);
    var fresh = {}, late = {}, keepFrom = done - (CATCHUP_MIN + 1) * MIN;
    function scan(src, sent, key, rowFn) {
      if (!src || typeof src !== 'object') return;
      Object.keys(src).forEach(function (pair) {
        var arr = src[pair]; if (!Array.isArray(arr)) return;
        var sp = sent[pair] || (sent[pair] = {});
        for (var i = 0; i < arr.length; i++) {
          var b = arr[i];
          if (!b || typeof b.t !== 'number' || b.t >= done || b.t < keepFrom || sp[b.t] === b.n) continue;
          sp[b.t] = b.n;
          var tgt = (lastMinDone && b.t <= lastMinDone) ? late : fresh, o = tgt[b.t] || (tgt[b.t] = {});
          (o[key] || (o[key] = {}))[pair] = rowFn(b);
        }
        Object.keys(sp).forEach(function (t) { if (Number(t) < keepFrom) delete sp[t]; });
      });
    }
    scan(S0 && S0.flowStats, flowSent, 'fl', flowRow);
    scan(S0 && S0.liqStats, liqSent, 'lqs', liqRow);
    var ob = S0 && S0.orderBook;
    if (ob && typeof ob === 'object') {
      Object.keys(ob).forEach(function (pair) {
        var o = ob[pair];
        if (!o || typeof o.t !== 'number' || o.t <= (obLastT[pair] || 0)) return;
        obLastT[pair] = o.t; obPending.push(obRow(pair, o));
      });
    }
    Object.keys(late).map(Number).sort(function (a, b) { return a - b; }).forEach(function (M) {
      var line = { k: 'm', re: 1, t: M, w: now }; if (late[M].fl) line.fl = late[M].fl; if (late[M].lqs) line.lqs = late[M].lqs; push(line);
    });
    var mins = {};
    for (var M = from; M < done; M += MIN) if (cover[M] || liqX[M]) mins[M] = 1;
    Object.keys(fresh).forEach(function (k) { mins[k] = 1; });
    var list = Object.keys(mins).map(Number).sort(function (a, b) { return a - b; });
    list.forEach(function (M, j) {
      var c = cover[M] || { a: 0, l: 0, o: 0, ws: {}, cp: {} }, f = fresh[M] || {};
      var line = { k: 'm', t: M, w: now, al: c.a, lq: c.l, off: c.o, ws: c.ws };
      if (Object.keys(c.cp).length) line.cp = c.cp;
      if (f.fl) line.fl = f.fl;
      if (f.lqs) line.lqs = f.lqs;
      if (liqX[M]) line.lqx = [liqX[M][0], rn(liqX[M][1]), rn(liqX[M][2])];
      if (j === list.length - 1 && obPending.length) { line.ob = obPending; obPending = []; }
      push(line);
    });
    if (done - MIN > lastMinDone) lastMinDone = done - MIN;
    Object.keys(cover).forEach(function (k) { if (Number(k) <= lastMinDone - CATCHUP_MIN * MIN) delete cover[k]; });
    Object.keys(liqX).forEach(function (k) { if (Number(k) <= lastMinDone) delete liqX[k]; });
    collectCfg(now);
    collectNews(now);
    return list.length;
  }
  function collectCfg(now) {
    try {
      if (!window._stateReady) return;
      var pairs = (typeof _bgPairsToWatch === 'function') ? _bgPairsToWatch() : [];
      var sig = (pairs || []).join(',');
      if (sig === cfgSig) return;
      cfgSig = sig; push({ k: 'cfg', w: now, pairs: pairs, doc: SCRIPT_V });
    } catch (e) {}
  }
  function collectNews(now) {
    var ns = null; try { ns = (typeof _newsStore !== 'undefined') ? _newsStore : null; } catch (e) {}
    if (!ns || !ns.byId) return;
    var sig = [ns.lastFetch, ns.lastTry, ns.lastHttp, ns.lastError, ns.count].join('|');
    if (sig !== newsSig) { newsSig = sig; push({ k: 'nf', w: now, lf: ns.lastFetch || 0, lt: ns.lastTry || 0, http: ns.lastHttp || 0, err: ns.lastError || null, n: ns.count || 0, calls: ns.calls || 0 }); }
    Object.keys(ns.byId).forEach(function (id) {
      if (newsSeen.has(id)) return;
      var a = ns.byId[id]; if (!a) return;
      newsSeen.set(id, now);
      push({ k: 'nw', w: now, id: a.id, ts: a.ts, title: a.title, src: a.source, coins: a.coins, s: a.s, bull: a.bull, bear: a.bear });
    });
    if (now - newsPrunedAt > 3600000) {
      newsPrunedAt = now;
      newsSeen.forEach(function (t, id) { if (now - t > NEWS_SEEN_MS) newsSeen.delete(id); });
    }
  }

  // ── base IndexedDB à part ──
  function idb() {
    if (dbP) return dbP;
    dbP = timed(new Promise(function (res, rej) {
      try {
        if (typeof indexedDB === 'undefined' || !indexedDB) throw new Error('IndexedDB absente');
        var rq = indexedDB.open(DB_NAME, 1);
        rq.onupgradeneeded = function () { var d = rq.result; if (!d.objectStoreNames.contains(DB_STORE)) d.createObjectStore(DB_STORE); };
        rq.onsuccess = function () {
          var d = rq.result;
          d.onversionchange = function () { try { d.close(); } catch (e) {} dbP = null; };
          d.onclose = function () { dbP = null; };
          res(d);
        };
        rq.onerror = function () { rej(rq.error || new Error('open')); };
        rq.onblocked = function () { rej(new Error('ouverture bloquée')); };
      } catch (e) { rej(e); }
    }), 'ouverture');
    dbP.catch(function () { dbP = null; });
    return dbP;
  }
  function req(d, mode, fn) {
    return timed(new Promise(function (res, rej) {
      var tx = d.transaction(DB_STORE, mode), out;
      var r = fn(tx.objectStore(DB_STORE));
      if (r) r.onsuccess = function () { out = r.result; };
      tx.oncomplete = function () { res(out); };
      tx.onerror = tx.onabort = function () { rej(tx.error || new Error('tx')); };
    }), 'base');
  }
  function rangeOf(day) { return IDBKeyRange.bound(day + '|', day + '|￿'); }

  // ── vidage (60 s, et dès que l'écran se coupe) : un lot de 5 000 lignes au plus par écriture ──
  function flush(now) {
    if (flushing) { flushAgain = true; return Promise.resolve(false); }
    if (!queue.length && !lostN) return Promise.resolve(false);
    now = now || Date.now();
    if (lostN) {   // la perte part avec le lot suivant, datée
      var pl = JSON.stringify({ k: 'perte', w: now, n: lostN, de: lostFrom, a: lostTo, why: 'file pleine (base indisponible)' });
      queue.unshift(pl); qBytes += pl.length; lostN = 0;
    }
    var batch = queue.splice(0, Math.min(queue.length, BATCH_MAX)), bb = 0;
    batch.forEach(function (l) { bb += l.length; }); qBytes -= bb;
    var key = dayUTC(now) + '|' + pad(now, 13) + '|' + pad(st.started, 13) + '|' + pad(seq++, 6);
    flushing = true;
    return idb().then(function (d) { return req(d, 'readwrite', function (s) { return s.put(batch.join('\n'), key); }); })
      .then(function () { st.flushes++; st.lines += batch.length; st.lastFlush = now; if (st.err && /^base/.test(st.err)) st.err = null; return true; },
        function (e) { st.err = 'base : ' + ((e && e.message) || e); queue = batch.concat(queue); qBytes += bb; return false; })
      .then(function (r) { flushing = false; if (r && (flushAgain || queue.length)) { flushAgain = false; if (queue.length) setTimeout(function () { flush(); }, 0); } else flushAgain = false; return r; });
  }

  // ── fichiers : un jour UTC fini → Download/AURA, puis effacé de la base ──
  function fsPlugin() { try { return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem) || null; } catch (e) { return null; } }
  function fsWrite(FS, name, text) {
    var combos = [['EXTERNAL_STORAGE', 'Download/AURA/'], ['EXTERNAL', 'Download/AURA/'], ['DOCUMENTS', 'AURA_Backups/']], i = 0;
    function next() {
      if (i >= combos.length) return Promise.resolve(null);
      var c = combos[i++];
      return Promise.resolve().then(function () { return FS.writeFile({ path: c[1] + name, data: text, directory: c[0], encoding: 'utf8', recursive: true }); })
        .then(function () { return c[0] + ':' + c[1] + name; }, next);
    }
    return next();
  }
  function finalize(now) {
    if (finalizing) return Promise.resolve(null);
    now = now || Date.now();
    finalizing = true;
    var today = dayUTC(now), FS = fsPlugin(), again = false;
    return idb().then(function (d) {
      return req(d, 'readonly', function (s) { return s.getAllKeys(IDBKeyRange.upperBound(today + '|', true)); }).then(function (keys) {
        var days = [];
        (keys || []).forEach(function (k) { var D = String(k).split('|')[0]; if (days[days.length - 1] !== D) days.push(D); });
        if (!days.length) return null;
        var D = days[0];
        function dropIfTooOld(why) {   // l'écriture a échoué ou manque : on ne garde que KEEP_DAYS jours ; la perte est notée
          st.err = why;
          if (days.length <= KEEP_DAYS) { again = false; return null; }
          again = true;
          return req(d, 'readwrite', function (s) { return s.delete(rangeOf(D)); })
            .then(function () { st.dropped.push(D); push({ k: 'perte', w: now, day: D, why: why + ' — plus de ' + KEEP_DAYS + ' jours en attente' }); return null; });
        }
        if (!FS) return dropIfTooOld('écriture native absente : ' + days.length + ' jour(s) gardé(s) dans la base');
        if (window._perfOp) window._perfOp('rec:fichier ' + D);
        return req(d, 'readonly', function (s) { return s.getAll(rangeOf(D)); }).then(function (vals) {
          var lines = [];
          (vals || []).forEach(function (v) { String(v || '').split('\n').forEach(function (l) { if (l) lines.push(l); }); });
          var parts = splitParts(D, lines, PART_MAX, new Date(now).toISOString()), names = [];
          var chain = Promise.resolve(true);
          parts.forEach(function (p) { chain = chain.then(function (ok) { return ok ? fsWrite(FS, p.name, p.text).then(function (w) { if (w) names.push(w); return !!w; }) : false; }); });
          return chain.then(function (ok) {
            if (!ok) return dropIfTooOld('écriture refusée pour ' + D + (names.length ? ' (partie ' + (names.length + 1) + ')' : ''));
            if (names.some(function (n) { return n.indexOf('DOCUMENTS:') === 0; })) st.warn = D + ' écrit dans Documents/AURA_Backups : DriveSync ne le voit pas';
            return req(d, 'readwrite', function (s) { return s.delete(rangeOf(D)); }).then(function () {
              st.files.push(names.join(' + ')); if (st.files.length > 30) st.files.splice(0, st.files.length - 30);
              st.err = null; again = days.length > 1; return names;
            });
          });
        });
      });
    }).catch(function (e) { st.err = 'fichier : ' + ((e && e.message) || e); again = false; return null; })
      .then(function (r) { finalizing = false; if (again) setTimeout(function () { finalize(); }, 5000); return r; });
  }

  // ── démarrage ──
  st.started = Date.now();
  push({ k: 'boot', w: st.started, v: REC_V, doc: SCRIPT_V, fl: FL_FIELDS, lqs: LQS_FIELDS, ob: OB_FIELDS, regles: RULES,
    flux: 'échantillon de l\'app : 4 trades/s/paire au plus, aucun pour la paire du graphique ; gros trade = notionnel > 8 × sa moyenne mobile, 500 $ au moins',
    carnet: 'REST /api/v3/depth limit=20 spot, une paire toutes les 5 s ; résumé de 02 (_parseDepth)' });
  window._recStatus = st;
  window._rec = { V: REC_V, dayUTC: dayUTC, flowRow: flowRow, liqRow: liqRow, obRow: obRow, splitParts: splitParts, watch: watch, collect: collect,
    flush: flush, finalize: finalize, onLiqMsg: onLiqMsg, queue: function () { return queue.slice(); } };
  setInterval(function () { try { watch(); } catch (e) {} }, 2000);
  setInterval(function () { try { collect(); } catch (e) { st.err = 'relevé : ' + (e && e.message); } }, 15000);
  setInterval(function () { flush(); }, 60000);
  setTimeout(function () { finalize(); }, 90000);
  setInterval(function () { finalize(); }, 600000);
  try {
    var bye = function () { try { collect(); } catch (e) {} flush(); };
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') bye(); });
    window.addEventListener('pagehide', bye);
  } catch (e) {}
})();
