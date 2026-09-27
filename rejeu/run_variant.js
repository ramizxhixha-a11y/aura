// run_variant.js VARIANT CODE_DIR [SEED] [WINDOWS=1-9] — rejoue les fenêtres (état = backup k−1, bougies = backup k), 2 en parallèle
'use strict';
const { spawn } = require('child_process'), path = require('path'), fs = require('fs');
const [V, D, SEED = '1', WIN = '1-9'] = process.argv.slice(2);
const U = '/mnt/user-data/uploads/';
const B = ['aura_guardian_full_20260914-152719.json', 'aura_guardian_full_20260915-180411.json', 'aura_guardian_full_20260917-001039.json', 'aura_guardian_full_20260919-122220.json',
  'aura_guardian_full_20260920-213058.json', 'aura_guardian_full_20260921-212447.json', 'aura_guardian_full_20260922-155605.json', 'aura_guardian_full_20260923-123512.json',
  'aura_guardian_full_20260925-194758.json'].map(f => U + f).concat(['/root/.claude/uploads/81cc7bc3-c277-5d7b-a23b-a43db24c04a8/cbc5da64-aura_guardian_full_20260927-105437.json']);
const [a, b] = WIN.split('-').map(Number); const ks = []; for (let k = a; k <= (b || a); k++) ks.push(k);
const OUT = path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
let slot = 0; const lines = [];
function runOne(k, port) {
  return new Promise(res => {
    const out = path.join(OUT, `${V}_s${SEED}_w${k}.json`);
    const p = spawn('node', [path.join(__dirname, 'harness.js'), '--root', D, '--prev', B[k - 1], '--cur', B[k], '--out', out, '--tag', `${V}_w${k}`, '--port', String(port), '--seed', SEED, '--observe', process.env.OBSERVE || '0'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let so = '', se = ''; p.stdout.on('data', d => so += d); p.stderr.on('data', d => se += d);
    p.on('close', code => { const l = so.trim().split('\n').pop() || ('ERREUR ' + code + ' ' + se.split('\n').filter(x => /ERR|Error/.test(x)).slice(0, 2).join(' | ')); lines.push(l); console.log(l); res(); });
  });
}
(async () => {
  const queue = ks.slice(); const workers = [0, 1].map(async w => { while (queue.length) { const k = queue.shift(); await runOne(k, 8800 + w * 20 + Number(SEED)); } });
  await Promise.all(workers);
  fs.writeFileSync(path.join(OUT, `${V}_s${SEED}.txt`), lines.join('\n') + '\n');
})();
