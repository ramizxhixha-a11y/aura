// rejeu/sondes/n75-m2.js — [GO N° 75 · 15/11/2026] mesure M2 de la porte rejeu/porte_n75.js, injectée par rejeu/sonde_modes.js --inject.
// Pendant que le bot joue : ouvertures et fermetures du bot (mode, paire, sens, mise, emprunt, part versée en argent) et, chaque seconde, E = la part
// « exposition » des positions ouvertes de chaque mode (pos.levBorrowed − part en argent, comme 02 _posLevCash). Lecture seule : rien n'est enveloppé.
(function () {
  const R = { ouvertures: [], fermetures: [], secondesE: 0, Emax: 0, EmaxMode: null, erreurs: [] };
  const r6 = x => Math.round((Number(x) || 0) * 1e6) / 1e6;
  const cash = p => { const tot = Math.max(0, Number(p && p.levBorrowed) || 0); if (!(tot > 0)) return 0;
    if (p._levCash !== undefined && p._levCash !== null && isFinite(Number(p._levCash))) return Math.min(tot, Math.max(0, Number(p._levCash)));
    const st = Number(p.stakeUsdt) || 0, ex = Number(p.totalExposure) || st; return Math.min(tot, Math.max(0, tot - Math.max(0, ex - st))); };
  const posDe = m => { const w = (S.walletStore && S.walletStore[m]) || {}; return (m === S.tradingMode ? S.openPositions : w.openPositions) || []; };
  const vus = {};
  window.__probe = {
    second() {
      try {
        let eSec = 0;
        ['sim', 'paperReal', 'real'].forEach(m => { let E = 0;
          posDe(m).forEach(p => { if (!p) return; E += Math.max(0, (Number(p.levBorrowed) || 0) - cash(p));
            if (p.auto === true && !vus[p.id]) { vus[p.id] = [m, p.pair, p.side, r6(p.stakeUsdt)]; R.ouvertures.push([m, p.pair, p.side, r6(p.stakeUsdt), r6(p.levBorrowed), r6(cash(p))]); } });
          if (E > 1e-9) { eSec = 1; if (E > R.Emax) { R.Emax = r6(E); R.EmaxMode = m; } } });
        R.secondesE += eSec;
        Object.keys(vus).forEach(id => { const v = vus[id]; if (v && v !== 2 && !['sim', 'paperReal', 'real'].some(m => posDe(m).some(x => x && x.id === id))) { R.fermetures.push(v); vus[id] = 2; } });
      } catch (e) { if (R.erreurs.length < 5) R.erreurs.push(String(e).slice(0, 160)); }
    },
    minute() {},
    end() { R.dit = ['M2 · secondes avec une part « exposition » ouverte : ' + R.secondesE + ' · E max ' + R.Emax + ' (' + R.EmaxMode + ')',
      'M2 · ouvertures du bot : ' + R.ouvertures.length + ' · fermetures : ' + R.fermetures.length + (R.erreurs.length ? ' · erreurs ' + JSON.stringify(R.erreurs) : '')]; return R; }
  };
})();
