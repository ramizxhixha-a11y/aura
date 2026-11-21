// [GO LIBÉRER · 21/11/2026] mesure pour rejeu/sonde_modes.js --inject : à chaque minute simulée, en EV, le seuil (03 _thLevel), la voix (15b _tlrTientEV),
// les positions EV des bots (auto) et de la voix, les ouvertures du bot vues par 09c (brainLog OPEN / refus).
(function () {
  const M = [];
  const ev = () => (S.walletStore && S.walletStore.paperReal) || {};
  window.__probe = {
    minute(m) {
      let th = null, tient = null;
      try { th = _thLevel(); } catch (e) { th = 'err'; }
      try { tient = window._tlrTientEV ? window._tlrTientEV() : null; } catch (e) { tient = 'err'; }
      const op = (S.tradingMode === 'paperReal' ? S.openPositions : ev().openPositions) || [];
      M.push({ m, mode: S.tradingMode, th: th === Infinity ? 'Infinity' : th, tient, reelOn: S.tendance && S.tendance.reel ? S.tendance.reel.on : null,
        evBot: op.filter(p => p && p.auto === true).length, evVoix: op.filter(p => p && p._voix).length,
        evTrades: Object.values(ev().pairStates || {}).reduce((s, ps) => s + ((ps.trades || []).filter(t => t && t.type === 'open' && t.ts > (window.__t0 || 0)).length), 0) });
    },
    end() {
      const last = M[M.length - 1] || {};
      return { dit: `EV : seuil ${last.th} · voix tient ${last.tient} · positions bots ${last.evBot} · voix ${last.evVoix} · ouvertures depuis le départ ${last.evTrades}`, minutes: M };
    }
  };
  window.__t0 = Date.now();
})();
