// banc-p0b-newskey.js · [P0b · 08/09/2026] Phase 0b : clé CoinStats hors snapshot → persistance dédiée `aura_news_key` (10e7).
// Charge le module LIVRÉ 10e7 en vm avec un localStorage simulé ; vérifie chargement, migration one-shot, setter, absence
// dans 09b1/09b2, token HTML. Aucun payload requis. Lancer à la racine du dépôt : node banc-p0b-newskey.js
const fs = require('fs'), vm = require('vm'), assert = require('assert');
let ok = 0, ko = 0;
function T(name, fn) { try { fn(); ok++; console.log('  ok  ' + name); } catch (e) { ko++; console.log('  KO  ' + name + '\n      ' + e.message); } }
const TOK = '20260908b';
const SRC = fs.readFileSync('js/10e7-news-nlp.js', 'utf8');
function mkLS(init) { const m = Object.assign({}, init || {}); return { _m: m, getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } }; }
function mkCtx(ls, withS) {
  const S = withS === false ? undefined : { chainLog: [] };
  const ctx = { window: { _stateReady: true }, console, Math, Number, String, Object, Array, JSON, Promise, RegExp, Error, Date,
    setInterval: () => 0, setTimeout: (fn) => 0, fetch: async () => ({ ok: false, status: 500, json: async () => ({}) }),
    AbortSignal: { timeout: () => null }, rndHash: () => 'h', nowStr: () => 't', document: { getElementById: () => null } };
  if (S) ctx.S = S;
  if (ls) ctx.localStorage = ls;
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  return ctx;
}
const KEY = 'cle-factice-banc-0123456789abcdef0123';

T('chargement : aura_news_key present -> S.newsApiKey pose, _newsHasKey true, snapshot LS non lu', () => {
  const ls = mkLS({ aura_news_key: KEY, nexus_state_v2: '{"newsApiKey":"AUTRE-0123456789abcdef"}' });
  const c = mkCtx(ls);
  assert.strictEqual(c.S.newsApiKey, KEY);
  assert.strictEqual(c._newsHasKey(), true);
  assert.strictEqual(ls._m.aura_news_key, KEY);
});
T('migration one-shot : aura_news_key absent, nexus_state_v2 porte la cle -> copiee dans aura_news_key', () => {
  const ls = mkLS({ nexus_state_v2: JSON.stringify({ cycle: 3, newsApiKey: '  ' + KEY + '  ' }) });
  const c = mkCtx(ls);
  assert.strictEqual(c.S.newsApiKey, KEY);
  assert.strictEqual(ls._m.aura_news_key, KEY);
});
T('aucune cle nulle part -> S.newsApiKey = "", pas d ecriture, pas d erreur', () => {
  const ls = mkLS({ nexus_state_v2: '{"cycle":1}' });
  const c = mkCtx(ls);
  assert.strictEqual(c.S.newsApiKey, '');
  assert.strictEqual(ls._m.aura_news_key, undefined);
  assert.strictEqual(c._newsHasKey(), false);
});
T('snapshot LS corrompu -> ignore silencieusement', () => {
  const c = mkCtx(mkLS({ nexus_state_v2: '{corrompu' }));
  assert.strictEqual(c.S.newsApiKey, '');
});
T('updateNewsApiKey : ecrit aura_news_key (trim) ; cle vide -> removeItem', () => {
  const ls = mkLS({});
  const c = mkCtx(ls);
  c.updateNewsApiKey('  ' + KEY + '  ');
  assert.strictEqual(ls._m.aura_news_key, KEY);
  assert.strictEqual(c.S.newsApiKey, KEY);
  c.updateNewsApiKey('');
  assert.strictEqual(ls._m.aura_news_key, undefined);
  assert.strictEqual(c.S.newsApiKey, '');
});
T('sans localStorage (contexte banc P7) -> module charge sans erreur', () => {
  const c = mkCtx(null);
  assert.strictEqual(typeof c.refreshNews, 'function');
  assert.strictEqual(c._newsKeyLoad(), '');
});
T('09b1 : newsApiKey absente de buildSnapshot ; 09b2 : absente de _LIGHT_KEYS, restauration, manifeste ; orphelins = []', () => {
  const b1 = fs.readFileSync('js/09b1-build-snapshot.js', 'utf8'), b2 = fs.readFileSync('js/09b2-save-load.js', 'utf8');
  assert.ok(!/^\s+newsApiKey\s*:/m.test(b1));
  assert.ok(!b2.includes('snap.newsApiKey'));
  assert.ok(!/_LIGHT_KEYS = \[[^\]]*newsApiKey/.test(b2));
  const man = b2.match(/window\._APPLYSNAP_MANIFEST = \[([^\]]*)\]/)[1].split(',').map(x => x.trim().replace(/'/g, ''));
  assert.ok(man.indexOf('newsApiKey') === -1);
  const snapKeys = (b1.match(/^\s{6}([A-Za-z_][A-Za-z0-9_]*):/gm) || []).map(x => x.trim().replace(':', ''));
  const mirrors = b2.match(/window\._WALLET_MIRRORS = \[([^\]]*)\]/)[1].split(',').map(x => x.trim().replace(/'/g, ''));
  const orphans = snapKeys.filter(k => man.indexOf(k) === -1 && mirrors.indexOf(k) === -1);
  assert.deepStrictEqual(orphans, [], 'cles snapshot jamais relues : ' + orphans.join(','));
});
T('depot : aucune cle CoinStats en dur (44 hex) dans js/, html, bancs', () => {
  const files = fs.readdirSync('js').map(f => 'js/' + f).concat(fs.readdirSync('.').filter(f => /\.(js|html)$/.test(f)));
  for (const f of files) assert.ok(!/[0-9a-f]{44}/.test(fs.readFileSync(f, 'utf8')), 'cle suspecte dans ' + f);
});
T('HTML : DOC_V = ' + TOK + ' et tous les ?v= au meme token', () => {
  const h = fs.readFileSync('AURA8_v118.html', 'utf8');
  assert.ok(h.includes("DOC_V = '" + TOK + "'"));
  const toks = (h.match(/\?v=([0-9a-z]+)/g) || []).map(x => x.slice(3));
  assert.ok(toks.length >= 70, 'seulement ' + toks.length + ' ?v=');
  const bad = toks.filter(t => t !== TOK);
  assert.deepStrictEqual(bad, [], 'tokens divergents : ' + bad.length);
});
console.log('\n' + ok + ' ok / ' + ko + ' KO');
process.exit(ko ? 1 : 0);
