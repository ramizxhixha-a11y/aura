// [REGLES REEL v2 · edictees par Rams 05/07/2026] en MANU jamais d ouverture ; en AUTO ouverture RE permise UNIQUEMENT si RE est en play (consentement) — remplace le blocage total du 02/07
// [SEPARATION COMPLETE 3 MODES · 02/07/2026] GARDE MODE REEL : aucune ouverture automatique en 'real' (analyse/suggestions continuent, trades manuels libres) + gate bunker lu par mode
// ════════════════════════════════════════════════════════════════════════
// ▓▓▓ AURA8 — 09c-auto-open.js ▓▓▓
// ════════════════════════════════════════════════════════════════════════
// autoOpenPosition — ouverture d'une position en mode bot.
// Fonction monolithique unique (~560 lignes). Découpage non possible
// sans casser la logique : un seul flux décisionnel cohérent.
//
// Dépend de 09a-runtime-state.js (accès via window.RT).
// ════════════════════════════════════════════════════════════════════════


// ════════════════════════════════════════════════════════════════════════
// SECTION autoOpenPosition — ouverture position en mode bot
// ════════════════════════════════════════════════════════════════════════

function autoOpenPosition(pair, side, stakeOverride) {

  // ★ REGLES REEL v2 (edictees par Rams le 05/07) · en MANU : le bot ne peut
  // JAMAIS ouvrir (il suggere, pre-remplit, surveille, et peut STOPPER — les
  // fermetures de protection sont gerees dans closePosition). En AUTO :
  // ouverture permise UNIQUEMENT si RE est en play (le play = ton consentement
  // explicite). Le filtre "bases solides apprises" (conviction pleine +
  // expectancy AA/EV positive de la paire) est applique par le decideur (10)
  // avant meme d'arriver ici.
  if (S.tradingMode === 'real') {
    if (S.botAutoMode === false) return;                     // MANU : jamais d'ouverture
    var _reRun = false;
    try { _reRun = window._isModeRunning ? !!window._isModeRunning('real') : false; } catch(e) {}
    if (!_reRun) return;                                     // RE pas en play : pas de consentement
  }

  // Gate global : le bot n'agit que si AUTO est activé
  if (S.botAutoMode === false) return;

  // Sauvegarde de sécurité avant action bot
  try {
    if (typeof _p5PreActionSave === 'function') _p5PreActionSave('open_bot');
  } catch (e) {}

  // Gate réseau : pas d'ouverture pendant une coupure Internet
  if (S._netPaused === true) {
    if (Math.random() < 0.05) {
      S.chainLog.push({
        icon: '🔴',
        desc: `Ouverture bloquée · connexion coupée · ${pair} ${side.toUpperCase()}`,
        hash: rndHash(), time: nowStr()
      });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
    }
    return;
  }

  // Gate Bunker : si le mode Bunker est actif et configuré pour pauser le bot,
  // on s'abstient d'ouvrir (protection d'urgence). Ne touche pas botAutoMode.
  if (S.bunker && S.bunker.active === true && S.bunker.pausedByBunker === true) {
    if (Math.random() < 0.05) {
      S.chainLog.push({
        icon: '🚨',
        desc: `Ouverture bloquée · Bunker actif · ${pair} ${side.toUpperCase()}`,
        hash: rndHash(), time: nowStr()
      });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
    }
    return;
  }

  // Gate Anti-Revenge : après une grosse perte ou une série de pertes, le système
  // anti-revenge impose un cooldown (évite le "revenge trading" qui ruine les comptes).
  // Tant que le blocage est actif, le bot s'abstient d'ouvrir. Ne touche pas botAutoMode.
  if (typeof isRevengeBlocked === 'function' && isRevengeBlocked()) {
    if (Math.random() < 0.05) {
      S.chainLog.push({
        icon: '🧘',
        desc: `Ouverture bloquée · Anti-revenge (cooldown après pertes) · ${pair} ${side.toUpperCase()}`,
        hash: rndHash(), time: nowStr()
      });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
    }
    return;
  }

  // ──────────────────────────────────────────────────────────────
  // Veille Marché — ajustement et blocage selon sentiment global
  // ──────────────────────────────────────────────────────────────
  if (S.veilleData && typeof S.veilleData.sentimentScore === 'number') {
    const sentTs    = S.veilleData.sentimentTs || 0;
    const sentFresh = (Date.now() - sentTs) < 30 * 60 * 1000;

    if (sentFresh) {
      const sent = S.veilleData.sentimentScore;

      // Blocage sur sentiment extrême contraire au trade
      if (sent <= -60 && side === 'long') {
        S.chainLog.push({
          icon: '📡',
          desc: `Veille Marché : LONG bloqué sur ${pair} · Sentiment ${sent} (< -60) — conditions défavorables`,
          hash: rndHash(), time: nowStr()
        });
        if (S.chainLog.length > 100) S.chainLog.splice(0, 50);
        return;
      }
      if (sent >= 60 && side === 'short') {
        S.chainLog.push({
          icon: '📡',
          desc: `Veille Marché : SHORT bloqué sur ${pair} · Sentiment ${sent} (> +60) — marché haussier`,
          hash: rndHash(), time: nowStr()
        });
        if (S.chainLog.length > 100) S.chainLog.splice(0, 50);
        return;
      }

      // Ajustement de la mise selon le sentiment (±30%)
      if (!stakeOverride && S.pairStates[pair]) {
        const ps = S.pairStates[pair];
        const baseMise = ps.stake || 10;
        let mult = 1.0;
        if      (sent >= 50)  mult = 1.3;
        else if (sent >= 20)  mult = 1.1;
        else if (sent <= -50) mult = 0.6;
        else if (sent <= -20) mult = 0.8;

        if (mult !== 1.0) {
          stakeOverride = Math.max(10, Math.round(baseMise * mult / 10) * 10);
          if (Math.random() < 0.2) {
            S.chainLog.push({
              icon: '📡',
              desc: `Veille: mise ${pair} ajustée ×${mult} (sentiment ${sent}) → $${stakeOverride}`,
              hash: rndHash(), time: nowStr()
            });
          }
        }
      }
    }
  }

  // Gates paire : pause auto / contrôle manuel / position déjà ouverte
  if (typeof _isPairPaused === 'function' && _isPairPaused(pair)) return;
  if (typeof _isPairManual === 'function' && _isPairManual(pair)) return;

  const already = S.openPositions.find(p => p.pair === pair);
  if (already) return;

  // Pas de plafond global : 1 trade max par paire (garanti par le garde 'already'
  // ci-dessus). Le nombre de trades simultanés = nombre de paires favorables.
  // Vision XIII : pas de capital qui dort, autant de paires que favorables, ≤1/paire.

  // Filtre série de pertes : 3 pertes consécutives → pause 30 min
  if (!S._lossStreaks) S._lossStreaks = {};
  const streak = S._lossStreaks[pair];

  // Blacklist dynamique : WR insuffisant
  if (streak && streak.blacklistedUntil && streak.blacklistedUntil > Date.now()) {
    const remainMin = Math.ceil((streak.blacklistedUntil - Date.now()) / 60000);
    if (Math.random() < 0.1) {
      S.chainLog.push({
        icon: '🚫',
        desc: `BLACKLIST · ${pair} ${side.toUpperCase()} bloqué · WR insuffisant · reprise dans ~${remainMin}min`,
        hash: rndHash(), time: nowStr()
      });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
    }
    return;
  }

  if (streak && streak.count >= 3 && (Date.now() - streak.pausedAt) < 30 * 60 * 1000) {
    const remainMin = Math.ceil((30 * 60 * 1000 - (Date.now() - streak.pausedAt)) / 60000);
    if (Math.random() < 0.15) {
      S.chainLog.push({
        icon: '⏸',
        desc: `Pause streak · ${pair} ${side.toUpperCase()} bloqué · 3 pertes consécutives · reprise dans ~${remainMin}min`,
        hash: rndHash(), time: nowStr()
      });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
    }
    return;
  }

  const ps  = S.pairStates[pair];
  const cfg = PAIRS[pair];
  if (!ps || !cfg) return;

  // Signaux techniques et fondamentaux — pré-calculés pour les vétos et le brain gate
  const tech = typeof getTechSignals === 'function' ? getTechSignals(pair) : null;
  const fund = typeof getFundamentalSignals === 'function' ? getFundamentalSignals(pair) : null;

  // ──────────────────────────────────────────────────────────────
  // Veto RSI anti-suicide : éviter les trades à contre-courant des
  // extrêmes (rebond probable en sur-vente, correction en sur-achat)
  // ──────────────────────────────────────────────────────────────
  try {
    const closes = (ps.candles || []).map(c => c.c).filter(v => typeof v === 'number');
    if (closes.length >= 15) {
      const cl = closes.slice(-20);
      let g = 0, l = 0;
      for (let i = 1; i <= 14; i++) { const d = cl[i] - cl[i-1]; d > 0 ? g += d : l -= d; }
      let ag = g / 14, al = l / 14;
      for (let i = 15; i < cl.length; i++) {
        const d = cl[i] - cl[i-1];
        ag = (ag * 13 + (d > 0 ? d : 0)) / 14;
        al = (al * 13 + (d < 0 ? -d : 0)) / 14;
      }
      const rsi = al ? 100 - (100 / (1 + ag / al)) : 100;

      if (side === 'short' && rsi < 25) {
        S.chainLog.push({
          icon: '⊗',
          desc: `Veto RSI · ${pair} SHORT bloqué · RSI ${rsi.toFixed(0)} (survendu — rebond probable)`,
          hash: rndHash(), time: nowStr()
        });
        if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
        return;
      }
      if (side === 'long' && rsi > 75) {
        S.chainLog.push({
          icon: '⊗',
          desc: `Veto RSI · ${pair} LONG bloqué · RSI ${rsi.toFixed(0)} (suracheté — correction probable)`,
          hash: rndHash(), time: nowStr()
        });
        if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
        return;
      }
    }
  } catch (e) {}

  // ──────────────────────────────────────────────────────────────
  // Veto cohérence régime / side : bloque les trades contraires au
  // régime global sauf signal RSI fort confirmant le retournement
  // ──────────────────────────────────────────────────────────────
  try {
    const regime = typeof detectMarketRegime === 'function' ? detectMarketRegime() : 'calm';

    // Vétos uniquement sur régimes purs (volatile_* et calm autorisent tout)
    if (regime === 'bear' || regime === 'bull') {
      const closesC = (ps.candles || []).map(c => c.c).filter(v => typeof v === 'number');
      let rsiC = 50;
      if (closesC.length >= 15) {
        const clC = closesC.slice(-20);
        let gC = 0, lC = 0;
        for (let i = 1; i <= 14; i++) { const d = clC[i] - clC[i-1]; d > 0 ? gC += d : lC -= d; }
        let agC = gC / 14, alC = lC / 14;
        for (let i = 15; i < clC.length; i++) {
          const d = clC[i] - clC[i-1];
          agC = (agC * 13 + (d > 0 ? d : 0)) / 14;
          alC = (alC * 13 + (d < 0 ? -d : 0)) / 14;
        }
        rsiC = alC ? 100 - (100 / (1 + agC / alC)) : 100;
      }

      // BEAR + LONG : requiert un signal fort de sur-vente (RSI < 35)
      if (regime === 'bear' && side === 'long' && rsiC >= 35) {
        S.chainLog.push({
          icon: '⊗',
          desc: `Veto régime · ${pair} LONG bloqué · marché BEAR + RSI ${rsiC.toFixed(0)} (pas de signal rebond)`,
          hash: rndHash(), time: nowStr()
        });
        if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
        return;
      }
      // BULL + SHORT : requiert un signal fort de sur-achat (RSI > 65)
      if (regime === 'bull' && side === 'short' && rsiC <= 65) {
        S.chainLog.push({
          icon: '⊗',
          desc: `Veto régime · ${pair} SHORT bloqué · marché BULL + RSI ${rsiC.toFixed(0)} (pas de signal correction)`,
          hash: rndHash(), time: nowStr()
        });
        if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
        return;
      }
    }
  } catch (e) {}

  // ──────────────────────────────────────────────────────────────
  // Veto volume anormalement bas : évite les marchés morts où les
  // signaux sont faussés par le manque de liquidité
  // ──────────────────────────────────────────────────────────────
  try {
    const vols = (ps.candles || []).slice(-20).map(c => c.v).filter(v => typeof v === 'number' && v > 0);
    if (vols.length >= 10) {
      const avgVol    = vols.reduce((a, b) => a + b, 0) / vols.length;
      const recentVol = vols.slice(-3).reduce((a, b) => a + b, 0) / 3;
      if (recentVol < avgVol * 0.40) {
        S.chainLog.push({
          icon: '⊗',
          desc: `Veto volume · ${pair} ${side.toUpperCase()} bloqué · volume ${Math.round(recentVol/avgVol*100)}% de la moyenne (<40%)`,
          hash: rndHash(), time: nowStr()
        });
        if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
        return;
      }
    }
  } catch (e) {}

  // ──────────────────────────────────────────────────────────────
  // Veto volatilité excessive : évite les pics de volatilité pièges
  // (news, flash crashes) où l'ATR récent dépasse 2.5× la moyenne
  // ──────────────────────────────────────────────────────────────
  try {
    const candles = (ps.candles || []).slice(-20);
    if (candles.length >= 15) {
      const atrs = candles.map(c => (c.h && c.l) ? (c.h - c.l) : 0).filter(v => v > 0);
      if (atrs.length >= 10) {
        const avgATR  = atrs.reduce((a, b) => a + b, 0) / atrs.length;
        const currATR = atrs.slice(-3).reduce((a, b) => a + b, 0) / 3;
        if (currATR > avgATR * 2.5) {
          S.chainLog.push({
            icon: '⊗',
            desc: `Veto volatilité · ${pair} ${side.toUpperCase()} bloqué · ATR ${(currATR/avgATR).toFixed(1)}× moyenne (pic anormal)`,
            hash: rndHash(), time: nowStr()
          });
          if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
          return;
        }
      }
    }
  } catch (e) {}

  // Règle métier absolue : le bot utilise SEULEMENT tradingAccount — jamais cashAccount
  let baseStake = stakeOverride != null
    ? Math.max(10, Math.round(stakeOverride * 10) / 10)
    : Math.max(10, ps.stake || 10);

  // ──────────────────────────────────────────────────────────────
  // Brain Gate — analyse du roster d'agents qui filtre le trade
  // ──────────────────────────────────────────────────────────────
  let _brainVeto = false, _brainReason = '', _brainMult = 1.0, _brainSideFlip = false;

  if (typeof runRosterAnalysis === 'function') {
    try {
      const roster = runRosterAnalysis(pair);
      S._lastBrainAnalysis = roster;

      // 1. HARD VETO — n'importe quel guardian peut bloquer le trade
      if (roster.anyVeto) {
        const vetoers = Object.entries(roster.guardianResults)
          .filter(([, g]) => g.status === 'veto')
          .map(([id, g]) => {
            const a = (S.agents || []).find(x => x.id === id);
            return (a?.emoji || '') + ' ' + (a?.name || id) + ' : ' + g.reasoning;
          });
        _brainVeto   = true;
        _brainReason = vetoers.join(' · ');
        if (!S.brainLog) S.brainLog = [];
        S.brainLog.unshift({ ts: Date.now(), pair, event: 'VETO', side, reason: _brainReason });
        if (S.brainLog.length > 30) S.brainLog.length = 30;
      }

      // 2. SIDE FLIP — coalition oppose avec forte conviction → inverse le side
      if (!_brainVeto && roster.coalition) {
        const rosterSide = roster.verdict === 'LONG' ? 'long'
                         : roster.verdict === 'SHORT' ? 'short'
                         : null;
        if (rosterSide && rosterSide !== side && roster.consensus >= 0.6) {
          _brainSideFlip = true;
          side = rosterSide;
          _brainReason = `Coalition ${roster.verdict} renversé · consensus ${(roster.consensus * 100).toFixed(0)}%`;
          if (!S.brainLog) S.brainLog = [];
          S.brainLog.unshift({ ts: Date.now(), pair, event: 'FLIP', side, reason: _brainReason });
          if (S.brainLog.length > 30) S.brainLog.length = 30;
        }
      }

      // 3. Modulation du stake selon le consensus
      if (!_brainVeto) {
        if (roster.coalition && roster.consensus >= 0.7)      _brainMult = 1.25;
        else if (roster.coalition)                             _brainMult = 1.10;
        else if (roster.consensus < 0.30)                      _brainMult = 0.70;
        // Pas de réduction sur HOLD majority — LMSR peut encore donner un signal valable

        if (_brainMult !== 1.0) {
          baseStake = Math.max(10, Math.round(baseStake * _brainMult * 10) / 10);
        }
      }

      // 4. SKIP si tout le conseil vote HOLD ET LMSR neutre ET pas de conviction externe forte
      const externalConvStrong = (tech?.atScore && Math.abs(tech.atScore) >= 0.35);
      if (!_brainVeto && roster.votes.hold === roster.votes.total && !externalConvStrong) {
        const lmsrNeutral = Math.abs(lmsrP(ps) - 0.5) < 0.08;
        if (lmsrNeutral) {
          _brainVeto   = true;
          _brainReason = 'Conseil HOLD + LMSR neutre · pas de signal';
          if (!S.brainLog) S.brainLog = [];
          S.brainLog.unshift({ ts: Date.now(), pair, event: 'SKIP', side, reason: _brainReason });
          if (S.brainLog.length > 30) S.brainLog.length = 30;
        }
      }
    } catch (e) {
      console.warn('brain gate error:', e);
    }
  }

  // Veto déclenché → on abandonne
  if (_brainVeto) {
    if (typeof showToast === 'function') {
      showToast('🧠 Brain Gate · ' + (_brainReason.length > 60 ? _brainReason.slice(0, 57) + '…' : _brainReason));
    }
    return;
  }

  // Smart Sizer applique le multiplicateur Kelly AVANT les checks d'exposition
  if (typeof runBotFleet === 'function') {
    try {
      const fleetResult = runBotFleet('pre_trade', { stake: baseStake });
      if (fleetResult?.sizer?.mult && Math.abs(fleetResult.sizer.mult - 1) > 0.01) {
        const adjusted = baseStake * fleetResult.sizer.mult;
        baseStake = Math.max(10, Math.round(adjusted * 10) / 10);
      }
    } catch (e) {}
  }

  // Fallback levier si compte trading vide
  let _useLeverageForStake = false;
  if (S.tradingAccount < 20) {
    const levAvail = S.leverageReserve || 0;
    if (levAvail >= 20) {
      baseStake = Math.max(10, Math.min(50, Math.floor(levAvail * 0.10 / 10) * 10));
      _useLeverageForStake = true;
    } else {
      showToast('⚠ Compte trading et levier insuffisants · bot suspendu', 2800, 'critical');
      return;
    }
  } else {
    if (baseStake > S.tradingAccount * 0.95) {
      baseStake = Math.max(10, Math.floor(S.tradingAccount * 0.25 / 10) * 10);
    }
  }

  // Levier bonus : emprunté de leverageReserve si conviction élevée
  const bonusAvailable = ps._leverageBonus || 0;
  const levBorrowed    = bonusAvailable > 0 ? borrowLeverage(bonusAvailable, pair) : 0;

  // ──────────────────────────────────────────────────────────────
  // Validation capital global avec anticipation levier
  // ──────────────────────────────────────────────────────────────
  const _convForValidate = (typeof effectiveConviction === 'number' ? effectiveConviction : null)
                           ?? (typeof lmsrP === 'function' && ps ? lmsrP(ps) : 0.5);
  let capCheck = validateTotalExposure(baseStake, levBorrowed, _convForValidate);

  if (!capCheck.ok) {
    // En mode auto, avant de suspendre, tenter de monter l'index levier
    if (S.botAutoMode === true && (S.leverage || 0) < (S.leverageMaxMult || 10)) {
      const prevIdx    = S.leverage || 0;
      const tryIndexes = [prevIdx + 1, prevIdx + 2, prevIdx + 3].filter(i => i <= (S.leverageMaxMult || 10));

      for (const newIdx of tryIndexes) {
        try {
          if (typeof setLeverageByBot === 'function') {
            setLeverageByBot(newIdx, `anticipation capital pour ${pair}`);
          }
          capCheck = validateTotalExposure(baseStake, levBorrowed);
          if (capCheck.ok) {
            S.chainLog.push({
              icon: '🤖⚡',
              desc: `Bot anticipation: levier ${prevIdx}→${newIdx} pour ouvrir ${pair}`,
              hash: rndHash(), time: nowStr()
            });
            break;
          }
        } catch (e) {
          console.warn('bot leverage anticipation:', e);
        }
      }
    }

    if (!capCheck.ok) {
      const scaleFactor = capCheck.available / Math.max(1, baseStake + levBorrowed);
      if (scaleFactor < 0.15) {
        showToast('⚠ Capital max atteint · bot ' + pair + ' suspendu', 2800, 'critical');
        if (levBorrowed > 0) repayLeverage(levBorrowed);
        return;
      }
      baseStake = Math.max(10, Math.floor(baseStake * scaleFactor / 10) * 10);
    }
  }

  // ──────────────────────────────────────────────────────────────
  // VALIDATION ANTI-NÉGATIF (au pire stop-loss) — décidé avec l'utilisateur
  // Le levier sert à saisir une opportunité, jamais à tomber en négatif.
  // On simule le pire cas (perte au SL max + frais + intérêts + taxe). Si le
  // compte y passerait sous 0, on RÉDUIT la mise jusqu'à ce que ça tienne ;
  // si même la mise minimale (10) ne tient pas, on S'ABSTIENT.
  // Placé AVANT le calcul de stakeUsdt/amount pour qu'ils utilisent la mise finale.
  // ──────────────────────────────────────────────────────────────
  if (typeof validateAntiNegative === 'function') {
    const _anticBorrowFor = (stk) => {
      let b = (levBorrowed || 0);
      if ((S.leverage || 0) >= 1 && stk > (S.tradingAccount || 0)) {
        b += (stk - (S.tradingAccount || 0));
      } else if (_useLeverageForStake) {
        b += stk;
      }
      return b;
    };
    let _check = validateAntiNegative(baseStake, _anticBorrowFor(baseStake), ps);
    // Réduction par paliers de 10 jusqu'à ce que le pire cas tienne
    let _guard = 0;
    while (!_check.ok && baseStake > 10 && _guard < 50) {
      baseStake = Math.max(10, baseStake - 10);
      _check = validateAntiNegative(baseStake, _anticBorrowFor(baseStake), ps);
      _guard++;
    }
    // Si même la mise minimale ne tient pas → abstention totale
    if (!_check.ok) {
      if (Math.random() < 0.1) {
        S.chainLog.push({
          icon: '🛡️',
          desc: `Anti-négatif · ${pair} ${side.toUpperCase()} abstenu · pire cas dépasse le compte (perte $${_check.worstLoss.toFixed(2)} + coûts $${_check.costs.toFixed(2)})`,
          hash: rndHash(), time: nowStr()
        });
        if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
      }
      if (levBorrowed > 0) { try { repayLeverage(levBorrowed); } catch(e){} }
      return;
    }
  }

  const stakeUsdt = baseStake + levBorrowed;
  const amount    = (stakeUsdt / Math.max(0.0001, ps.price)).toFixed(cfg.dec >= 4 ? 4 : 6);
  const id        = 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

  // ──────────────────────────────────────────────────────────────
  // Déduction des comptes : trading OU levier emprunté
  // ──────────────────────────────────────────────────────────────
  let _jitBorrowed = 0;

  if (_useLeverageForStake) {
    // Garde-fou : pas d'emprunt si levier ×0
    if ((S.leverage || 0) === 0) return;

    S.leverageBorrowed = (S.leverageBorrowed || 0) + baseStake;
    S._autoLevBorrowed = (S._autoLevBorrowed || 0) + baseStake;
    S.leverageReserve  = Math.max(0, (S.leverageReserve || 0) - baseStake);
    _jitBorrowed       = baseStake;
  } else {
    // Emprunt JIT si le bot a besoin de plus que ce qui est dispo en trading
    try {
      if ((S.leverage || 0) >= 1 && baseStake > (S.tradingAccount || 0)) {
        const res = ensureLeverageCoverForTrade(baseStake, pair);
        if (res && res.ok && res.borrowed > 0) {
          _jitBorrowed = res.borrowed;
        }
      }
    } catch (e) {
      console.warn('bot auto-leverage:', e);
    }
    S.tradingAccount = Math.max(0, S.tradingAccount - baseStake);
  }

  // ──────────────────────────────────────────────────────────────
  // RÉSERVE ANTI-NÉGATIF — coût garanti d'aller-retour mis de côté
  // (frais entrée+sortie+slippage+intérêts levier estimés). La taxe n'est
  // PAS réservée ici (gain inconnu) ; elle est provisionnée à la clôture.
  // ──────────────────────────────────────────────────────────────
  let _reservedAmount = 0;
  try {
    if (typeof estimateTradeReserve === 'function' && typeof holdTradeReserve === 'function') {
      const _est = estimateTradeReserve(stakeUsdt, (levBorrowed || 0) + _jitBorrowed);
      _reservedAmount = holdTradeReserve(_est.total, pair);
    }
  } catch (e) { console.warn('antiNeg reserve:', e); }

  S.portfolio = S.cashAccount + S.tradingAccount;

  // Consommer le pending de borrow pour qu'il ne reste pas en suspens
  if (S._pendingPositionBorrow) {
    _jitBorrowed = Math.max(_jitBorrowed, S._pendingPositionBorrow);
    S._pendingPositionBorrow = 0;
  }

  // ──────────────────────────────────────────────────────────────
  // Création de la position
  // ──────────────────────────────────────────────────────────────
  S.openPositions.push({
    id, pair, side,
    entryPrice:    ps.price,
    openedAt:      Date.now(),
    amount:        parseFloat(amount),
    stakeUsdt:     baseStake,                       // mise propre (sans levier)
    levBorrowed:   (levBorrowed || 0) + _jitBorrowed,
    totalExposure: stakeUsdt,                       // exposition totale (stake + levier)
    entryTime:     nowStr(),
    entryTs:       Date.now(),
    pnl:           0,
    pnlUsdt:       0,
    currentVal:    stakeUsdt,
    auto:          true,
    tp:            null,
    sl:            null,
    _paperRealMode: (S.tradingMode === 'paperReal'),
    _holdCycles:   0,
    _reservedAmount: _reservedAmount,               // réserve anti-négatif mise de côté à l'ouverture
    conviction:    (typeof effectiveConviction !== 'undefined' ? effectiveConviction : lmsrP(ps)) || 0,
    _peakPnl:      0,

    // Capture du contexte pour la mémoire (mode paperReal uniquement)
    _contextId: (function() {
      if (S.tradingMode !== 'paperReal') return null;
      try {
        const ctx = _captureTradeContext(pair, side, baseStake);
        if (ctx) {
          _addTradeContextToMemory(ctx);
          return ctx.contextId;
        }
      } catch (e) {}
      return null;
    })(),

    // A/B testing : assigner une variante
    _abArm: (function() {
      if (S.tradingMode !== 'paperReal') return null;
      try {
        return _abAssignArm();
      } catch (e) {}
      return null;
    })(),

    _openReason:
      `${_brainSideFlip ? '🔄 FLIP · ' : ''}${_brainMult !== 1.0 ? '×' + _brainMult.toFixed(2) + ' · ' : ''}` +
      `LMSR ${(lmsrP(ps) * 100).toFixed(0)}% · ${side === 'long' ? '↑ LONG' : '↓ SHORT'}` +
      `${(S._lastBrainAnalysis?.coalition) ? ' · 🤝 Coalition' : ''}`,

    _openAgents:
      [...S.agents]
        .filter(a => !a.isBot && !a.isMeta && Math.abs(a.score || 0) > 0.1)
        .sort((a, b) => Math.abs(b.score || 0) * b.fitness - Math.abs(a.score || 0) * a.fitness)
        .slice(0, 5)
        .map(a => ({
          emoji: a.emoji,
          name:  a.name.split(' ')[0].split('·')[0].trim(),
          score: a.score || 0
        }))
  });

  // Enregistrement de la cascade de décision (utilise baseStake, la mise réelle)
  if (typeof recordDecisionCascade === 'function') {
    recordDecisionCascade(pair, side, baseStake, 'auto');
  }

  // Trace dans l'historique de la paire
  ps.trades.push({
    side:          side === 'long' ? 'buy' : 'sell',
    type:          'open',
    amount:        String(amount),
    price:         ps.price,
    pnl:           0,
    stakeUsdt:     baseStake,
    levBorrowed,
    totalExposure: stakeUsdt,
    pnlUsdt:       null,
    fee:           null,
    ts:            Date.now(),
    time:          nowStr()
  });
  if (ps.trades.length > 100) ps.trades.splice(0, ps.trades.length - 100);

  updatePairBtnStates();
  // Rafraîchir le badge "tout fermer" : sans ça, le compteur restait figé pendant
  // que le bot ouvrait des positions (S.openPositions grossit mais l'UI affiche l'ancien).
  if (typeof _updateCloseAllBadge === 'function') _updateCloseAllBadge();
}
window.autoOpenPosition = autoOpenPosition;
