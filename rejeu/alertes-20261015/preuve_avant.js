// rejeu/alertes-20261015/preuve_avant.js — [GO ALERTES · 15/10/2026] preuve des défauts n° 30, 31, 32 (ETAT-AURA8.md) sur un code donné.
//   node rejeu/alertes-20261015/preuve_avant.js [racine]   (défaut : le dépôt)
// Chaque ligne dit « DÉFAUT PRÉSENT » ou « corrigé ». Lecture seule : aucun fichier écrit.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..', '..'));
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const html = rd('AURA8_v118.html');
const LOADED = (html.match(/src="(js\/[^"?]+\.js)/g) || []).map(x => x.slice(5));
const all = LOADED.map(f => ({ f, s: rd(f) })).concat([{ f: 'AURA8_v118.html', s: html }]);
const sansCommentaires = s => s.split('\n').map(l => /^\s*\/\//.test(l) ? '' : l.replace(/\s\/\/ .*$/, '')).join('\n');   // numéros de ligne conservés
// appelants d'une fonction : « nom(» ou « nom?.(» hors de sa propre déclaration et de « window.nom = nom »
function appelants(nom) {
  const re = new RegExp('(^|[^\\w.$])' + nom + '\\s*(\\?\\.)?\\(', 'g'), out = [];
  all.forEach(({ f, s }) => sansCommentaires(s).split('\n').forEach((l, i) => {
    if (new RegExp('function\\s+' + nom + '\\s*\\(').test(l)) return;
    if (re.test(l)) out.push(f + ':' + (i + 1)); re.lastIndex = 0;
  }));
  return out;
}
function lecteurs(champ, sauf) {
  const re = new RegExp('\\.' + champ + '\\b|\\[[\'"]' + champ + '[\'"]\\]|\\bk:\'' + champ + '\''), out = [];
  all.forEach(({ f, s }) => sansCommentaires(s).split('\n').forEach((l, i) => { if (re.test(l) && !(sauf && sauf.test(l))) out.push(f + ':' + (i + 1)); }));
  return out;
}
const dit = (ok, quoi, detail) => console.log((ok ? '  corrigé        ' : '  DÉFAUT PRÉSENT ') + '· ' + quoi + (detail ? '  [' + detail + ']' : ''));
console.log('▶ code : ' + ROOT + ' · ' + LOADED.length + ' scripts chargés par le HTML');

console.log('▶ n° 30 — interrupteurs');
const tgT = appelants('tgOnTrade'), tgA = appelants('tgOnAlert');
dit(tgT.length > 0, 'Telegram « 📊 Chaque trade » : tgOnTrade appelé', tgT.join(' ') || '0 appelant');
dit(tgA.length > 0, 'Telegram « 🔔 Alertes prix » : tgOnAlert appelé', tgA.join(' ') || '0 appelant');
const pg = lecteurs('onPnlGoal', /onPnlGoal:\s*(false|true)|'onPnlGoal'\]|\['enabled'|lbl:/);
dit(pg.length > 0, 'Telegram « 💰 Objectif P&L » : onPnlGoal lu ailleurs que dans le réglage', pg.join(' ') || 'jamais lu');
const tp = lecteurs('tpSl', /tpSl:\s*true|key:'tpSl'/);
dit(tp.length > 0, 'Notification « TP / SL atteint » : tpSl lu', tp.join(' ') || 'jamais lu');
const tw = appelants('notifTwinAlert'), rg = appelants('notifRegimeChange');
dit(tw.length > 0, 'Notification « Twin » : notifTwinAlert appelé', tw.join(' ') || '0 appelant');
dit(rg.length > 0, 'Notification « Régime » : notifRegimeChange appelé', rg.join(' ') || '0 appelant');
// alertes prix vérifiées seulement par renderHome (accueil affiché, écran allumé) ?
const cpa = appelants('checkPriceAlerts');
const s08 = rd('js/08-learning-history-render.js');
const horsRendu = cpa.filter(x => !/07-v90-mode-bunker-sos\.js/.test(x));
dit(horsRendu.length > 0, 'alertes prix vérifiées hors de renderHome (écran éteint, autre page)', cpa.join(' ') + (/S\.currentPage === 0 && !\(typeof document !== 'undefined' && document\.hidden\)/.test(s08) ? ' · renderHome ne tourne que page 0 écran allumé (08)' : ''));

console.log('▶ n° 31 — sauvegarde');
const s9b1 = rd('js/09b1-build-snapshot.js'), s9b2 = rd('js/09b2-save-load.js');
['priceAlerts', 'pnlAlerts'].forEach(k => {
  const ecrit = new RegExp('^\\s+' + k + '\\s*:', 'm').test(s9b1);
  const relu = new RegExp('snap\\.' + k + '|' + k + ':\\s*\'_').test(s9b2) || new RegExp('\'' + k + '\'').test((s9b2.match(/function _reglagesRelus[\s\S]*?\n}\n/) || [''])[0]);
  dit(ecrit && relu, k + ' écrit par buildSnapshot (09b1) et relu au chargement (09b2)', 'écrit ' + ecrit + ' · relu ' + relu);
});

console.log('▶ n° 32 — clé CoinStats dans JSON.stringify(S)');
{
  const s = rd('js/10e7-news-nlp.js');
  const m = s.match(/function _newsKeyStore[\s\S]*?\n}\n/), m2 = s.match(/function _newsKeyLoad[\s\S]*?\n}\n/);
  const mh = s.match(/function _newsKeyHide[\s\S]*?\n}\n/);
  const KEY = 'cle-preuve-0123456789abcdef0123';
  const ls = { o: { aura_news_key: KEY }, getItem(k) { return k in this.o ? this.o[k] : null; }, setItem(k, v) { this.o[k] = String(v); }, removeItem(k) { delete this.o[k]; } };
  const ctx = { S: { cycle: 1 }, localStorage: ls, String, JSON, Object, NEWS_KEY_LS: 'aura_news_key' };
  vm.createContext(ctx);
  vm.runInContext((mh ? mh[0] : '') + m[0] + m2[0] + '\n_newsKeyLoad();', ctx);
  const fuite = JSON.stringify(ctx.S).includes(KEY);
  dit(!fuite && ctx.S.newsApiKey === KEY, 'S.newsApiKey lue (' + (ctx.S.newsApiKey === KEY) + ') et absente de JSON.stringify(S) — _buildFullBackup (03), exports .json/.txt, backup d\'urgence, Guardian', fuite ? 'la clé est dans la chaîne' : '');
}
