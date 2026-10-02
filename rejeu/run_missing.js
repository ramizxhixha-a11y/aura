// run_missing.js VARIANT CODE_DIR SEEDS(ex 1,2) — comme run_variant.js (mêmes fenêtres, mêmes backups, 2 en parallèle) mais saute les fenêtres déjà rejouées
// (le conteneur peut être recyclé en cours de route : on reprend là où il s'est arrêté)
// [OUTILS · 02/10/2026] VERSION 20261002a · backups lus dans un dossier (plus de chemins de session) ; toutes les fenêtres
// que les backups permettent. Mode d'emploi : PASSATION-AURA8.md, « Démarrage de session », point 8.
'use strict';
const { spawn } = require('child_process'), path = require('path'), fs = require('fs');
const [V, D, SEEDS = '1,2', PBASE = '8800'] = process.argv.slice(2);
// Backups réels : dossier AURA_BACKUPS (défaut rejeu/backups, ignoré par git — un backup n'entre jamais dans le dépôt), triés par l'horodatage
// du nom (aura_guardian_full_AAAAMMJJ-HHMMSS.json, préfixe toléré, doublons d'horodatage écartés) ; fenêtre k = état du backup k−1, bougies du backup k.
const BD = process.env.AURA_BACKUPS || path.join(__dirname, 'backups'), _ts = f => (f.match(/aura_guardian_full_(\d{8}-\d{6})\.json$/) || [])[1];
const B = (fs.existsSync(BD) ? fs.readdirSync(BD) : []).filter(_ts).sort((x, y) => _ts(x).localeCompare(_ts(y))).filter((f, i, a) => !i || _ts(f) !== _ts(a[i - 1])).map(f => path.join(BD, f));
if (B.length < 2) { console.error('Il faut au moins deux backups aura_guardian_full_*.json dans ' + BD + ' (variable AURA_BACKUPS)'); process.exit(2); }
const OUT = path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
const jobs = []; SEEDS.split(',').forEach(s => { for (let k = 1; k < B.length; k++) { const o = path.join(OUT, `${V}_s${s}_w${k}.json`); if (!fs.existsSync(o)) jobs.push([s, k, o]); } });
console.log('à rejouer : ' + jobs.map(j => 's' + j[0] + 'w' + j[1]).join(' '));
function runOne([s, k, out], port) {
  return new Promise(res => {
    const tmp = out + '.part';
    const p = spawn('node', [path.join(__dirname, 'harness.js'), '--root', D, '--prev', B[k - 1], '--cur', B[k], '--out', tmp, '--tag', `${V}_w${k}`, '--port', String(port), '--seed', s, '--observe', '0', '--modes', process.env.MODES || 'ev'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let so = '', se = ''; p.stdout.on('data', d => so += d); p.stderr.on('data', d => se += d);
    p.on('close', code => { const l = so.trim().split('\n').pop() || ('ERREUR ' + code + ' ' + se.split('\n').filter(x => /ERR|Error/.test(x)).slice(0, 2).join(' | '));
      if (code === 0 && fs.existsSync(tmp)) fs.renameSync(tmp, out);
      fs.appendFileSync(path.join(OUT, `${V}_s${s}.txt`), l + '\n'); console.log('s' + s + ' ' + l); res(); });
  });
}
(async () => { const q = jobs.slice(); await Promise.all([0, 1].map(async w => { while (q.length) { const j = q.shift(); await runOne(j, Number(PBASE) + w * 20 + Number(j[0])); } })); fs.writeFileSync(path.join(OUT, `run_${V}_done.txt`), 'FINI ' + new Date().toISOString()); })();
