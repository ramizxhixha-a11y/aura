// ═══ [GO FIBONACCI · 21/11/2026] VERSION 20261121a · BOT FIBONACCI — LECTURE SEULE, SANS VOTE (Rams 21/11 08:01 « Go Fibonacci ») ═══
// Demande : « un bot qui lit les bougies avec l'indicateur de Fibonacci sur 5, 15, 30 min, 1 h, 4 h, 1 jour ». Il ne vote dans la décision
// que s'il passe la porte (ETAT § 2). Porte rejeu/porte_fibonacci.py (règles figées 21/11 07:08:43 UTC, sha-256 ee4609b3…602c5a) : sur
// 2018-2024, frais compris, AUCUNE des 33 versions (6 unités × 3 reculs, seules ou en confluence) ne passe le test A (meilleur z 1,34 pour
// 4 h / 55, seuil 2,84 / 2,91) ; témoin T2 raté (malchance de la graine, 5 % sur 20 autres) → pas de verdict formel, rien ne peut entrer.
// Donc : le bot LIT et MONTRE, sur la fiche MAN de la paire, la règle exacte de la porte à la dernière bougie close de chaque unité.
// Il n'écrit RIEN dans S (rien de sauvé, rien dans le backup), n'appelle ni openPosition, ni closePosition, ni la décision commune, les
// agents, le seuil appris ou le marché : aucun effet sur un trade, dans aucun mode.
// RÈGLE (celle de la porte, recul N = 55, bougies closes, fenêtre de N bougies consécutives) : H, L = extrêmes de la fenêtre (égalité :
// la plus récente) ; impulsion haussière si L avant H, baissière si H avant L ; LONG si haussière, H pas sur la dernière bougie et clôture
// dans [H − 0,618 R, H − 0,382 R] (stop H − 0,786 R, objectif H) ; SHORT en miroir. Série courte, trouée ou plate → refusée avec son motif,
// jamais un chiffre inventé. Écart volontaire avec la porte : le moteur de trades (une position à la fois, une entrée par vague) n'a pas lieu
// d'être ici : la lecture dit seulement ce que la règle voit à la dernière clôture.
// DONNÉES : klines officielles Binance (REST, 56 bougies, la bougie en cours écartée), demandées SEULEMENT quand la fiche est ouverte, une
// requête à la fois, une unité redemandée quand une nouvelle bougie a fini (au plus toutes les 20 s ; échec : 60 s) ; hors ligne : rien.
// Les 30 min n'existent pas dans S.realCandles : elles viennent du même REST (interval=30m). Prix montré : clôture de la bougie 5 min en cours
// (Binance), jamais ps.price (simulé dans l'AA).
(function () {
  'use strict';
  var FIB_N = 55;
  var FIB_UNITS = [['5m', '5 min', 300000], ['15m', '15 min', 900000], ['30m', '30 min', 1800000], ['1h', '1 h', 3600000],
                   ['4h', '4 h', 14400000], ['1d', '1 j', 86400000]];
  var FIB_MIN_GAP = 20000, FIB_RETRY = 60000, FIB_TIMEOUT = 10000;
  var _fib = { c: {}, busy: false, timer: null, obs: null };

  // Lecture pure. bars = [[openTime, o, h, l, c], …] closes, dans l'ordre. Retour : { ok:false, why, n } ou
  // { ok:true, dir (+1 / −1 / 0), side (+1 LONG / −1 SHORT / 0), H, L, R, stop, tgt, zLo, zHi, close, ts }.
  function _fibRead(bars, N, unitMs) {
    N = N || FIB_N;
    if (!Array.isArray(bars) || bars.length < N) return { ok: false, why: 'court', n: Array.isArray(bars) ? bars.length : 0 };
    var w = bars.slice(bars.length - N), i, H = -Infinity, L = Infinity, tH = -1, tL = -1;
    for (i = 0; i < N; i++) {
      var b = w[i];
      if (!b || !isFinite(b[1]) || !isFinite(b[2]) || !isFinite(b[3]) || !isFinite(b[4])) return { ok: false, why: 'lacunaire', n: N };
      if (unitMs && i > 0 && b[0] - w[i - 1][0] !== unitMs) return { ok: false, why: 'lacunaire', n: N };
      if (b[2] >= H) { H = b[2]; tH = i; }
      if (b[3] <= L) { L = b[3]; tL = i; }
    }
    var R = H - L, last = N - 1, c = w[last][4];
    if (!(R > 0)) return { ok: false, why: 'plat', n: N };
    var dir = tL < tH ? 1 : (tH < tL ? -1 : 0), out = { ok: true, dir: dir, side: 0, H: H, L: L, R: R, close: c, ts: w[last][0] };
    if (dir === 1) { out.zLo = H - 0.618 * R; out.zHi = H - 0.382 * R; }
    else if (dir === -1) { out.zLo = L + 0.382 * R; out.zHi = L + 0.618 * R; }
    if (dir === 1 && tH < last && H - 0.618 * R <= c && c <= H - 0.382 * R) { out.side = 1; out.stop = H - 0.786 * R; out.tgt = H; }
    else if (dir === -1 && tL < last && L + 0.382 * R <= c && c <= L + 0.618 * R) { out.side = -1; out.stop = L + 0.786 * R; out.tgt = L; }
    return out;
  }

  function _fibKey(pair) { return String(pair).replace('/', '_'); }
  function _fibPx(pair, v) {
    if (!isFinite(v)) return '—';
    try { if (typeof pxTxt === 'function') return pxTxt(pair, v); } catch (e) {}
    return Number(v).toPrecision(6);
  }
  function _fibSlot(pair, iv) { var p = _fib.c[pair] || (_fib.c[pair] = {}); return p[iv] || (p[iv] = { bars: null, at: 0, tried: 0, err: null, px: null, pxAt: 0 }); }

  function _fibDue(pair, u, now) {
    var s = _fibSlot(pair, u[0]);
    if (now - s.tried < (s.err ? FIB_RETRY : FIB_MIN_GAP)) return false;
    if (!s.bars || !s.bars.length) return true;
    var lastOpen = s.bars[s.bars.length - 1][0];
    return now >= lastOpen + 2 * u[2] + 2000 || (u[0] === '5m' && now - s.at >= 60000);   // une bougie de plus a fini ; prix : 1 min
  }

  function _fibFetch(pair, u) {
    var s = _fibSlot(pair, u[0]); s.tried = Date.now(); _fib.busy = true;
    var url = 'https://api.binance.com/api/v3/klines?symbol=' + String(pair).replace('/', '') + '&interval=' + u[0] + '&limit=' + (FIB_N + 1);
    var opt = {}; try { if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) opt.signal = AbortSignal.timeout(FIB_TIMEOUT); } catch (e) {}
    return fetch(url, opt).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (a) {
      if (!Array.isArray(a) || !a.length) throw new Error('réponse vide');
      var now = Date.now(), closed = [], k;
      for (k = 0; k < a.length; k++) {
        var x = a[k];
        if (+x[6] < now) closed.push([+x[0], +x[1], +x[2], +x[3], +x[4]]);
        else { s.px = +x[4]; s.pxAt = now; }
      }
      s.bars = closed; s.at = now; s.err = null;
    }).catch(function (e) {
      s.err = (e && e.name === 'TimeoutError') ? 'délai dépassé (10 s)' : String((e && e.message) || e);
    }).then(function () { _fib.busy = false; _fibRender(pair); });
  }

  function _fibRowHtml(pair, u) {
    var s = _fibSlot(pair, u[0]), lab = '<span style="display:inline-block;min-width:42px;color:var(--t2);font-weight:700;">' + u[1] + '</span>';
    if (!s.bars) {
      var why = s.err ? ('⛔ ' + s.err) : (navigator.onLine === false ? 'hors ligne' : 'lecture…');
      return '<div style="padding:3px 0;border-bottom:1px solid var(--border);">' + lab + '<span style="color:var(--t3);">' + why + '</span></div>';
    }
    var r = _fibRead(s.bars, FIB_N, u[2]);
    if (!r.ok) {
      var m = r.why === 'court' ? ('court : ' + r.n + ' bougies closes sur ' + FIB_N) : (r.why === 'lacunaire' ? 'trouée (bougie absente)' : 'plate (aucun écart)');
      return '<div style="padding:3px 0;border-bottom:1px solid var(--border);">' + lab + '<span style="color:var(--t3);">' + m + ' — rien lu</span></div>';
    }
    var px = _fibLastPx(pair), arrow = r.dir === 1 ? '<span style="color:var(--up);">↑ hausse</span>' : (r.dir === -1 ? '<span style="color:var(--down);">↓ baisse</span>' : '→');
    var pos = '';
    if (isFinite(px) && r.dir !== 0) {
      var f = r.dir === 1 ? (r.H - px) / r.R : (px - r.L) / r.R;
      pos = ' · prix à ' + String(Math.round(f * 1000) / 10).replace('.', ',') + ' % du repli';
    }
    var tag = r.side === 1 ? '<span style="color:var(--up);font-weight:800;">LONG</span>' : (r.side === -1 ? '<span style="color:var(--down);font-weight:800;">SHORT</span>' : '<span style="color:var(--t3);">—</span>');
    var lvl = r.side ? ('<div style="color:var(--t3);font-size:9px;padding-left:46px;">stop ' + _fibPx(pair, r.stop) + ' · objectif ' + _fibPx(pair, r.tgt) + '</div>') : '';
    return '<div style="padding:3px 0;border-bottom:1px solid var(--border);">' + lab + arrow +
      ' · zone ' + _fibPx(pair, r.zLo) + '–' + _fibPx(pair, r.zHi) + pos + ' · ' + tag + lvl + '</div>';
  }
  function _fibLastPx(pair) {
    var s = _fib.c[pair] && _fib.c[pair]['5m'];
    return (s && isFinite(s.px)) ? s.px : NaN;
  }
  function _fibHtml(pair) {
    var s5 = _fib.c[pair] && _fib.c[pair]['5m'], t = (s5 && s5.pxAt) ? new Date(s5.pxAt) : null;
    var hh = t ? (('0' + t.getHours()).slice(-2) + ':' + ('0' + t.getMinutes()).slice(-2)) : '—';
    return '<div class="detail-section-title">🌀 Bot Fibonacci · 6 unités (lecture, sans vote)</div>' +
      '<div style="font-size:10px;line-height:1.45;font-family:var(--font-mono);">' + FIB_UNITS.map(function (u) { return _fibRowHtml(pair, u); }).join('') + '</div>' +
      '<div style="margin-top:5px;font-size:9px;color:var(--t3);line-height:1.4;">Prix Binance ' + _fibPx(pair, _fibLastPx(pair)) + ' (' + hh + '). ' +
      'Signal = règle de la porte à la dernière bougie close : ' + FIB_N + ' bougies, zone 38,2–61,8 % du dernier mouvement, stop 78,6 %, objectif = l\'extrême. ' +
      'Lecture seule : ne vote pas, n\'ouvre rien. Porte du 21/11 (2018-2024, frais compris) : aucune des 33 versions ne gagne (meilleur z 1,34, seuil 2,84).</div>';
  }

  function _fibOpenPair() {
    var o = document.getElementById('pairDetailOverlay');
    if (!o || !o.classList.contains('open')) return null;
    var p = (typeof _currentDetailPair !== 'undefined') ? _currentDetailPair : null;
    if (!p || !document.getElementById('manSys_' + _fibKey(p))) return null;   // fiche MAN seulement
    return p;
  }
  function _fibRender(pair) {
    var el = document.getElementById('fib_' + _fibKey(pair));
    if (el) el.innerHTML = _fibHtml(pair);
  }
  function _fibEnsure() {
    var pair = _fibOpenPair(), body = document.getElementById('pairDetailBody');
    if (!pair || !body) return null;
    var id = 'fib_' + _fibKey(pair);
    if (!document.getElementById(id)) {
      var sec = document.createElement('div'); sec.className = 'detail-section'; sec.id = id;
      sec.innerHTML = _fibHtml(pair);
      body.appendChild(sec);                                    // en dernier : rien ne bouge au-dessus pendant que tu lis
    }
    if (!_fib.timer) _fib.timer = setInterval(_fibTick, 2000);
    return pair;
  }
  function _fibTick() {
    var pair = _fibEnsure();
    if (!pair) { clearInterval(_fib.timer); _fib.timer = null; return; }
    if (_fib.busy || navigator.onLine === false) return;
    var now = Date.now();
    for (var i = 0; i < FIB_UNITS.length; i++) if (_fibDue(pair, FIB_UNITS[i], now)) { _fibFetch(pair, FIB_UNITS[i]); return; }
  }
  function _fibWatch() {
    var body = document.getElementById('pairDetailBody');
    if (!body || _fib.obs || typeof MutationObserver === 'undefined') return;
    _fib.obs = new MutationObserver(function () { try { if (_fibEnsure()) _fibTick(); } catch (e) {} });
    _fib.obs.observe(body, { childList: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _fibWatch); else _fibWatch();

  window._fibRead = _fibRead;
  window._fibState = _fib;
})();
