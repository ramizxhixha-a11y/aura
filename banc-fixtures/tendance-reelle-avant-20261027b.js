// banc-fixtures/tendance-reelle-avant-20261027b.js — [GO TENDANCE RÉELLE · 12/11/2026] témoin : openPosition et closePosition de 02 au commit dcbd4ad (token 20261027b), AVANT la voix réelle.
// Lu par banc-tendance-reelle.js (B3 / A3) : sans la marque _voix, le nouveau texte doit écrire exactement le même état.
function openPosition(pair, side, opts) {
  const _warn = _manOpenWarnings(pair, side);   // [MANU · 05/10/2026] dits, plus jamais un refus muet
  const _o = (opts && typeof opts === 'object') ? opts : {};

  const ps  = S.pairStates[pair];
  const cfg = PAIRS[pair];
  if(!ps) { showToast('⚠ ' + pair + ' : paire inconnue'); return null; }

  // Max 1 position par paire.
  // [GO ARGENT · 13/10/2026] une position déjà ouverte n'est plus fermée en silence AVANT les contrôles : la fermeture était faite, puis
  // l'ouverture pouvait être refusée (capital, levier) — position perdue, aucune nouvelle (ETAT n° 20) ; elle pouvait aussi être celle d'un bot.
  // Désormais l'ouverture est refusée et dit pourquoi : « ✕ Fermer » ou « ↓ Inverser » (07 manuInvert : ferme, vérifie, rouvre) restent là.
  const existing = S.openPositions.find(p => p.pair === pair);
  if(existing) {
    showToast('⚠ ' + pair + ' : une position ' + String(existing.side || '').toUpperCase() + (existing.auto === true ? ' du bot est déjà ouverte — ferme-la d\'abord (✕)' : ' est déjà ouverte — ferme-la (✕) ou inverse-la (↓) d\'abord'), 3500, 'warn');
    return null;
  }

  const id        = 'p'+Date.now().toString(36);
  const stakeUsdt = ps.stake || 10;
  const pairLev   = ps.pairLeverage || 1;

  // Levier manuel : emprunter la part leveragée de la réserve
  const leverageBonus = stakeUsdt * (pairLev - 1);
  const levBorrowed   = leverageBonus > 0 ? borrowLeverage(leverageBonus, pair) : 0;
  const totalExposure = stakeUsdt + levBorrowed;

  // ── Validation capital avant ouverture manuelle ──────────
  const capCheck = validateTotalExposure(stakeUsdt, levBorrowed);
  if(!capCheck.ok && capCheck.available < stakeUsdt * 0.5) {
    showToast('⚠ Capital max atteint · ' + fmt$(Math.max(0,capCheck.available)) + ' libre', 2800, 'critical');
    if(levBorrowed > 0) repayLeverage(levBorrowed);
    return null;
  }

  // v7.2 Phase 14c-revised · Emprunt automatique JIT si levier ≥ 1 et trading insuffisant
  // S'applique en mode manuel, auto, et semi-auto (bot pré-remplit, user valide).
  let _jitBorrowedManual = 0;  // v7.12 · P7 · track JIT borrow for manual trade
  try {
    if((S.leverage || 0) >= 1 && stakeUsdt > (S.tradingAccount || 0)) {
      const r = ensureLeverageCoverForTrade(stakeUsdt, pair);
      if(!r.ok) {
        showToast('⚠ Trading insuffisant · levier ' + (r.reason==='leverage_off'?'désactivé':'réserve vide') + ' · '+fmt$2(r.shortfall)+' manquant', 3200, 'critical');
        if(levBorrowed > 0) repayLeverage(levBorrowed);
        return null;
      }
      if (r.borrowed > 0) _jitBorrowedManual = r.borrowed;
    }
  } catch(e) { console.warn('auto-leverage cover:', e); }
  // v7.12 · P7 · Consommer le pending
  if (S._pendingPositionBorrow) {
    _jitBorrowedManual = Math.max(_jitBorrowedManual, S._pendingPositionBorrow);
    S._pendingPositionBorrow = 0;
  }
  // [GO LEVIER · 18/10/2026] (ETAT n° 25) la mise ne dépasse jamais ce que le trading tient VRAIMENT (emprunt « juste à temps » compris) : le débit
  // ci-dessous était borné à zéro — une mise de 124 $ avec 73 $ au trading (levier ×0 : le contrôle de capital laisse passer jusqu'au double du
  // disponible ; levier ×1+ : emprunt JIT plafonné) ouvrait 124 $ et créait les 51 $ manquants. Refus dit ; les emprunts de cette ouverture sont rendus.
  if (stakeUsdt > (S.tradingAccount || 0) + 1e-9) {
    if (_jitBorrowedManual > 0) _repayCashDebt(_jitBorrowedManual);
    if (levBorrowed > 0) repayLeverage(levBorrowed);
    showToast('⚠ ' + pair + ' : mise ' + fmt$2(stakeUsdt) + ' > trading ' + fmt$2(S.tradingAccount || 0) + ((S.leverage || 0) >= 1 ? ' (emprunt du levier insuffisant)' : ' (levier ×0)') + ' · rien ouvert', 3500, 'critical');
    return null;
  }

  // Déduire la mise propre du compte trading
  // [GO NETTOYAGE · 19/10/2026] (ETAT n° 58) S.portfolio n'est plus écrit ICI, entre le débit de la mise et l'ajout de la position (la mise n'était comptée
  // nulle part : portefeuille trop bas d'une mise jusqu'au calcul suivant) — il l'est juste après l'ajout, plus bas.
  S.tradingAccount = Math.max(0, S.tradingAccount - stakeUsdt);
  syncLeverageReserve();

  const amount  = (totalExposure / Math.max(0.0001, ps.price)).toFixed(cfg.dec>=4?4:6);
  const priceTag= cfg.dec>=4 ? ps.price.toFixed(cfg.dec) : '$'+Math.floor(ps.price).toLocaleString();

  // [CONSIGNES · 06/10/2026] niveaux du bon côté pour le sens ouvert, consignes de la paire
  const _d = side === 'long' ? 1 : -1, _px = Number(ps.price);
  const _okPct = (v) => isFinite(v) && v > 0 && v < 100;
  let _tp = (_okPct(Number(_o.tpPct)) && _px > 0) ? _px * (1 + _d * Number(_o.tpPct) / 100) : null;
  let _sl = (_okPct(Number(_o.slPct)) && _px > 0) ? _px * (1 - _d * Number(_o.slPct) / 100) : null;
  if (_tp === null || _sl === null) {
    let _b = null; try { _b = (typeof _calcBotTpSl === 'function') ? _calcBotTpSl(pair, side) : null; } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} }
    if (_tp === null && _b && _b.tp > 0) _tp = _b.tp;
    if (_sl === null && _b && _b.sl > 0) _sl = _b.sl;
  }
  const _cons = _manConsigneOf(pair);

  S.openPositions.push({
    id, pair, side,
    entryPrice:   ps.price, openedAt:Date.now(),
    amount:       parseFloat(amount),
    stakeUsdt,
    levBorrowed: (levBorrowed || 0) + _jitBorrowedManual,  // v7.12 · P7 · inclure JIT
    _levCash:    _jitBorrowedManual,                        // [GO LEVIER · 18/10/2026] part versée en ARGENT au trading (JIT) : rendue sur le trading à la fermeture
    totalExposure,
    entryTime:    nowStr(),
    entryTs:      Date.now(),
    _fxIn:        ((Number(S._usdEurLastFetch) > 0 && Number(S.usdEurRate) > 0) ? Number(S.usdEurRate) : null),   // [GO FISCAL · 07/10/2026] cours USD→EUR reçu, à l'achat (16)
    pnl:          0, pnlUsdt: 0,
    currentVal:   stakeUsdt,   // [GO LEVIER · 18/10/2026] ce que la position rendrait au trading (02 _posMark) — avant : l'exposition, l'emprunt compté
    auto:         false,
    tp:           _tp,
    sl:           _sl,
    _manOpenedAt:   Date.now(),                                                           // [CONSIGNES · 06/10/2026] lu par 09e
    _manMaxLossPct: Number(_o.maxLossPct) > 0 ? Number(_o.maxLossPct) : _cons.maxLossPct,
    _manTimeoutMin: Number(_o.timeoutMin) > 0 ? Number(_o.timeoutMin) : _cons.timeoutMin,
    conviction:   lmsrP(ps),
    _peakPnl:     0,
    _openReason:  `Ouverture manuelle · LMSR ${(lmsrP(ps)*100).toFixed(0)}%`,
    _openAgents:  [...S.agents].filter(a => !a.isBot && !a.isMeta && Math.abs(a.score||0) > 0.1)
                    .sort((a,b) => Math.abs(b.score||0)*b.fitness - Math.abs(a.score||0)*a.fitness)
                    .slice(0,5)
                    .map(a => ({ emoji:a.emoji, name:a.name.split(' ')[0].split('·')[0].trim(), score:a.score||0 }))
  });
  S.portfolio = _computePortfolio();   // [23/08] canonique · [GO NETTOYAGE · 19/10/2026] (n° 58) après l'ajout de la position : sa mise y est comptée
  if (typeof _updateCloseAllBadge === 'function') _updateCloseAllBadge();

  ps.trades.push({
    side:          side === 'long' ? 'buy' : 'sell',
    type:          'open',
    amount:        String(amount),
    price:         ps.price,
    pnl:           0,
    stakeUsdt,
    levBorrowed,
    totalExposure,
    pnlUsdt:       null,
    ts:            Date.now(),
    time:          nowStr()
  });
  if(ps.trades.length > 100) ps.trades.splice(0, ps.trades.length - 100);

  const levStr = levBorrowed > 0 ? ` (×${pairLev} lev → $${totalExposure})` : '';
  S.chainLog.push({
    icon: side==='long'?'🟢':'🔴',
    desc: `Position ${side.toUpperCase()} ${pair} | $${stakeUsdt}${levStr} @${priceTag}`,
    hash: rndHash(), time: nowStr()
  });
  if(!existing) showToast('📈 '+side.toUpperCase()+' '+pair+' — $'+totalExposure+' USDT'+levStr);
  // v19 · #38 Notification trade ouvert
  try { if(typeof notifTradeOpen === 'function') notifTradeOpen(pair, side, totalExposure); } catch(e) {}
  // [MANU · 05/10/2026] l'avis du système est dit, le trade est le tien
  if (_warn.length) {
    try {
      S.chainLog.push({ icon: '\u26A0', desc: `Ouverture manuelle ${pair} ${side.toUpperCase()} · ${_warn.join(' · ')} · ouverte à ta demande`, hash: rndHash(), time: nowStr() });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
      showToast('\u26A0 ' + pair + ' ' + side.toUpperCase() + ' ouvert ' + _warn.join(' · '), 3500, 'warn');
    } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} }
  }
  // [MODES SÉPARÉS · 10/10/2026] rendus immédiats pour le mode affiché seulement (voir closePosition, plus bas) : une ouverture faite derrière l'écran
  // (04 executePending dans son mode, bot du multiplexeur) ne peint plus ses positions sur l'écran d'un autre mode.
  if (!((typeof _modeBehind === 'function') && _modeBehind())) {
    updatePairBtnStates();
    renderPositions();
    if(S.currentPage===4) renderChain();
  }
  return S.openPositions.find(p => p.id === id) || null;
}
function closePosition(id, botClose = false) {
  // [GO NETTOYAGE · 19/10/2026] (ETAT n° 55) 3e argument { partiel: true } : la part fermée d'une sortie par paliers (05 closePartial, découpée en une
  // position à part) passe par ICI — frais sur l'exposition et réserve anti-négatif (recordFees), impôt au registre légal (16) —, mais comme une urgence
  // pour tout ce qui nourrit la décision (statistiques, juges, apprentissage, journal des frais lu par la décision) et SANS ligne d'historique (voir plus
  // bas) : la sortie par paliers n'y touchait pas avant, elle n'y touche toujours pas. Avant : 05 créditait le trading lui-même (frais sur la mise, sans
  // slippage, ni réserve, ni impôt).
  const _part = !!(arguments[2] && arguments[2].partiel);
  const _urg = !!(arguments[2] && arguments[2].urgence) || _part;   // [GO ARGENT · 13/10/2026] 3e argument { urgence: true } (06), voir ci-dessus
  // [GO ALERTES · 15/10/2026] 3e argument { sortie: { k: 'tp' | 'sl', why } } : posé par les sorties « objectif » ou « stop » (07 TP / SL / trailing /
  // garde-fou −90 %, 05 trailing, 09e perte max de tes consignes, 10f niveaux ATR, gain et stop appris, stop sur coupure, perte max) — lu SEULEMENT par
  // les notifications (« 🎯 TP / SL atteint ») et le message Telegram du trade. Aucune règle d'argent ni de décision ne le lit.
  const _sortie = (arguments[2] && arguments[2].sortie && (arguments[2].sortie.k === 'tp' || arguments[2].sortie.k === 'sl'))
    ? { k: arguments[2].sortie.k, why: String(arguments[2].sortie.why || '') } : null;
  // ★ REGLES REEL v2 (Rams 05/07) · les fermetures de PROTECTION (stop-loss,
  // TP, perte excessive) sont PERMISES en Reel, en MANU comme en AUTO :
  // "le bot surveille et stoppe si necessaire, meme si je l'ai oublie".
  // v7.12 · PACK RÉSILIENCE · sauvegarde avant fermeture
  try { if (typeof _p5PreActionSave === 'function') _p5PreActionSave('close'); } catch(e) {}

  const pos = S.openPositions.find(p=>p.id===id);
  if(!pos) {
    console.error('[closePosition] Position non trouvée pour id=' + id);
    if (typeof showToast === 'function') showToast('❌ Position introuvable: ' + id, 4000, 'critical');
    return;
  }

  // ABSOLUTE RULE: bot cannot close a manual position
  if(botClose && pos.auto !== true) return;

  const ps  = S.pairStates[pos.pair];
  const cfg = PAIRS[pos.pair];
  // [STOP CÔTÉ EXCHANGE SIMULÉ · 26/09/2026] prix de sortie IMPOSÉ, posé par 10f uniquement quand une coupure a fait traverser
  // le stop : l'exchange aurait exécuté AU stop, pas au prix de retour (décision Rams 26/09 : « oui aux deux »). Consommé une fois.
  const _forced = (isFinite(pos._forcedExitPx) && pos._forcedExitPx > 0) ? pos._forcedExitPx : null;
  if (_forced !== null) delete pos._forcedExitPx;
  const cur = _forced !== null ? _forced : (ps ? ps.price : pos.entryPrice);

  // ═══ v7.12 · QUANTFURY B · Règle "liquidation nette" ═══
  // - Clamp : une perte ne peut JAMAIS dépasser -100% (impossible de devoir plus que la marge)
  // - Cap haut : +500% max (protège contre bugs de prix irréalistes)
  // - Coté USD : la perte USD est limitée au stake propre (pas de dette résiduelle)
  const rawPct = pos.side === 'long'
    ? ((cur - pos.entryPrice) / pos.entryPrice) * 100
    : ((pos.entryPrice - cur) / pos.entryPrice) * 100;
  const realisedPct = Math.max(-100, Math.min(500, rawPct));
  if (rawPct < -100 || rawPct > 500) {
    console.warn('[closePosition] pct clamped (Quantfury B):', pos.pair, pos.side, 'raw:', rawPct.toFixed(1), '→', realisedPct.toFixed(1));
  }

  // PnL calculé sur l'exposition totale (stake propre + levier emprunté)
  const totalExp    = pos.totalExposure || pos.stakeUsdt;
  const rawUsd = totalExp * (realisedPct / 100);
  // Quantfury B · La perte USD ne peut JAMAIS dépasser le stake propre engagé
  // (si levier, le système "liquide" la position à -100% de la marge, pas plus)
  const realisedUsd = Math.max(-pos.stakeUsdt, rawUsd);

  // ANTI-REVENGE : à chaque fermeture, on signale le résultat au système qui décide
  // de bloquer le bot après une grosse perte ou une série de pertes (cooldown).
  // Branché ici pour que la protection s'active réellement (avant, jamais appelée).
  // [ÉCOLE VIVANTE · 10/10/2026, matin] l'anti-revenge était UN SEUL état pour les trois modes : armé, il refusait 15 min toute ouverture des bots en EV et en
  // RE (09c). Une fermeture de l'AA derrière un autre écran ne lui était donc plus signalée (une perte d'école de 1 % l'aurait armé contre l'EV : relecture
  // adverse, 2 déclenchements en 6 h) — mais l'AA À L'ÉCRAN l'armait toujours contre l'EV.
  // [MODES SÉPARÉS · 10/10/2026] L'anti-revenge tient maintenant UN ÉTAT PAR MODE (06) : chaque fermeture le signale au sien, que le mode soit à l'écran ou
  // derrière — une perte de l'école n'arrête plus que l'école (sonde du 10/10, AA à l'écran : sa perte de 2,7 % refusait 15 min toute ouverture en EV et en RE).
  // L'exception du matin (pas de signal pour l'AA derrière l'écran) n'a donc plus lieu d'être : derrière ou à l'écran, un mode suit la même règle.
  // Les effets d'ÉCRAN, eux (alertes, badges, jalons, rendus — plus bas), ne partent que pour le mode affiché : _behind est vrai pour TOUT mode traité derrière
  // l'écran (avant : seulement l'AA).
  const _behind = ((typeof _modeBehind === 'function') && _modeBehind()) || ((typeof _schoolBehind === 'function') && _schoolBehind());
  if (!_urg && typeof checkAntiRevenge === 'function') {
    try { checkAntiRevenge(realisedUsd, realisedPct, pos.pair); } catch(e) {}
  }

  // v7.12 LIVRAISON 8 · STATS + RÈGLES en mode Réel
  if (!_urg && S.tradingMode === 'paperReal' && pos.auto === true) {
    if (!S.paperRealStats) S.paperRealStats = {};
    if (!S.paperRealStats[pos.pair]) {
      S.paperRealStats[pos.pair] = { wins:0, losses:0, pnlNet:0, trades:0, lastTrades:[], lastUpdate:0 };
    }
    const st = S.paperRealStats[pos.pair];
    st.trades += 1;
    st.pnlNet += realisedUsd;
    // v8.0 LIVRAISON 27 FIX · critère unifié > 0 (trade neutre = pas un win)
    if (realisedPct > 0) st.wins += 1; else st.losses += 1;
    st.lastTrades.push(realisedPct > 0 ? 1 : -1);
    if (st.lastTrades.length > 10) st.lastTrades.shift();
    st.lastUpdate = Date.now();

    // Règle : enregistrer dernière fermeture pour cooldown 30min (uniquement si perte)
    if (realisedPct < 0) {
      if (!S.paperRealLastClose) S.paperRealLastClose = {};
      S.paperRealLastClose[pos.pair] = Date.now();
    }

    // Règle : pertes consécutives globales (toutes paires) - ADAPTATIF (Phase 1.1)
    const cfg = S.paperRealConfig || {};
    let maxConsec;
    if (typeof _getAdaptiveConsecLossThreshold === 'function') {
      maxConsec = _getAdaptiveConsecLossThreshold();
    } else {
      maxConsec = cfg.maxConsecLosses || 3;
    }
    const globalPauseMs = cfg.globalPauseMs || 2 * 60 * 60 * 1000;
    if (realisedPct < 0) {
      S.paperRealConsecLosses = (S.paperRealConsecLosses || 0) + 1;
      if (S.paperRealConsecLosses >= maxConsec) {
        S.paperRealGlobalPauseUntil = Date.now() + globalPauseMs;
        const hours = Math.round(globalPauseMs / 3600000);
        try { showToast('🛑 Réel · ' + maxConsec + ' pertes · pause globale ' + hours + 'h', 6000, 'critical'); } catch(e) {}
        try { _updateRealModeBanner(); } catch(e) {}
      }
    } else {
      // Reset au moindre trade gagnant
      S.paperRealConsecLosses = 0;
    }

    // v8.0 PHASE 2 · Enrichir le contexte mémorisé avec le résultat du trade
    if (pos._contextId && typeof _enrichTradeContextOnClose === 'function') {
      try {
        const holdMs = (pos.openedAt) ? (Date.now() - pos.openedAt) : 0;
        _enrichTradeContextOnClose(pos._contextId, realisedPct, realisedUsd, holdMs, pos._path, pos._ruleExit);   // [MÉMOIRE DES CHEMINS · 22/09/2026] · [VÉRITÉ DES RÈGLES · 23/09/2026]
      } catch(e) {}
    }

    // v8.0 PHASE 4a · A/B testing : enregistrer le résultat dans l'arm correspondant
    if (pos._abArm && typeof _abRecordResult === 'function') {
      try {
        _abRecordResult(pos._abArm, realisedPct, realisedUsd);
      } catch(e) {}
    }
  }

  // v7.12 LIVRAISON 6 · STATS PAR PAIRE en mode real (avant kill switch)
  if (!_urg && S.tradingMode === 'real' && pos.auto === true) {
    if (!S.realStatsByPair) S.realStatsByPair = {};
    if (!S.realStatsByPair[pos.pair]) {
      S.realStatsByPair[pos.pair] = { wins:0, losses:0, pnlNet:0, trades:0, lastTrades:[], lastUpdate:0 };
    }
    const st = S.realStatsByPair[pos.pair];
    st.trades += 1;
    st.pnlNet += realisedUsd;
    // v8.0 LIVRAISON 27 FIX · critère unifié > 0 (trade neutre = pas un win)
    if (realisedPct > 0) st.wins += 1; else st.losses += 1;
    st.lastTrades.push(realisedPct > 0 ? 1 : -1);
    if (st.lastTrades.length > 10) st.lastTrades.shift();
    st.lastUpdate = Date.now();

    // v7.12 LIVRAISON 6 · AUTO-PAUSE sous-performance
    // Si 10 derniers trades dispos ET WR < 30% → pause auto cette paire
    if (st.lastTrades.length >= 10) {
      const recentWins = st.lastTrades.filter(v => v > 0).length;
      const recentWR = recentWins / 10;
      if (recentWR < 0.30) {
        if (!S.realKillSwitch) S.realKillSwitch = {};
        const ks = S.realKillSwitch[pos.pair] || { paused:false, lossStreak:0, reason:'' };
        if (!ks.paused) {
          ks.paused = true;
          ks.reason = 'WR<30% sur 10 derniers (' + recentWins + 'W)';
          S.realKillSwitch[pos.pair] = ks;
          try { showToast('🛑 Auto-pause · ' + pos.pair + ' · WR ' + (recentWR*100).toFixed(0) + '%', 5500, 'critical'); } catch(e) {}
          try { _updateRealModeBanner(); } catch(e) {}
        }
      }
    }
  }

  // v7.12 LIVRAISON 4 · KILL SWITCH en mode real
  // Si 3 pertes consécutives sur une paire (trades AUTO uniquement) → pause auto cette paire
  if (!_urg && S.tradingMode === 'real' && pos.auto === true) {
    if (!S.realKillSwitch) S.realKillSwitch = {};
    if (!S.realKillSwitch[pos.pair]) S.realKillSwitch[pos.pair] = { paused:false, lossStreak:0, reason:'' };
    const ks = S.realKillSwitch[pos.pair];
    if (realisedPct < 0) {
      ks.lossStreak = (ks.lossStreak || 0) + 1;
      if (ks.lossStreak >= 3 && !ks.paused) {
        ks.paused = true;
        ks.reason = '3 pertes consécutives';
        try { showToast('🛑 Kill switch · ' + pos.pair + ' en pause auto (3 pertes)', 5500, 'critical'); } catch(e) {}
        try { _updateRealModeBanner(); } catch(e) {}
      }
    } else {
      ks.lossStreak = 0;   // reset au moindre trade gagnant
    }
  }

  if(ps) {
    // ── Enregistrer dans l'historique des trades de la paire ──
    // [GO ARGENT · 13/10/2026] urgence : la ligne est écrite (le compte garde sa trace) mais avec le type « urgence » — tous les lecteurs de l'historique
    // qui nourrissent la décision ne lisent que « position » (10e4 refroidissement après perte, 06 pertes consécutives, 10e6 espérance nette, 09e…) :
    // ils voient ce qu'ils voyaient avant, quand l'urgence ne laissait aucune ligne (revue du 13/10, 2e passage). Les compteurs de la paire non plus.
    const amount = pos.amount || (pos.stakeUsdt / Math.max(0.0001, pos.entryPrice)).toFixed(cfg.dec>=4?4:6);
    // [GO NETTOYAGE · 19/10/2026] (n° 55) la part fermée d'une sortie par paliers n'écrit AUCUNE ligne ici : l'historique est coupé à 40 lignes par paire
    // (09b2) et les lecteurs de la décision (10e6 espérance nette, 10e4, 06…) y comptent leurs clôtures — des lignes en plus les privaient des plus anciennes
    // (relecture du 19/10 : 10 clôtures lues au lieu de 20, veto de la porte des frais en RE). Son résultat va sur la ligne de la fermeture finale (« paliers »).
    if (!_part) ps.trades.push({
      side:      pos.side === 'long' ? 'buy' : 'sell',
      type:      _urg ? 'urgence' : 'position',
      amount:    String(amount),
      price:     cur,
      pnl:       realisedPct,
      stakeUsdt: pos.stakeUsdt,
      pnlUsdt:   realisedUsd,
      entryPrice: pos.entryPrice,
      entryTs:   pos.entryTs || pos.openedAt || null,
      entryTime: pos.entryTime || null,
      ts:        Date.now(),
      time:      nowStr(),
      paliers:   Array.isArray(pos._paliers) && pos._paliers.length ? pos._paliers : undefined   // [GO NETTOYAGE · 19/10/2026] (n° 55) parts déjà fermées par paliers (05)
    });
    if(ps.trades.length > 100) ps.trades.splice(0, ps.trades.length - 100);
    if (!_urg) {
      ps.totalPnlPct += realisedPct;
      ps.totalPnlUsd += realisedUsd;
      ps.totalTrades++;
      if(realisedPct > 0) ps.winTrades++;
    }

    // v7.12 MOD 5+ · Track loss streak + fenêtre glissante pour blacklist
    // [MÉMOIRE DE LA BLACKLIST · 22/09/2026] (1) seuls les résultats RÉELS (EV/RE) nourrissent la fenêtre : l'AA (bougies
    // fabriquées, 12 paires en continu) la remplissait de bruit — même règle que « l'école ne note plus » (17/09) ;
    // (2) S._lossStreaks est désormais sauvegardé (09b1/09b2) : chaque relance l'effaçait, et il fallait 10 nouveaux
    // trades avant que la blacklist puisse agir — BTC (27 % de réussite) n'a jamais été mis en pause (backup 21/09).
    if (!_urg && pos.auto === true && S.tradingMode !== 'sim') {
      if (!S._lossStreaks) S._lossStreaks = {};
      const streak = S._lossStreaks[pos.pair] || {
        count: 0, pausedAt: 0,
        recentTrades: [],   // fenêtre glissante des 15 derniers résultats (true=win, false=loss)
        blacklistedUntil: 0 // timestamp fin de blacklist
      };

      // Fenêtre glissante des derniers résultats
      if (!streak.recentTrades) streak.recentTrades = [];
      streak.recentTrades.push(realisedPct > 0);
      if (streak.recentTrades.length > 15) streak.recentTrades.shift();

      // Streak classique
      if (realisedPct <= 0) {
        streak.count = (streak.count || 0) + 1;
        if (streak.count >= 3) {
          streak.pausedAt = Date.now();
          S.chainLog.push({
            icon: '⏸',
            desc: `Pause streak · ${pos.pair} · 3 pertes consécutives · pause 30min`,
            hash: rndHash(), time: nowStr()
          });
          if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
        }
      } else {
        streak.count = 0;
        streak.pausedAt = 0;
      }

      // v7.12 BLACKLIST DYNAMIQUE · si < 30% WR sur 10+ trades récents → blacklist 2h
      if (streak.recentTrades.length >= 10) {
        const wins = streak.recentTrades.filter(w => w).length;
        const wr = wins / streak.recentTrades.length;
        if (wr < 0.30 && streak.blacklistedUntil < Date.now()) {
          streak.blacklistedUntil = Date.now() + 2 * 60 * 60 * 1000;  // 2h
          S.chainLog.push({
            icon: '🚫',
            desc: `BLACKLIST · ${pos.pair} · ${wins}/${streak.recentTrades.length} gains (${Math.round(wr*100)}% WR) · pause 2h`,
            hash: rndHash(), time: nowStr()
          });
          if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
          if (typeof showToast === 'function') {
            showToast('🚫 ' + pos.pair + ' blacklisté (WR ' + Math.round(wr*100) + '%) · 2h', 4000, 'critical');
          }
        }
      }

      S._lossStreaks[pos.pair] = streak;
    }
    // Return original stake to trading account, then apply net P&L
    // 🔒 RÈGLE: on retourne au tradingAccount (jamais vers cashAccount)
    const totalExp  = pos.totalExposure || pos.stakeUsdt;
    // [GO ARGENT · 13/10/2026] le compte reçoit le MÊME résultat que l'historique : realisedUsd (P&L sur l'exposition, perte bornée à la mise —
    // règle « liquidation nette », plus haut). Avant : le compte prenait totalExp × % NON borné — levier ×10, prix −15 % : −45 $ au compte,
    // −30 $ écrits à l'historique (ETAT n° 5). Sans levier ou sans dépassement de la mise, la valeur est identique à l'ancienne.
    const netPnl    = realisedUsd;

    // Rembourser le levier emprunté AVANT de créditer le trading
    // [GO LEVIER · 18/10/2026] (ETAT n° 25) SEULE la part « exposition » (borrowLeverage : l'exposition dépasse la mise) est rendue ici au compteur :
    // son argent n'est jamais entré au trading, la position la rend elle-même (le compte ne reçoit que la mise + le résultat). La part versée en
    // ARGENT (JIT, mise empruntée de 09c : _posLevCash) est rendue SUR le trading plus bas, après les frais. Avant : tout pos.levBorrowed était effacé
    // ici — l'argent emprunté restait au trading. Sans part en argent, ce bloc est celui d'avant.
    const _levCash = _posLevCash(pos), _levExpo = Math.max(0, (Number(pos.levBorrowed) || 0) - _levCash);
    if(_levExpo > 0) {
      repayLeverage(_levExpo);
      // Les frais d'emprunt ont déjà été prélevés cycle par cycle
      // (_autoLevBorrowed ne compte plus la part « exposition » : 02 borrowLeverage)
    }

    // ═══ v7.12 · PROTECTION P2 · Auto-remboursement dette orpheline ═══
    // Si levier = 0 ET dette orpheline > 0 ET trading vient d'être libéré,
    // rembourser automatiquement ce qu'on peut depuis trading.
    if ((S.leverage || 0) === 0 && (S._autoLevBorrowed || 0) > 0) {
      const availableForRepay = (S.tradingAccount || 0) + (pos.stakeUsdt || 0);  // inclut ce qu'on va restituer
      const toRepay = Math.min(S._autoLevBorrowed, availableForRepay);
      if (toRepay > 0) {
        // On va décrémenter trading après la restitution de stake plus bas
        // Ici on réserve le remboursement
        pos._p2RepayPending = toRepay;
      }
    }

    // Restituer la mise propre au tradingAccount (toujours)
    S.tradingAccount = Math.max(0, S.tradingAccount + pos.stakeUsdt);

    // ═══ v7.12 · PRIORITÉ 1 · SPLIT BÉNÉFICES (Option B — net d'impôts/taxes) ═══
    // [GO FISCAL · 07/10/2026] ORDRE RÉEL : le résultat entre au trading, recordFees règle les frais (réserve puis manque)
    // et l'impôt (registre légal 16 : trading ↔ dépôt fiscal), PUIS la caisse reçoit sa part de ce qui reste vraiment.
    // Avant : le gain était crédité amputé d'une ESTIMATION de frais de sortie et d'impôt, puis recordFees débitait encore
    // les frais réels — un trade gagnant payait deux fois sa sortie (et l'impôt l'aurait été deux fois).
    // Si trade perdant : perte absorbée par tradingAccount (comportement normal), l'impôt peut en revenir (même régime).
    S.tradingAccount = Math.max(0, S.tradingAccount + netPnl);
    // ── Frais de sortie uniquement (l'entrée a déjà été facturée à l'ouverture) ──
    // Maker si la position a été ouverte avec forte conviction, sinon taker
    const exitType = (pos.auto && realisedPct > 0.3) ? 'maker' : 'taker';
    // Durée de détention réelle (pour le score fiscal composite — indice de spéculation)
    S._lastTradeHoldMs = (pos.entryTs && Date.now() > pos.entryTs) ? (Date.now() - pos.entryTs) : 0;
    // [GO ARGENT · 13/10/2026] frais et glissement sur l'EXPOSITION (ce que l'exchange achète et revend), plus sur la seule mise : avec levier ×N
    // ils étaient sous-comptés d'un facteur N (ETAT n° 21). Sans levier, exposition = mise : rien ne change.
    if (_part) pos._partiel = true;   // [GO NETTOYAGE · 19/10/2026] (n° 55) recordFees l'écrit au registre des frais sous son nom
    if (_urg) pos._urgence = true;   // lu par recordFees : ni journal des frais lu par la décision, ni cumul de l'estimateur fiscal de la décision
    const _rf = recordFees(pos.pair, totalExp, realisedUsd, exitType, pos._reservedAmount, pos, cur) || {};
    // [GO LEVIER · 18/10/2026] (ETAT n° 25) l'emprunt versé en ARGENT pour cette mise est rendu au prêteur SUR le trading, après les frais (un frais
    // non couvert disparaîtrait, une dette non couverte reste due) et avant le partage caisse / trading (la caisse ne prend que le gain, pas le capital
    // emprunté). Ce que le trading ne couvre pas reste dû : compteurs gardés, dit au journal (le trading, lui, ne passe jamais sous zéro).
    if (_levCash > 0) {
      const _rc = _repayCashDebt(_levCash);
      S.chainLog.push({ icon: '\u21A9', desc: `Levier ${pos.pair} · ${fmt$2(_rc.paid)} empruntés pour la mise rendus au prêteur (pris au trading)${_rc.left > 0.005 ? ' · reste dû ' + fmt$2(_rc.left) : ''}`, hash: rndHash(), time: nowStr() });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
    }
    if (netPnl > 0) {
      const _taxAmount = Number(_rf.taxAmount) || 0;
      const _trulyNet = Math.max(0, netPnl - (Number(_rf.totalFee) || 0) - _taxAmount);

      // Split du net restant
      const _splitPct = (typeof S.profitSplitCaissePct === 'number' ? S.profitSplitCaissePct : 30) / 100;
      const _toCaisse = Math.min(_trulyNet * _splitPct, Math.max(0, S.tradingAccount || 0));
      const _toTrading = _trulyNet - _toCaisse;

      // Appliquer les mouvements (le net est déjà au trading : la part caisse en sort)
      S.cashAccount = (S.cashAccount || 0) + _toCaisse;
      S.tradingAccount = Math.max(0, (S.tradingAccount || 0) - _toCaisse);
      if(!S.cashLog) S.cashLog = [];
      S.cashLog.unshift({ amount:_toCaisse, source:'profit_split', ts:Date.now(), time:nowStr() });
      if(S.cashLog.length > 200) S.cashLog.pop();

      // Log discret dans chainLog
      const _fz = _rf.fisc;
      S.chainLog.push({
        icon: '💰',
        desc: `Bénéfice ${pos.pair} · Net +$${_trulyNet.toFixed(2)} · Caisse +$${_toCaisse.toFixed(2)} (${(_splitPct*100).toFixed(0)}%) · Trading +$${_toTrading.toFixed(2)}${_taxAmount > 0.005 ? ' · Impôt $'+_taxAmount.toFixed(2)+' → dépôt fiscal' : ''}${_fz ? ' · ' + (_fz.regime === 'normal' ? 'régime normal 10 %' : 'régime spéculatif 33 %') : ''}`,
        hash: rndHash(), time: nowStr()
      });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
    } else if ((Number(_rf.taxAmount) || 0) < -0.005) {
      S.chainLog.push({ icon: '🏦', desc: `Perte ${pos.pair} · impôt de l'année rendu au trading +$${(-_rf.taxAmount).toFixed(2)} (même régime, même année)`, hash: rndHash(), time: nowStr() });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
    }

    S.portfolio      = _computePortfolioSans(pos);   // [23/08] canonique · [PORTEFEUILLE JUSTE · 10/10/2026] sans la position qu'on ferme (mise déjà rendue, 02 _computePortfolioSans)

    // ═══ v7.12 · PROTECTION P2 · Appliquer le remboursement dette orpheline ═══
    if (pos._p2RepayPending && pos._p2RepayPending > 0) {
      // [GO LEVIER · 18/10/2026] seulement la dette qu'aucune AUTRE position ouverte ne porte (celle de cette position est déjà réglée plus haut) :
      // avant, _autoLevBorrowed comptait aussi la part « exposition » d'autres positions ouvertes — payée ici sur le trading, puis rendue encore par
      // ces positions à leur fermeture (de l'argent perdu). Possible après une restitution au transfert (index à ×0, positions à levier ouvertes).
      const _freeP2 = Math.max(0, (Number(S.leverageBorrowed) || 0) - (S.openPositions || []).reduce((s2, p2) => s2 + (p2 === pos ? 0 : Math.max(0, Number(p2 && p2.levBorrowed) || 0)), 0));
      const repay = Math.min(pos._p2RepayPending, S.tradingAccount || 0, S._autoLevBorrowed || 0, _freeP2);
      if (repay > 0) {
        S.tradingAccount   = Math.max(0, (S.tradingAccount || 0) - repay);
        S.leverageBorrowed = Math.max(0, (S.leverageBorrowed || 0) - repay);
        S._autoLevBorrowed = Math.max(0, (S._autoLevBorrowed || 0) - repay);
        S.portfolio        = _computePortfolioSans(pos);   // [23/08] canonique · [PORTEFEUILLE JUSTE · 10/10/2026]
        S.chainLog.push({
          icon: '↩',
          desc: `Auto-remboursement dette orpheline · $${repay.toFixed(2)} (reste $${(S._autoLevBorrowed||0).toFixed(2)})`,
          hash: rndHash(), time: nowStr()
        });
        if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
      }
      delete pos._p2RepayPending;
    }
    // [GO LEVIER · 18/10/2026] le suivi de la dette en argent ne dépasse jamais la dette en argent (une position ouverte avant le 18/10 y avait mis sa
    // part « exposition »)
    _levNormAuto(pos);

    syncLeverageReserve();  // recalculer la réserve disponible
    // [MÉNAGE · 23/09/2026] « auto-compound » retiré : il ajoutait 70 % de chaque gain brut à _totalCompounded, que les panneaux
    // Miroir (03) et Jumeau (07) AJOUTAIENT au P&L de session alors que les gains sont déjà dans le portefeuille — double comptage,
    // et le compteur valait −112,37 $ dans le backup 23/09 (aucune écriture ne le rendait négatif : fossile de plusieurs époques).
    // Le champ reste dans les sauvegardes (manifest) mais n'est plus ni écrit ni lu.
    // Track best/worst trade
    const tradeRecord = { pnl: realisedPct, pnlUsd: realisedUsd, price: cur, side: pos.side, time: nowStr() };
    if(!_urg && (!ps.bestTrade  || realisedPct > ps.bestTrade.pnl))   ps.bestTrade  = tradeRecord;
    if(!_urg && (!ps.worstTrade || realisedPct < ps.worstTrade.pnl))  ps.worstTrade = tradeRecord;
    // Update pnlHistory on every significant close
    S.pnlHistory.push(S.portfolio);
    if(S.pnlHistory.length > 80) S.pnlHistory.shift();
    // [GO FISCAL · 07/10/2026] recordFees est appelé plus haut, avant le partage caisse / trading
    S.totalTrades = Object.values(S.pairStates).reduce((s,p)=>s+p.totalTrades,0);
    // v7.12 · PACK RÉSILIENCE · notifier export auto + snapshot silencieux
    try { if (typeof _notifyTradeForExport === 'function') _notifyTradeForExport(); } catch(e) {}
    try { if (typeof _autoSnapshotOnTradeClose === 'function') _autoSnapshotOnTradeClose(); } catch(e) {}
    if (!_urg) recordTradeForHeatmap(realisedUsd, pos.pair); /* v5.3+v24 */
    /* v5.4 + v5.6 · post-close hooks (v6.0 · agent learning) */
    try {
      if(!_urg && typeof recordShadowFromClose === 'function') recordShadowFromClose(realisedUsd, realisedPct, pos.pair, pos.side);
      if(!_urg && typeof generateDreamEntry    === 'function') generateDreamEntry(pos.pair, pos.side, realisedPct, realisedUsd);
      // v19 · #38 Notification trade fermé — [GO ALERTES · 15/10/2026] avec la raison (« 🎯 TP / SL atteint ») et le mode
      try { if(typeof notifTradeClose === 'function') notifTradeClose(pos.pair, pos.side, realisedUsd, realisedPct, _sortie, S.tradingMode); } catch(e) {}
      // [GO ALERTES · 15/10/2026] Telegram « 📊 Chaque trade » (06 tgOnTrade : EV et RE seulement) — avant, rien ne l'appelait
      try { if(typeof tgOnTrade === 'function') tgOnTrade({ pair: pos.pair, side: pos.side, pnlUsd: realisedUsd, pnlPct: realisedPct, mode: S.tradingMode, auto: pos.auto === true, urgence: _urg && !_part, partiel: _part || undefined, sortie: _sortie }); } catch(e) {}
      // v23 · #5 Vérifier alertes après chaque trade
      // [ÉCOLE VIVANTE · 10/10/2026] pas pour l'AA derrière un autre écran : ces alertes et ces badges s'affichent devant l'utilisateur et leurs drapeaux
      // (S.pnlAlerts, une fois par session) sont communs aux modes — l'écran les vérifie lui-même pour le mode affiché (renderHome)
      // [GO LEVIER 56 · 27/10/2026] le P&L des alertes se mesure sur l'argent à Rams (_pnlBasis) : la position qui ferme est encore dans la liste, sa dette déjà
      // remboursée — elle est nommée le temps des alertes pour sortir de la dette comme du portefeuille (sinon : faux gain = sa part « exposition »).
      try { window._pnlSansPos = pos; if(!_behind && typeof checkPnlAlerts === 'function') checkPnlAlerts(); } catch(e) {} finally { window._pnlSansPos = null; }   // [MODES SÉPARÉS · 10/10/2026] tout mode derrière l'écran, plus seulement l'AA
      try { if(!_behind && typeof checkBadges === 'function') checkBadges(); } catch(e) {}
      if(!_urg && typeof closeDecisionCascade  === 'function') closeDecisionCascade(pos.pair, pos.side, pos.currentPrice || pos.entryPrice, realisedUsd, realisedPct);
      if(!_urg && typeof runBotFleet           === 'function') runBotFleet('post_trade', { pnlUsd: realisedUsd, sizerMult: pos._sizerMult });
      // [SPÉCIALISATION · 15/08/2026] les trois juges notent les réponses du jury
      // capturé à l'ouverture — mérite par tâche des disciples (module 12).
      try { if (!_urg && typeof window._judgeDisciples === 'function') window._judgeDisciples(pos, realisedUsd); } catch(e) {}

      // [MASQUE CORRIGÉ · 26/09/2026] « v6.0 · AGENT LEARNING » RETIRÉ — un second juge, caché. Il retrouvait l'agent par le PRÉFIXE de son
      // nom (_openAgents garde name.split(' ')[0] = « Hybrid ») : S.agents.find(name.includes('Hybrid')) = toujours le PREMIER
      // hybride — macro_v1 dans tous les backups du 14 au 21/09 —, crédité ou puni jusqu'à 5 fois par clôture pour les avis des
      // AUTRES : fitness ±5 × mode « accéléré » (masque), erreurs (→ « auto-recalibré »), série perdante (→ poids ÷ 2), souvenirs.
      // Le juge unique est learnFromOutcome (03), juste après : chaque agent sur SON vote de la paire. _openAgents reste affiché.
    } catch(e) { console.warn('post-close hooks:', e); }
    S.winTrades   = Object.values(S.pairStates).reduce((s,p)=>s+p.winTrades,0);
  }

  // [DÉCISION COMMUNE · 27/09/2026] jugés sur ce qu'ils disaient À L'OUVERTURE (10f pos._votes) — avant : sur le vote de la fin, qui avait vu tout le trajet
  if (!_urg) try { window.__voteOverride = (pos._votes && typeof pos._votes === 'object') ? { pair: pos.pair, votes: pos._votes } : null; learnFromOutcome('position', realisedPct, pos.pair); } finally { window.__voteOverride = null; }
  if (!_urg) try { if (typeof _dcJudgeComposite === 'function') _dcJudgeComposite(pos._comp, realisedPct, 1.3); } catch(e) {}
  // [SURVEILLANCE PERMANENTE · 27/09/2026] la position a été ouverte par un bot : il est jugé sur SON résultat réel (en $), comme l'économie du TWAP
  // [MISE AU MÉRITE · 27/09/2026] poids en % (realisedPct), la même unité que ses affirmations (mouvement en %) : sa mise se règle sur UNE mesure
  if (!_urg) try { if (pos._bot && typeof _botJudgeMeasured === 'function') { _botJudgeMeasured(pos._bot, realisedPct, 'trade'); if (S.botFleet && S.botFleet[pos._bot]) S.botFleet[pos._bot].pnlContrib = (S.botFleet[pos._bot].pnlContrib || 0) + (Number(realisedUsd) || 0); } } catch(e) {}
  // [ATTRIBUTION PAR SOURCE · 17/09/2026] A5 : crédite chaque source de données selon ce qu'elle disait à l'OUVERTURE
  // de cette position (10i, lecture seule — aucune décision n'utilise S.attribution).
  if (!_urg) try { if (typeof _attributionRecord === 'function') _attributionRecord(pos, realisedPct); } catch(e) {}

  S.openPositions = S.openPositions.filter(p=>p.id!==id);
  if (!_behind && typeof _updateCloseAllBadge === 'function') _updateCloseAllBadge();   // [MODES SÉPARÉS · 10/10/2026] le badge ⊗ compte les positions du mode AFFICHÉ
  const pnlStr  = (realisedPct>=0?'+':'')+realisedPct.toFixed(2)+'%';
  const usdtStr = (realisedUsd>=0?'+':'−')+'$'+Math.abs(realisedUsd).toFixed(1);
  if(S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
  S.chainLog.push({
    icon: realisedPct>=0?'✅':'❌',
    desc: `${_part ? 'Sortie partielle' : 'Fermé'} ${pos.pair} ${pos.side.toUpperCase()} | ${pnlStr} (${usdtStr} USDT)`,   // [GO NETTOYAGE · 19/10/2026] (n° 55)
    hash: rndHash(), time: nowStr()
  });
  const levTag = pos.levBorrowed > 0 ? ` ⚡$${pos.levBorrowed}` : '';
  showToast((_part ? 'Sortie partielle ' : 'Fermé ')+pos.pair+levTag+' · '+pnlStr+' · '+usdtStr);   // [GO NETTOYAGE · 19/10/2026] (n° 55)

  // ═══ v5.1 — Milestones & Particles ═══
  // [ÉCOLE VIVANTE · 10/10/2026] rien de tout cela pour une fermeture de l'AA derrière un autre écran : un jalon « VICTOIRE » ou « Perte » en plein écran EV
  // pour un trade d'école serait faux. Le toast « Fermé … » ci-dessus et la ligne du journal restent, comme avant.
  if (_behind) { /* un mode derrière l'écran : ni jalon ni particules ([MODES SÉPARÉS · 10/10/2026] l'EV derrière l'AA comme l'AA derrière l'EV) */ }
  else if(realisedPct >= 5.0) {
    // Big win: 🎉 celebration
    emitVictoryParticles(55);
    showMilestone('🎉', 'VICTOIRE · '+pos.pair+' +'+realisedPct.toFixed(1)+'% · '+usdtStr);
  } else if(realisedPct >= 2.0) {
    // Decent win: subtle particles
    emitVictoryParticles(22);
    showMilestone('💰', 'Gain '+pos.pair+' · '+pnlStr+' · '+usdtStr, false, 2400);
  } else if(realisedPct <= -5.0) {
    // Big loss: warning milestone
    emitLossParticles(15);
    showMilestone('⚠️', 'Perte '+pos.pair+' '+pnlStr+' · '+usdtStr, true, 3000);
  }
  // [MODES SÉPARÉS · 10/10/2026] les rendus immédiats lisent S.openPositions et S.pairStates : pendant une bascule de contexte ce sont ceux du mode derrière
  // l'écran — ils peignaient un instant SES positions sur l'écran d'un autre. Le battement repeint l'écran du mode affiché (2 s au plus).
  if (!_behind) {
    updatePairBtnStates();
    renderPositions();
    if(S.currentPage===4) renderChain();
  }
}
