// run_variant.js VARIANT CODE_DIR [SEED] [WINDOWS=1-N] — rejoue les fenêtres (état = backup k−1, bougies = backup k), 2 en parallèle
// [OUTILS · 02/10/2026] VERSION 20261002a · backups lus dans un dossier (plus de chemins de session). Mode d'emploi : PASSATION-AURA8.md, « Démarrage de session », point 8.
'use strict';
const { spawn } = require('child_process'), path = require('path'), fs = require('fs');
const [V, D, SEED = '1', WIN0 = '', PBASE = '8800'] = process.argv.slice(2);   // PBASE : base des ports (deux lancements en parallèle sur la même graine)
// Backups réels : dossier AURA_BACKUPS (défaut rejeu/backups, ignoré par git — un backup n'entre jamais dans le dépôt), triés par l'horodatage
// du nom (aura_guardian_full_AAAAMMJJ-HHMMSS.json, préfixe toléré, doublons d'horodatage écartés) ; fenêtre k = état du backup k−1, bougies du backup k.
const BD = process.env.AURA_BACKUPS || path.join(__dirname, 'backups'), _ts = f => (f.match(/aura_guardian_full_(\d{8}-\d{6})\.json$/) || [])[1];
const B = (fs.existsSync(BD) ? fs.readdirSync(BD) : []).filter(_ts).sort((x, y) => _ts(x).localeCompare(_ts(y))).filter((f, i, a) => !i || _ts(f) !== _ts(a[i - 1])).map(f => path.join(BD, f));
if (B.length < 2) { console.error('Il faut au moins deux backups aura_guardian_full_*.json dans ' + BD + ' (variable AURA_BACKUPS)'); process.exit(2); }
const WIN = WIN0 || ('1-' + (B.length - 1));
const [a, b] = WIN.split('-').map(Number); const ks = []; for (let k = a; k <= (b || a); k++) ks.push(k);
const OUT = path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
let slot = 0; const lines = [];
function runOne(k, port) {
  return new Promise(res => {
    const out = path.join(OUT, `${V}_s${SEED}_w${k}.json`);
    const p = spawn('node', [path.join(__dirname, 'harness.js'), '--root', D, '--prev', B[k - 1], '--cur', B[k], '--out', out, '--tag', `${V}_w${k}`, '--port', String(port), '--seed', SEED, '--observe', process.env.OBSERVE || '0', '--modes', process.env.MODES || 'ev'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let so = '', se = ''; p.stdout.on('data', d => so += d); p.stderr.on('data', d => se += d);
    p.on('close', code => { const l = so.trim().split('\n').pop() || ('ERREUR ' + code + ' ' + se.split('\n').filter(x => /ERR|Error/.test(x)).slice(0, 2).join(' | ')); lines.push(l); console.log(l); res(); });
  });
}
(async () => {
  const queue = ks.slice(); const workers = [0, 1].map(async w => { while (queue.length) { const k = queue.shift(); await runOne(k, Number(PBASE) + w * 20 + Number(SEED)); } });
  await Promise.all(workers);
  fs.appendFileSync(path.join(OUT, `${V}_s${SEED}.txt`), lines.join('\n') + '\n');
})();
