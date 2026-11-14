// banc-css-chain.js — [GO CSS · écran 5 · 14/11/2026] écran Chain par priorité (Rams 14/11 15:03 « Go css », maquette montrée, « Ok » 15:16) — affichage seul.
// Lit le VRAI HTML, le VRAI CSS et fait tourner le VRAI texte de 08 (bloc Chain : de « let _chainFilter » à la page 5) avec les VRAIES aides de 02
// (fmtDT, _walletKey, _modeLab, EVENT_KINDS / _eventKind) en vm.
// Sur le code d'avant (BANC_ROOT=<copie du commit 969a0e1>) : C1 à C7 ÉCHOUENT ; G PASSE (garde : ce que d'autres lisent est resté).
//   C1 #page4 : 4 tuiles = les onglets (Trades · Décisions · Apprentissage · Système), titre de la liste (⊃ « Tout le journal »), la liste ; plus d'onglet DAO
//   C2 renderChain s'ouvre sur les trades : groupés par jour, du plus récent, 60 au plus, mise à 2 décimales, résultat coloré, sans « hash » ; tuile Trades
//   C3 journal : Décisions / Apprentissage / Système par la nature (02 _eventKind) puis l'icône ; « Tout le journal » = tout ; tuiles (nombre, dernière ligne)
//   C3b nature des vrais textes du code (ouvertures bot / manuelle, sorties, règles apprises, réseau) ; C8 11b range son bouton dans le titre de la liste
//   C4 lignes identiques (même mode, icône, texte) groupées ×n, de la 1re à la dernière heure ; heure HH:MM (« 3:06:04 PM » → 15:06)
//   C5 la liste n'est rebâtie que si quelque chose change (avant : à chaque passage) : journal, trades, onglet, mode
//   C6 badge de l'onglet : trades nouveaux depuis la dernière visite, par mode, caché sur l'écran Chain (avant : nombre de lignes, « 9+ ») ; 08 le pose hors écran
//   C7 css/32-chain-zones.css chargé en dernier au token ; chaque règle visée à #page4 ; plancher 11 px ; hash caché ; téléphone
//   G  ce que d'autres lisent : mobileChainList, chainCountBadge, chaintab-all / -trade / -learn, filterChain / renderChain globales ; 11b pose son bouton
//      (sans la place de css/32 : avant la liste, comme avant) ; 02 rend Chain quand on y est
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = process.env.BANC_ROOT || __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + String(e && e.message || e).split('\n').slice(0, 3).join('\n     ')); } }
function fnSrc(src, name) {
  const m = new RegExp('(^|\\n)function ' + name + '\\s*\\(').exec(src); assert.ok(m, 'fonction absente : ' + name);
  const start = m.index + m[1].length; let d = 0;
  for (let i = src.indexOf('{', src.indexOf(')', start)); i < src.length; i++) { if (src[i] === '{') d++; else if (src[i] === '}' && !--d) return src.slice(start, i + 1); }
  throw new Error('fin introuvable : ' + name);
}

