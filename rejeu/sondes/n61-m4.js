// rejeu/sondes/n61-m4.js — [GO N° 61 · 15/11/2026] mesure M4 de la porte rejeu/porte_n61.js, injectée par rejeu/sonde_modes.js --inject.
// Pendant que le bot joue (AUTO), compte : les appels de 09j validateManualExposure (avec la fonction qui appelle), les lectures de
// getCapitalSummary().free (avec la fonction qui lit), et les contrôles de capital du bot (validateTotalExposure appelée depuis 09c). Liste aussi les
// ouvertures et fermetures du bot (mode, paire, sens, mise) pour M4b. Lecture seule : les fonctions sont enveloppées, leurs réponses rendues telles quelles.
(function () {
  const R = { vme: 0, vmeDe: {}, libre: 0, libreDe: {}, vteBot: 0, vteAutre: 0, vteDe: {}, ouvertures: [], fermetures: [], erreurs: [] };
  // la 1re fonction NOMMÉE de l'app dans la pile (une flèche anonyme, ex. dans un forEach, est sautée)
  const qui = (st) => { for (const x of String(st || '').split('\n').slice(2, 12)) { const m = x.match(/at ([\w$.]+) \(.*\/(js\/[^:?]+)/); if (m && !/^Array\.|^Object\./.test(m[1])) return m[2] + ':' + m[1].split('.').pop(); }
    return '?'; };
  const bump = (o, k) => { o[k] = (o[k] || 0) + 1; };
  try {
    if (typeof validateManualExposure === 'function') { const f = validateManualExposure;
      window.validateManualExposure = validateManualExposure = function (a, b) { R.vme++; bump(R.vmeDe, qui(new Error().stack)); return f.apply(this, arguments); }; }
    const g = getCapitalSummary;
    window.getCapitalSummary = getCapitalSummary = function () { const r = g.apply(this, arguments); const v = r.free; const st = new Error().stack;
      Object.defineProperty(r, 'free', { enumerable: true, get() { R.libre++; bump(R.libreDe, qui(st)); return v; } }); return r; };
    const t = validateTotalExposure;
    window.validateTotalExposure = validateTotalExposure = function () { const st = new Error().stack; const k = qui(st);
      if (/09c-auto-open/.test(st)) R.vteBot++; else R.vteAutre++; bump(R.vteDe, k); return t.apply(this, arguments); };
  } catch (e) { R.erreurs.push(String(e).slice(0, 160)); }
  const vus = {};
  window.__probe = {
    second() {
      try { const W = (typeof _walletFor === 'function') ? null : null;
        ['sim', 'paperReal', 'real'].forEach(m => { const w = (S.walletStore && S.walletStore[m]) || null; const pos = m === S.tradingMode ? S.openPositions : (w && w.openPositions) || [];
          (pos || []).forEach(p => { if (p && p.auto === true && !vus[p.id]) { vus[p.id] = 1; R.ouvertures.push([m, p.pair, p.side, Math.round((Number(p.stakeUsdt) || 0) * 1e6) / 1e6]); } });
          Object.keys(vus).forEach(id => { if (vus[id] === 1 && !['sim', 'paperReal', 'real'].some(mm => { const ww = (S.walletStore && S.walletStore[mm]) || {}; const pp = mm === S.tradingMode ? S.openPositions : ww.openPositions; return (pp || []).some(x => x && x.id === id); })) { vus[id] = 2; R.fermetures.push(id); } });
        });
      } catch (e) { if (R.erreurs.length < 5) R.erreurs.push(String(e).slice(0, 160)); }
    },
    minute() {},
    end() { R.dit = ['M4 · validateManualExposure : ' + R.vme + ' appel(s) ' + JSON.stringify(R.vmeDe), 'M4 · getCapitalSummary().free : ' + R.libre + ' lecture(s) ' + JSON.stringify(R.libreDe),
      'M4 · contrôles du bot (validateTotalExposure depuis 09c) : ' + R.vteBot + ' · autres : ' + R.vteAutre + ' ' + JSON.stringify(R.vteDe),
      'M4b · ouvertures du bot : ' + R.ouvertures.length + ' · fermetures : ' + R.fermetures.length + (R.erreurs.length ? ' · erreurs ' + JSON.stringify(R.erreurs) : '')]; return R; }
  };
})();
