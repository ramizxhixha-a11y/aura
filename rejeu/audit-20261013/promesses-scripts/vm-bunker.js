// Preuve vm : l'action « Réduire les mises » du Bunker (et « Mises à 10 % » du Mode Urgence)
// change-t-elle une valeur LUE par l'ouvreur (09c autoOpenPosition : ps.stake, _stakeFloor = S.tradingAccount) ?
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = process.argv[2];
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
function fnSrc(src, name) {
  const re = new RegExp('(^|\\n)(async )?function ' + name + '\\s*\\(');
  const m = re.exec(src); if (!m) throw new Error('absent ' + name);
  const start = m.index + m[1].length, st = [];
  for (let i = src.indexOf('{', src.indexOf(')', start)); i < src.length; i++) {
    const c = src[i], n2 = src[i + 1], top = st[st.length - 1];
    if (top === 't') { if (c === '\\') { i++; continue; } if (c === '`') { st.pop(); continue; } if (c === '$' && n2 === '{') { st.push('x'); i++; } continue; }
    if (c === '/' && n2 === '/') { i = src.indexOf('\n', i); continue; }
    if (c === '/' && n2 === '*') { i = src.indexOf('*/', i) + 1; continue; }
    if (c === '"' || c === "'") { i++; while (i < src.length && src[i] !== c) { if (src[i] === '\\') i++; i++; } continue; }
    if (c === '`') { st.push('t'); continue; }
    if (c === '{') { st.push('b'); continue; }
    if (c === '}') { st.pop(); if (!st.length) return src.slice(start, i + 1); }
  }
}
const s07 = rd('js/07-v90-mode-bunker-sos.js'), s06 = rd('js/06-v63-patterns-chartistes.js'), s09c = rd('js/09c-auto-open.js');
// Agents réels : ceux du backup (sans champ stake) ; pairStates réels du backup (stake)
const bk = JSON.parse(rd('rejeu/backups/pont/aura_guardian_full_20261013-202953.json')).aura;
const toasts = [];
const S = {
  agents: bk.agents.map(a => ({ id: a.id })), // champs utiles : stake éventuel
  pairStates: JSON.parse(JSON.stringify(bk.pairStates)),
  tradingAccount: bk.tradingAccount, openPositions: [], chainLog: [],
};
// le backup ne garde pas « stake » des agents : on vérifie aussi la définition d'origine (02:576-647)
const s02 = rd('js/02-state-init.js');
const agBlock = s02.slice(s02.indexOf('  agents:['), s02.indexOf('\n  ],', s02.indexOf('  agents:[')));
const ctx = {
  S, console, navigator: {}, document: { getElementById: () => null },
  showToast: (m) => toasts.push(m), renderBunkerSection() { }, _bkUpdateBanner() { }, _urgAppendLog() { },
  urgenceCloseAll: undefined, _abExecute: undefined, tgOnUrgence: undefined, playSound: undefined,
};
ctx.window = ctx; vm.createContext(ctx);
for (const f of ['_bkState', '_bkGet', '_bkCapital', 'activateBunker']) vm.runInContext(fnSrc(s07, f), ctx);
vm.runInContext(fnSrc(s06, 'urgenceReduceStake'), ctx);
vm.runInContext(fnSrc(s09c, '_stakeFloor'), ctx);
const before = JSON.stringify({ ps: Object.fromEntries(Object.entries(S.pairStates).map(([k, v]) => [k, v.stake])), floor: vm.runInContext('_stakeFloor()', ctx), agentsStake: S.agents.map(a => a.stake) });
vm.runInContext('activateBunker(12)', ctx);
const afterB = JSON.stringify({ ps: Object.fromEntries(Object.entries(S.pairStates).map(([k, v]) => [k, v.stake])), floor: vm.runInContext('_stakeFloor()', ctx), agentsStake: S.agents.map(a => a.stake) });
vm.runInContext('urgenceReduceStake()', ctx);
const afterU = JSON.stringify({ ps: Object.fromEntries(Object.entries(S.pairStates).map(([k, v]) => [k, v.stake])), floor: vm.runInContext('_stakeFloor()', ctx), agentsStake: S.agents.map(a => a.stake) });
console.log('agents d\'origine (02) portant un champ stake :', (agBlock.match(/\bstake\s*:/g) || []).length);
console.log('S.bunkerCfg.actions.reduceMises =', S.bunkerCfg.actions.reduceMises, '· minStakePct =', S.bunkerCfg.minStakePct);
console.log('toasts :', toasts);
console.log('S.stakeConfig =', S.stakeConfig, '· S.stakeUsdt =', S.stakeUsdt, '(écrit, lu par l\'ouvreur ? voir grep)');
console.log('valeurs lues par l\'ouvreur — avant      :', before);
console.log('valeurs lues par l\'ouvreur — après bunker:', afterB);
console.log('valeurs lues par l\'ouvreur — après urgence:', afterU);
console.log('INCHANGÉ :', before === afterB && afterB === afterU);