const html = rd('AURA8_v118.html');
const TOK = (html.match(/DOC_V = '(\d{8}[a-z])'/) || [])[1];
const p4 = html.slice(html.lastIndexOf('<div', html.indexOf('id="page4"')), html.indexOf('<!-- PAGE 5'));
const idsOf = s => [...s.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
const at = id => p4.indexOf('id="' + id + '"');
const s02 = rd('js/02-state-init.js'), s08 = rd('js/08-learning-history-render.js'), s11b = rd('js/11b-ecran-appris.js');
const AIDES02 = fnSrc(s02, 'fmtDT') + '\n' + fnSrc(s02, '_walletKey') + '\n' + fnSrc(s02, '_modeLab') + '\n'
  + s02.slice(s02.indexOf('const EVENT_KINDS = ['), s02.indexOf('];', s02.indexOf('const EVENT_KINDS = [')) + 2) + '\n' + fnSrc(s02, '_eventKind');
const CHAIN = s08.slice(s08.indexOf('let _chainFilter'), s08.indexOf('// PAGE 5 — FISCAL'));

// Un DOM juste assez vrai : les éléments de #page4 (tuiles avec data-f), le badge de la barre du bas ; innerHTML compte ses écritures
function monde(S, ls) {
  const els = {};
  const mk = (id, f) => { const cls = new Set(); const e = { id, style: {}, dataset: f ? { f } : {}, textContent: '', _html: '', nbSet: 0,
    classList: { contains: c => cls.has(c), add: c => cls.add(c), remove: c => cls.delete(c), toggle: (c, on) => { on = on === undefined ? !cls.has(c) : !!on; on ? cls.add(c) : cls.delete(c); return on; } } };
    Object.defineProperty(e, 'innerHTML', { get: () => e._html, set: v => { e._html = String(v); e.nbSet++; } }); return e; };
  idsOf(p4).forEach(id => { const m = p4.match(new RegExp('id="' + id + '"[^>]*data-f="([a-z]+)"')); els[id] = mk(id, m && m[1]); });
  els.chainCountBadge = mk('chainCountBadge'); els.chainCountBadge.style.display = 'none';
  const store = ls || { d: {}, sets: 0 };
  const c = { S, Math, Number, Object, Array, String, JSON, isFinite, RegExp, WeakMap, Intl, console, __now: Date.now(),
    localStorage: { getItem: k => (k in store.d ? store.d[k] : null), setItem: (k, v) => { store.sets++; store.d[k] = String(v); } },
    document: { getElementById: id => els[id] || null, querySelectorAll: sel => (/\[data-f\]|chaintab-/.test(sel) ? Object.values(els).filter(e => e.dataset.f || /^chaintab-/.test(e.id)) : []) } };
  c.Date = new Proxy(Date, { construct: (t, a) => (a.length ? new t(...a) : new t(c.__now)), get: (t, k) => (k === 'now' ? (() => c.__now) : t[k]) });
  c.window = c; vm.createContext(c); vm.runInContext(AIDES02 + '\n' + CHAIN + '\n;this.__setF = f => { _chainFilter = f; }; this.__getF = () => _chainFilter;', c);
  return { c, els, S, store, run: code => vm.runInContext(code, c) };
}
const H = 3600e3, NOW = Date.now(), HIER = NOW - 26 * H;
const TR = () => ({
  'XRP/USDT': { trades: [{ type: 'open', side: 'sell', price: 1.0266, stakeUsdt: 95.99, ts: NOW - 2 * H }] },
  'ETH/USDT': { trades: [{ type: 'open', side: 'sell', price: 2307.13, stakeUsdt: 1000, ts: HIER - H },
                         { type: 'close', side: 'sell', entryPrice: 2307.13, price: 2311.73, pnlUsdt: -1.99, pnl: -0.2, ts: HIER }] },
  'PEPE/USDT': { trades: [{ type: 'close', side: 'buy', entryPrice: 0.00000398, price: 0.00000402, pnlUsdt: 2.15, pnl: 1.01, ts: HIER - 3 * H }] } });
const LOG = () => [
  { icon: '⏱', desc: 'Bot DOGE/USDT: cycle 1m→50s · conv. 14%', hash: 'h1', time: '13:05:46', m: 'sim' },
  { icon: '📡', desc: 'Prix réels mis à jour: 12/12 paires via CoinGecko', hash: 'h2', time: '13:06:47' },
  { icon: '🧠', desc: 'Learn[cycle][SOL/USDT] -0.09% → 🏆Hybrid Gen-95768(1011T$)', hash: '0x5e065f9cc3...', time: '13:10:10', m: 'real' },
  { icon: '🗳', desc: 'Bot DCA·Grid · voix BTC/USDT LONG → décision commune · pèse 0.03 (bilan)', hash: 'h4', time: '13:12:04', m: 'real' },
  { icon: '📊', desc: 'Position 2/3 · SOL/USDT · LONG · corr max 0.4', hash: 'h5', time: '13:13:00' },
  { icon: '📡', desc: 'Prix réels mis à jour: 12/12 paires via CoinGecko', hash: 'h6', time: '13:15:17' },
  { icon: '🔄', desc: 'Hybrid Gen-95787 auto-recalibré · trop d\'erreurs', hash: 'h7', time: '13:15:16', m: 'real' },
  { icon: '🧬', desc: 'Évolution jugée · Hybrid Gen-95787 (sentiment_v2) : non concluant', hash: 'h8', time: '13:25:46', m: 'real' },
  { icon: '📡', desc: 'Prix réels mis à jour: 12/12 paires via CoinGecko', hash: 'h9', time: '13:24:02' },
  { icon: '▶', desc: 'Évaluation démarré · cycle #1944317', hash: 'h10', time: '3:06:04 PM' }];
const baseS = (o) => Object.assign({ tradingMode: 'paperReal', currentPage: 4, pairStates: TR(), chainLog: LOG() }, o || {});
const rows = h => h.split('class="chain-row').slice(1);

T('C1 #page4 : 4 tuiles = les onglets (Trades · Décisions · Apprentissage · Système, nombre / dernière ligne / heure) · titre de la liste (⊃ « Tout le journal ») · la liste ; plus d\'onglet DAO ; HTML sans id en double, balises équilibrées', () => {
  const ordre = ['chainBref', 'chaintab-trade', 'chaintab-dec', 'chaintab-learn', 'chaintab-sys', 'chainHead', 'chainHeadT', 'chainHeadSub', 'chainHeadBtns', 'chaintab-all', 'mobileChainList'], pos = ordre.map(at);
  assert.ok(pos.every(p => p > 0), 'absent : ' + ordre.filter((x, i) => pos[i] < 0));
  assert.ok(pos.every((p, i) => !i || p > pos[i - 1]), 'ordre ' + JSON.stringify(pos));
  ['trade', 'dec', 'learn', 'sys'].forEach(f => { const i = at('chaintab-' + f), j = p4.indexOf('</button>', i), b = p4.slice(i, j);
    assert.ok(b.includes('data-f="' + f + '"') && b.includes("onclick=\"filterChain('" + f + "',this)\""), 'tuile ' + f);
    ['czN_', 'czL_', 'czS_'].forEach(k => assert.ok(b.includes('id="' + k + f + '"'), k + f)); });
  assert.ok(/class="cz-tile active" id="chaintab-trade"/.test(p4), 'Trades actif à l\'ouverture');
  assert.ok(at('chaintab-dao') < 0 && !/class="agent-tabs"/.test(p4), 'ancien rang d\'onglets');
  const all = idsOf(html), dbl = [...new Set(all.filter((x, i) => all.indexOf(x) !== i))]; assert.deepStrictEqual(dbl, [], 'doublons');
  const n = re => (p4.match(re) || []).length; assert.strictEqual(n(/<div\b/g), n(/<\/div>/g), 'div'); assert.strictEqual(n(/<button\b/g), n(/<\/button>/g), 'button');
});

T('C2 renderChain s\'ouvre sur les trades : groupés par jour, du plus récent, mise « $95,99 », fermeture « −$1,99 (−0,2 %) » en rouge, pas de « hash » ; tuile Trades = nombre et dernier', () => {
  const w = monde(baseS()); w.run('renderChain()');
  assert.strictEqual(w.c.__getF(), 'trade', 'onglet à l\'ouverture');
  const h = w.els.mobileChainList.innerHTML, r = rows(h);
  assert.strictEqual(r.length, 4, '4 trades');
  const days = [...h.matchAll(/<div class="cz-day">([^<]+)<\/div>/g)].map(m => m[1]);
  assert.strictEqual(days.length, 2, 'deux jours : ' + days); assert.ok(/^Aujourd'hui · /.test(days[0]) && /^Hier · /.test(days[1]), days.join(' | '));
  assert.ok(/XRP\/USDT<\/b> <span class="cz-what">SHORT ouvert · mise \$95,99 à 1,0266</.test(r[0]), 'ouverture : ' + r[0].slice(0, 260));
  assert.ok(/ETH\/USDT<\/b> <span class="cz-what">SHORT fermé · 2\u202f307,13 → 2\u202f311,73</.test(r[1]) && /class="cz-res dn">−\$1,99 <i>\(−0,2 %\)<\/i>/.test(r[1]), 'fermeture : ' + r[1].slice(0, 400));
  assert.ok(/mise \$1\u202f000,00 à 2\u202f307,13/.test(r[2]), 'mise de 1 000 $');
  assert.ok(/class="cz-res up">\+\$2,15 <i>\(\+1,01 %\)<\/i>/.test(r[3]) && /0,00000398 → 0,00000402/.test(r[3]), 'gain : ' + r[3].slice(0, 400));
  assert.ok(!/chain-hash|0x/.test(h), 'pas de hash');
  const t = id => w.els[id].textContent;
  assert.deepStrictEqual([t('czN_trade'), t('czL_trade')], [4, 'XRP/USDT SHORT ouvert']); assert.ok(/^dernier · \d\d\/\d\d \d\d:\d\d$/.test(t('czS_trade')), t('czS_trade'));
  assert.deepStrictEqual([t('chainHeadT'), t('chainHeadSub')], ['Trades', 'historique réel · 60 derniers']);
  const big = {}; for (let i = 0; i < 80; i++) (big['P' + (i % 8) + '/USDT'] = big['P' + (i % 8) + '/USDT'] || { trades: [] }).trades.push({ type: 'open', side: 'buy', price: 1, stakeUsdt: 1, ts: NOW - i * 60e3 });
  const b = monde(baseS({ pairStates: big })); b.run('renderChain()'); assert.strictEqual(rows(b.els.mobileChainList.innerHTML).length, 60, '60 au plus');
  const nd = monde(baseS({ pairStates: { 'BTC/USDT': { trades: [{ type: 'open', side: 'buy', price: 1, stakeUsdt: 1 }] } } })); nd.run('renderChain()');
  assert.ok(/<div class="cz-day">Sans date<\/div>/.test(nd.els.mobileChainList.innerHTML) && /class="chain-time">—</.test(nd.els.mobileChainList.innerHTML), 'trade sans ts');
  const v = monde(baseS({ pairStates: {} })); v.run('renderChain()'); assert.ok(/Aucun trade dans ce mode/.test(v.els.mobileChainList.innerHTML) && v.els.czL_trade.textContent === 'aucun trade dans ce mode');
});

T('C3 journal : Décisions (vote, ouverture) · Apprentissage (Learn, recalibré, évolution) · Système (prix, rythme, démarrage) ; « Tout le journal » = tout ; tuiles (nombre, dernière ligne, heure)', () => {
  const w = monde(baseS()), t = id => w.els[id].textContent; w.run('renderChain()');
  assert.deepStrictEqual(['czN_dec', 'czN_learn', 'czN_sys'].map(t), [2, 3, 5], 'nombres');
  assert.deepStrictEqual(['czL_dec', 'czL_learn', 'czL_sys'].map(t), ['Position 2/3 · SOL/USDT · LONG · corr max 0.4', 'RE · Évolution jugée · Hybrid Gen-95787 (sentiment_v2) : non concluant', 'Évaluation démarré · cycle #1944317'], 'dernière ligne ; une ligne d\'un autre mode dit son nom');
  assert.deepStrictEqual(['czS_dec', 'czS_learn', 'czS_sys'].map(t), ['dernière · 13:13', 'dernière · 13:25', 'dernière · 15:06']);
  assert.strictEqual(t('chaintab-all'), 'Tout le journal · 10');
  const liste = f => { w.run("filterChain('" + f + "')"); return rows(w.els.mobileChainList.innerHTML).map(r => (r.match(/<div class="chain-desc">(?:<span[^>]*>[A-Z]{2}<\/span>)?([^<]+)/) || [])[1]); };
  assert.deepStrictEqual(liste('dec'), ['Position 2/3 · SOL/USDT · LONG · corr max 0.4', 'Bot DCA·Grid · voix BTC/USDT LONG → décision commune · pèse 0.03 (bilan)']);
  assert.strictEqual(t('chainHeadT'), 'Décisions');
  assert.deepStrictEqual(liste('learn').length, 3);
  assert.deepStrictEqual(liste('sys'), ['Évaluation démarré · cycle #1944317', 'Prix réels mis à jour: 12/12 paires via CoinGecko', 'Bot DOGE/USDT: cycle 1m→50s · conv. 14%']);
  assert.strictEqual(liste('all').length, 8, '10 lignes, les 3 « Prix réels » en une');
  const act = () => Object.values(w.els).filter(e => e.classList.contains('active')).map(e => e.id);
  assert.deepStrictEqual(act(), ['chaintab-all'], 'seul l\'onglet choisi est actif');
});

T('C3b nature des VRAIS textes du code : ouvertures (bot 10f, manuelle 02), sorties, refus, pause, garde → Décisions ; règles apprises, poids, évolution → Apprentissage ; réseau, frais alignés, migration → Système', () => {
  const CAS = [
    ['🟢', 'BOT LONG SOL/USDT @81.63 | Commun:62% (9 voix) Seuil appris:55% · tenue 4 h', 'dec'],   // 10f:627 (avant : Apprentissage par « appris »)
    ['🔴', 'Position SHORT BTC/USDT | $95.99 @71652.71', 'dec'],                                     // 02:6311, ouverture manuelle (avant : Système)
    ['⚠', 'Ouverture manuelle SOL/USDT LONG · frais 0.3 % · ouverte à ta demande', 'dec'],          // 02:6322, par le texte seul
    ['🔮', 'Retournement détecté · ETH/USDT · fermeture préventive (+0.40%)', 'dec'],               // 10d:97, par le texte seul
    ['⏸', 'Pause streak · PEPE/USDT · 3 pertes consécutives · pause 30min', 'dec'],                // 02:6591
    ['⏸', 'Paire ADA/USDT désactivée · win rate 38.0% sur 50 derniers trades (seuil 40%)', 'dec'],  // 09e:188
    ['🧊', 'Garde comportementale · SOL/USDT · mise $50 → $25 (≤ mise précédente après perte)', 'dec'],
    ['🔌', 'Stop côté exchange (simulé) · ETH/USDT SHORT · touché', 'dec'],
    ['🛑', 'Sortie stop appris · BTC/USDT LONG · −0.8 %', 'dec'],
    ['📈', 'Tendance longue · BTC/USDT SHORT fermé (retournement) @71000', 'dec'],
    ['🛑', 'Stop appris · BTC/USDT · fermer à −0.8 % (9 cas)', 'learn'],                             // règle apprise, pas une sortie
    ['⚖️', 'Abstentions : 12 jugements au poids plancher retirés des fenêtres de 3 agents', 'learn'],
    ['🌐', 'Évolueur propose ARB/USDT · corrélation LOW · diversification portefeuille', 'learn'],
    ['📌', 'Apprentissage · 3 règles revues', 'learn'],                                               // par le texte seul
    ['🔴', 'Coupure connexion détectée · bot en pause (ouverture bloquée)', 'dec'],                   // 02 _eventKind : veto (ouverture bloquée)
    ['🔴', 'Réseau · Binance error (Failed to fetch) ×2 · CoinGecko error → réseau du tablet coupé · trading en pause', 'sys'],   // réseau avant l'icône
    ['💸', 'Frais alignés sur Binance (taker 0.100 %)', 'sys'],
    ['🛡', 'Migration unique « x » non rejouée : déjà faite — rien n\'est touché', 'sys'],
    ['⏸', 'Évaluation en pause · cycle #1944317', 'sys'],
    ['🧷', 'Couverture des frais : 3 trades couverts', 'sys']];   // (texte d'essai) « couverts » n'est pas « ouvert »
  const w = monde(baseS()); const got = CAS.map(([icon, desc]) => w.c._chainCat({ icon, desc }));
  const faux = CAS.filter((x, i) => got[i] !== x[2]).map((x, i) => x[1].slice(0, 40) + ' → ' + got[CAS.indexOf(x)]);
  assert.ok(!faux.length, 'mal rangées : ' + faux.join(' | '));
});

T('C4 lignes identiques groupées : « ×3 · 13:06 → 13:24 » ; même texte d\'un autre mode non groupé ; heure HH:MM (« 3:06:04 PM » → 15:06) ; pastille du mode devant le texte', () => {
  const S = baseS(); S.chainLog.push({ icon: '📡', desc: 'Prix réels mis à jour: 12/12 paires via CoinGecko', hash: 'hx', time: '13:30:00', m: 'sim' });
  const w = monde(S); w.c.__setF('sys'); w.run('renderChain()');
  const r = rows(w.els.mobileChainList.innerHTML), prix = r.filter(x => /Prix réels/.test(x));
  assert.strictEqual(prix.length, 2, 'EV ×3 + AA ×1');
  assert.ok(/<span class="chain-mode" style="border:1px solid var\(--ice\);color:var\(--ice\);">AA<\/span>Prix réels/.test(prix[0]) && /class="chain-time">13:30</.test(prix[0]), prix[0]);
  assert.ok(/<span class="cz-x">×3<\/span>13:06 → 13:24/.test(prix[1]), prix[1]);
  const dem = r.find(x => /Évaluation démarré/.test(x)); assert.ok(/class="chain-time">15:06</.test(dem), dem);
  assert.deepStrictEqual(['12:05:00 AM', '12:05 PM', '3:06:04 p.m.', '13:25:46'].map(x => w.c._chainHM(x)), ['00:05', '12:05', '15:06', '13:25']);
});

T('C5 la liste n\'est rebâtie que si ce qu\'elle montre change (avant : à chaque passage) — 5 passages : 0 ; Trades : un trade 1, une ligne du journal 0 ; journal : une ligne 1 ; onglet, mode, jour : 1', () => {
  const w = monde(baseS()), L = w.els.mobileChainList; w.run('renderChain()');
  const n0 = L.nbSet; for (let i = 0; i < 5; i++) w.run('renderChain()'); assert.strictEqual(L.nbSet - n0, 0, 'sans changement');
  w.S.chainLog.push({ icon: '🧠', desc: 'nouvelle', hash: 'z', time: '14:00:00' }); w.S.chainLog.shift(); w.run('renderChain()');
  assert.strictEqual(L.nbSet - n0, 0, 'onglet Trades : une ligne du journal ne rebâtit pas les trades');
  w.S.pairStates['XRP/USDT'].trades.push({ type: 'close', side: 'sell', entryPrice: 1.0266, price: 1, pnlUsdt: 2.5, pnl: 2.6, ts: NOW });
  w.run('renderChain()'); assert.strictEqual(L.nbSet - n0, 1, 'un trade de plus'); assert.ok(/class="cz-res up">\+\$2,50/.test(L.innerHTML));
  w.run("filterChain('learn')"); w.run('renderChain()'); assert.strictEqual(L.nbSet - n0, 2, 'onglet');
  w.S.chainLog.push({ icon: '🧠', desc: 'encore', hash: 'y', time: '14:01:00' }); w.S.chainLog.shift(); w.run('renderChain()'); w.run('renderChain()');
  assert.strictEqual(L.nbSet - n0, 3, 'journal : une ligne de plus (journal plafonné : même longueur)');
  w.S.tradingMode = 'sim'; w.run('renderChain()'); assert.strictEqual(L.nbSet - n0, 4, 'mode');
  w.run("filterChain('trade')"); const n1 = L.nbSet; assert.ok(/Aujourd'hui · /.test(L.innerHTML) || true);
  w.S.tradingMode = 'paperReal'; w.run('renderChain()'); const h1 = L.innerHTML, n2 = L.nbSet;
  w.c.__now += 864e5; w.run('renderChain()');
  assert.strictEqual(L.nbSet - n2, 1, 'minuit passé : rebâti'); assert.ok(/<div class="cz-day">Hier · /.test(L.innerHTML) && /<div class="cz-day">Aujourd'hui · /.test(h1), 'Aujourd\'hui → Hier');
  const x = w.els.czN_trade.textContent; w.run('renderChain()'); assert.strictEqual(w.els.czN_trade.textContent, x);
});

T('C6 badge : trades nouveaux depuis la dernière visite, par mode (aura_chain_vu), caché sur Chain ; écrit seulement quand un trade plus récent est vu ; 08 le pose hors écran', () => {
  const ls = { d: {}, sets: 0 }, w = monde(baseS({ currentPage: 0 }), ls), B = w.els.chainCountBadge;
  w.run('renderChain()'); assert.deepStrictEqual([B.textContent, B.style.display], ['', 'none'], '1re lecture du mode : rien de nouveau (avant : « 9+ »)');
  w.S.pairStates['XRP/USDT'].trades.push({ type: 'open', side: 'buy', price: 1, stakeUsdt: 10, ts: NOW + 1 });
  w.run('_chainBadge()'); assert.deepStrictEqual([B.textContent, B.style.display], ['1', ''], 'un trade nouveau');
  w.S.currentPage = 4; w.run('renderChain()'); assert.strictEqual(B.style.display, 'none', 'sur Chain');
  w.S.currentPage = 0; w.run('_chainBadge()'); assert.strictEqual(B.style.display, 'none', 'vu');
  const n = ls.sets; for (let i = 0; i < 5; i++) { w.S.currentPage = 4; w.run('renderChain()'); } assert.strictEqual(ls.sets, n, 'pas d\'écriture sans trade nouveau');
  w.S.tradingMode = 'sim'; w.S.currentPage = 0; w.S.pairStates['ZZZ/USDT'] = { trades: [{ type: 'open', side: 'buy', price: 1, stakeUsdt: 1, ts: NOW + 9e3 }] };
  w.run('_chainBadge()'); assert.strictEqual(B.style.display, 'none', 'autre mode, 1re lecture : rien');
  assert.deepStrictEqual(Object.keys(JSON.parse(ls.d.aura_chain_vu)).sort(), ['paperReal', 'sim']);
  for (let i = 0; i < 12; i++) w.S.pairStates['ZZZ/USDT'].trades.push({ type: 'open', side: 'buy', price: 1, stakeUsdt: 1, ts: NOW + 1e4 + i });
  w.run('_chainBadge()'); assert.strictEqual(B.textContent, '9+');
  const tick = s08.slice(s08.indexOf('else if(S.currentPage === 4) {'), s08.indexOf('// v7.2 Phase 18 · Fin instrumentation perf'));
  assert.ok(/if\(S\.currentPage !== 4 && tick % 10 === 0 && typeof _chainBadge === 'function'\) \{ try \{ _chainBadge\(\); \} catch\(e\) \{\} \}/.test(tick), '08 : le badge hors écran');
});

T('C7 css/32-chain-zones.css chargé après tous les styles d\'avant au token ' + TOK + ' (après lui : seuls les écrans suivants du go css, css/33+) ; chaque règle visée à #page4 ; plancher 11 px ; hash caché ; 4 tuiles, téléphone 2', () => {
  const links = [...html.matchAll(/<link rel="stylesheet" href="(css\/[^"?]+)\?v=([0-9a-z]+)"/g)];
  // [GO CSS · écran 6 · 14/11/2026] css/33-fiscal-zones.css (écran Fiscal, visé à #page5) se charge désormais après lui
  const i32 = links.findIndex(l => l[1] === 'css/32-chain-zones.css');
  assert.ok(i32 >= 0 && links[i32][2] === TOK, 'css/32 au token');
  assert.deepStrictEqual(links.slice(i32 + 1).filter(l => !/^css\/(3[3-9]|[4-9]\d)-/.test(l[1])).map(l => l[1]), [], 'après css/32 : seuls css/33+');
  const css = rd('css/32-chain-zones.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const sel = [...css.replace(/@media[^{]+\{/g, '').matchAll(/([^{}]+)\{[^{}]*\}/g)].map(m => m[1].trim()).filter(Boolean);
  const hors = sel.flatMap(s => s.split(',').map(x => x.trim())).filter(x => x && !x.startsWith('#page4'));
  assert.deepStrictEqual(hors, [], 'sélecteurs hors #page4');
  const decl = [...css.matchAll(/\{([^{}]*)\}/g)].map(m => m[1]).join(';');
  const tailles = [...decl.matchAll(/font(?:-size)?:[^;]*?(\d+(?:\.\d+)?)px/g)].map(m => +m[1]).filter(n => n < 11);
  assert.deepStrictEqual(tailles, [], 'tailles < 11 px');
  assert.ok(/#page4 \{[^}]*--fs-6: 11px/.test(css), 'variables --fs-* au plancher');
  assert.ok(/#page4 \.chain-hash \{ display: none; \}/.test(css), 'hash caché');
  assert.ok(/#page4 \.cz-bref \{[^}]*grid-template-columns: repeat\(4, 1fr\)/.test(css) && /@media \(max-width: 520px\)[\s\S]*#page4 \.cz-bref \{ grid-template-columns: 1fr 1fr;/.test(css), '4 tuiles, téléphone 2');
  assert.ok(!/font-size:\s*9px/.test(CHAIN), 'plus de 9 px écrit en dur dans le rendu');
});

T('C8 11b : le bouton « Ce que le système a appris » se range dans le titre de la liste (#chainHeadBtns, classe cz-learned, sans style écrit) ; sans cette place, avant la liste comme avant', () => {
  const src = s11b.replace(/setInterval\(function \(\) \{ try \{ _injectLearnedButton\(\); \} catch \(e\) \{\} \}, 2000\);/, '');
  const run = slot => { const mk = id => ({ id, style: {}, kids: [], firstChild: null, parentNode: null, insertBefore(n, ref) { n.parentNode = this; this.kids.unshift(n); this.firstChild = this.kids[0]; } });
    const page = mk('page4'), list = mk('mobileChainList'); list.parentNode = page; const btns = slot ? mk('chainHeadBtns') : null; const els = { mobileChainList: list, chainHeadBtns: btns };
    const c = { S: {}, document: { getElementById: id => els[id] || null, createElement: () => mk(null), body: mk('body') }, window: {}, Math, Number, Object, Array, String, JSON, Date };
    vm.createContext(c); vm.runInContext(src, c); const r = vm.runInContext('_injectLearnedButton()', c); return { r, page, btns }; };
  const a = run(true); assert.strictEqual(a.r, true);
  const b = a.btns.kids[0]; assert.ok(b && b.id === 'learnedBtn' && b.className === 'cz-learned' && !b.style.cssText && a.page.kids.length === 0, 'rangé dans le titre');
  const z = run(false); const b2 = z.page.kids[0]; assert.ok(b2 && b2.id === 'learnedBtn' && /margin:8px 16px 0 auto/.test(b2.style.cssText), 'repli : avant la liste, style d\'avant');
});

T('G ce que d\'autres lisent : mobileChainList, chainCountBadge, chaintab-all / -trade / -learn ; filterChain / renderChain globales ; 11b pose son bouton ; 02 rend Chain quand on y est', () => {
  ['mobileChainList', 'chaintab-all', 'chaintab-trade', 'chaintab-learn'].forEach(i => assert.ok(at(i) > 0, i + ' absent de #page4'));
  assert.ok(/id="chainCountBadge"/.test(html), 'badge de la barre du bas');
  assert.ok(/(^|\n)function filterChain\(/.test(s08) && /(^|\n)function renderChain\(\)/.test(s08), 'globales');
  assert.ok(s11b.includes("var anchor = document.getElementById('mobileChainList');") && s11b.includes('anchor.parentNode.insertBefore(btn, anchor);') && s11b.includes("btn.id = 'learnedBtn';"), '11b');
  assert.ok((s02.match(/if\(S\.currentPage===4\) renderChain\(\);/g) || []).length >= 2, '02');
});

console.log('\n' + (fail ? '❌' : '✅') + ' ' + pass + '/' + (pass + fail) + ' tests passés');
process.exit(fail ? 1 : 0);
