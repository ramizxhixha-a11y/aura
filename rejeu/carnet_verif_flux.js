// [CARNET · 04/10/2026] rejeu/carnet_verif_flux.js — preuve que rejeu/carnet_flux.c rejoue _recordTrade À L'IDENTIQUE.
// La fonction RÉELLE de js/02-state-init.js (extraite par ancres, exécutée en vm, son propre Math.floor, sa propre moyenne mobile) reçoit les
// mêmes trades (CSV d'archive sur stdin) ; chaque seau qu'elle termine est écrit au même format que carnet_flux.c (8 × 8 octets) pour les deux
// vues (tous les trades ; ceux que garde l'anti-flood de 02 : un message au plus par 250 ms). Comparer ensuite les fichiers octet par octet.
// usage : unzip -p jour.zip | node rejeu/carnet_verif_flux.js <préfixe>
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path'), readline = require('readline');
const s02 = fs.readFileSync(path.join(__dirname, '..', 'js', '02-state-init.js'), 'utf8');
function between(s, a, b, incl) {
  const i = s.indexOf(a); if (i < 0 || s.indexOf(a, i + 1) >= 0) throw new Error('ancre : ' + a.slice(0, 60));
  const j = s.indexOf(b, i + a.length); if (j < 0) throw new Error('ancre fin : ' + b.slice(0, 60));
  return s.slice(i, incl ? j + b.length : j);
}
const CODE = between(s02, 'var _flowEmaNotional = {};', 'window._recordTrade = _recordTrade;', false);
function makeView(out) {
  const ctx = { S: { flowStats: {} }, Date, Math, isFinite, window: {} };
  vm.createContext(ctx); vm.runInContext(CODE, ctx, { filename: '02-extrait.js' });
  return { rec: vm.runInContext('_recordTrade', ctx), S: ctx.S, fd: fs.openSync(out, 'w'), lastT: null, n: 0 };
}
const PFX = process.argv[2]; if (!PFX) { console.error('usage : … | node carnet_verif_flux.js <préfixe>'); process.exit(2); }
const V = makeView(PFX + '.v.bin'), A = makeView(PFX + '.a.bin');
const buf = Buffer.alloc(64);
function emit(view, b) {
  buf.writeBigInt64LE(BigInt(b.t), 0);
  [b.buyQ, b.sellQ, b.n, b.bigBuy, b.bigSell, b.bigBuyUsd, b.bigSellUsd].forEach((x, k) => buf.writeDoubleLE(x, 8 + 8 * k));
  fs.writeSync(view.fd, buf); view.n++;
}
function feed(view, price, qty, sell, T) {
  const arr = view.S.flowStats.P || [], before = arr.length ? arr[arr.length - 1] : null;
  view.rec('P', price, qty, sell, T);
  const a2 = view.S.flowStats.P || [], last = a2.length ? a2[a2.length - 1] : null;
  if (before && last !== before) emit(view, before);           // un seau neuf : le précédent est fini
  view.lastB = last;
}
let lastA = 0;
const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on('line', l => {
  if (!/^[0-9]/.test(l)) return;
  const f = l.split(',');
  let T = parseInt(f[4], 10); if (T > 1e14) T = Math.floor(T / 1000);
  const price = parseFloat(f[1]), qty = parseFloat(f[2]), sell = (f[5] === 'True' || f[5] === 'true');
  feed(V, price, qty, sell, T);
  if (!(lastA && (T - lastA) < 250)) { lastA = T; feed(A, price, qty, sell, T); }
});
rl.on('close', () => {
  [V, A].forEach(v => { if (v.lastB) emit(v, v.lastB); fs.closeSync(v.fd); });
  console.error(`vérif : ${V.n} seaux (vue app ${A.n})`);
});
