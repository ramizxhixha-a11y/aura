// [OPTION A · 31/07/2026] garde d ouverture 'Bunker actif -> return' supprimee : le bunker ne bloque plus les ouvertures (il reduit les mises via 07). Debloque EV coince en bunker paused depuis le 26/07.
// [PLANCHER PROPORTIONNEL 26/07/2026] les 9 planchers 10$ et 4 arrondis par paliers de 10 supprimes d un bloc (le correctif partiel du 06/07 en laissait 7 : inoperant par construction) — plancher = 5 % du compte, min 2$, arrondi au dixieme ; gate <20$ et clamp 25 % alignes sur la politique de capital · [REGLES REEL v2 · edictees par Rams 05/07/2026] en MANU jamais d ouverture ; en AUTO ouverture RE permise UNIQUEMENT si RE est en play (consentement) — remplace le blocage total du 02/07

// ═══ PLANCHER DE MISE PROPORTIONNEL (26/07/2026) ═══
// Tout ce fichier etait bati sur "mise minimale 10 $, paliers de 10 $" —
// heritage des comptes fictifs a 1000 $. Sur un compte de 35 $, chaque trade
// engageait 29 % du capital, et le calcul proportionnel du decideur (10) etait
// systematiquement ecrase a la remontee. 9 planchers + 4 arrondis corriges ici
// EN UNE FOIS (le correctif partiel du 06/07 etait inoperant par construction).
// Plancher = 5 % du compte, minimum absolu 2 $ (au-dessus des frais).
function _stakeFloor() {
  try { return Math.max(2, (S.tradingAccount || 0) * 0.05); } catch(e) { return 2; }
}
// arrondi au DIXIEME (les paliers de 10 $ n'ont plus de sens a cette echelle)
function _stakeRound(x) { return Math.round((Number(x) || 0) * 10) / 10; }
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
    try { _reRun = window._isModeRunning ? !!window._isModeRunning('real') : false; } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} }
    if (!_reRun) return;                                     // RE pas en play : pas de consentement
  }

  // Gate global : le bot n'agit que si AUTO est activé
  if (S.botAutoMode === false) return;

  // Sauvegarde de sécurité avant action bot
  try {
    if (typeof _p5PreActionSave === 'function') _p5PreActionSave('open_bot');
  } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} }

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
          stakeOverride = Math.max(_stakeFloor(), _stakeRound(baseMise * mult));
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
  } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} }

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
  } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} }

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
  } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} }

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
  } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} }

  // Règle métier absolue : le bot utilise SEULEMENT tradingAccount — jamais cashAccount
  // la mise venue du decideur (10) est deja proportionnee : on la respecte.
  // ps.stake === 10 = defaut d'epoque pose sur toutes les paires, pas un choix.
  let baseStake = stakeOverride != null
    ? Math.max(_stakeFloor(), _stakeRound(stakeOverride))
    : ((ps.stake && ps.stake > 0 && ps.stake !== 10) ? ps.stake : _stakeFloor());

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
      // [PLEIN RÉGIME · 08/08/2026] effet réel du flag S.fullPowerMode (BUG-002 : l'ancien
      // mode falsifiait les données ; celui-ci module les paramètres, jamais les données).
      // FP relève les BONUS (1.25→1.5, 1.10→1.25) ; le malus prudence 0.70 reste INTACT.
      const _fp = (S.fullPowerMode === true);
      if (!_brainVeto) {
        if (roster.coalition && roster.consensus >= 0.7)      _brainMult = _fp ? 1.5 : 1.25;
        else if (roster.coalition)                             _brainMult = _fp ? 1.25 : 1.10;
        else if (roster.consensus < 0.30)                      _brainMult = 0.70;
        // Pas de réduction sur HOLD majority — LMSR peut encore donner un signal valable

        if (_brainMult !== 1.0) {
          baseStake = Math.max(_stakeFloor(), _stakeRound(baseStake * _brainMult));
        }
      }

      // 4. SKIP si tout le conseil vote HOLD ET LMSR neutre ET pas de conviction externe forte
      // [PLEIN RÉGIME · 08/08/2026] FP resserre la bande « neutre » (0.08→0.05) et abaisse le
      // seuil de conviction externe (0.35→0.25) : plus de signaux faibles-mais-présents passent.
      // Toute ouverture rendue possible UNIQUEMENT par FP est tracée « FP » dans le brainLog.
      const externalConvStrong = (tech?.atScore && Math.abs(tech.atScore) >= (_fp ? 0.25 : 0.35));
      if (!_brainVeto && roster.votes.hold === roster.votes.total && !externalConvStrong) {
        const _lmsrDist = Math.abs(lmsrP(ps) - 0.5);
        const lmsrNeutral = _lmsrDist < (_fp ? 0.05 : 0.08);
        if (lmsrNeutral) {
          _brainVeto   = true;
          _brainReason = 'Conseil HOLD + LMSR neutre · pas de signal';
          if (!S.brainLog) S.brainLog = [];
          S.brainLog.unshift({ ts: Date.now(), pair, event: 'SKIP', side, reason: _brainReason });
          if (S.brainLog.length > 30) S.brainLog.length = 30;
        } else if (_fp && _lmsrDist < 0.08) {
          // hors FP, ce trade aurait été SKIP : trace de la prise de risque FP
          if (!S.brainLog) S.brainLog = [];
          S.brainLog.unshift({ ts: Date.now(), pair, event: 'FP', side, reason: 'Ouverture permise par Plein Régime (LMSR ' + (0.5 + (lmsrP(ps) >= 0.5 ? _lmsrDist : -_lmsrDist)).toFixed(3) + ', bande réduite)' });
          if (S.brainLog.length > 30) S.brainLog.length = 30;
        }
      }
    } catch (e) {
      console.warn('brain gate error:', e);
      // [OBSERVABILITÉ · 09/08/2026] un crash du gate était avalé ici en silence
      // (console.warn invisible sans DevTools) : ouvertures SANS conseil ni veto,
      // indistinguables d'approbations légitimes. Désormais visible au brainLog.
      if (!S.brainLog) S.brainLog = [];
      S.brainLog.unshift({ ts: Date.now(), pair, event: 'ERR', side, reason: 'Brain gate crashé · ' + String(e && e.message || e).slice(0, 80) });
      if (S.brainLog.length > 30) S.brainLog.length = 30;
    }
  }

  // [OBSERVABILITÉ · 09/08/2026] signe de vie : chaque évaluation qui TRAVERSE le gate
  // (approbation comprise) laisse une trace compacte. Sans elle, le brainLog figé du
  // 30/07 a fait passer 10 jours d'approbations silencieuses pour un gate mort.
  if (!_brainVeto && S._lastBrainAnalysis) {
    const _r = S._lastBrainAnalysis;
    if (!S.brainLog) S.brainLog = [];
    S.brainLog.unshift({ ts: Date.now(), pair, event: 'EVAL', side, reason: (_r.verdict || '?') + ' · consensus ' + Math.round((_r.consensus || 0) * 100) + '% · stake ×' + _brainMult + (_r.skillWeighted ? ' · skill×' + _r.skillWeighted : '') });
    if (S.brainLog.length > 30) S.brainLog.length = 30;
  }

  // Veto déclenché → on abandonne
  if (_brainVeto) {
    if (typeof showToast === 'function') {
      showToast('🧠 Brain Gate · ' + (_brainReason.length > 60 ? _brainReason.slice(0, 57) + '…' : _brainReason));
    }
    return;
  }

  // Smart Sizer applique le multiplicateur Kelly AVANT les checks d'exposition
  let _appliedSizerMult = null;
  let _execChunks = 1;   // [TWAP 09/08] chunks recommandés par le Bot Exécution, lus par le plan TWAP plus bas
  if (typeof runBotFleet === 'function') {
    try {
      const fleetResult = runBotFleet('pre_trade', { stake: baseStake, pair });   // [nutrition 09/08] la paire nourrit le Sharpe du Sizer
      if (fleetResult?.exec?.chunks > 1) _execChunks = fleetResult.exec.chunks;
      if (fleetResult?.sizer?.mult && Math.abs(fleetResult.sizer.mult - 1) > 0.01) {
        const adjusted = baseStake * fleetResult.sizer.mult;
        baseStake = Math.max(_stakeFloor(), _stakeRound(adjusted));
        // [AUDIT FLOTTE · 09/08/2026] le mult réellement appliqué est mémorisé sur la
        // position : à la clôture, l'impact marginal RÉEL du Smart Sizer est crédité
        // (remplace l'ancien « 5% de crédit revendiqué » forfaitaire).
        _appliedSizerMult = fleetResult.sizer.mult;
      }
    } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} }
  }

  // Fallback levier si compte trading vide
  let _useLeverageForStake = false;
  // le seuil "compte < 20 $ = bot suspendu" contredisait la politique de capital
  // (quasi-totalite investie => residuel volontairement petit) : il devient
  // proportionnel — on ne suspend que si le compte ne couvre plus un plancher.
  if (S.tradingAccount < _stakeFloor() * 2) {
    const levAvail = S.leverageReserve || 0;
    if (levAvail >= 20) {
      baseStake = Math.max(_stakeFloor(), Math.min(50, _stakeRound(levAvail * 0.10)));
      _useLeverageForStake = true;
    } else {
      showToast('⚠ Compte trading et levier insuffisants · bot suspendu', 2800, 'critical');
      return;
    }
  } else {
    if (baseStake > S.tradingAccount * 0.95) {
      // POLITIQUE DE CAPITAL (Rams 06/07) : quasi-totalite investie — on borne
      // au disponible moins la couverture des frais, plus de repli arbitraire a 25 %.
      // [ÉTAGE 1 · 09/08/2026] l'enveloppe quasi-totale se divise par les SLOTS LIBRES
      // (plafond 3 en AA/EV, 1 en RE) : la première position ne mange plus tout le compte,
      // les suivantes gardent leur part. Un seul slot libre = comportement d'avant, inchangé.
      const _slotsMax  = (S.tradingMode === 'real') ? 1 : ((S.paperRealConfig && S.paperRealConfig.maxConcurrentPos) || 1);
      const _slotsFree = Math.max(1, _slotsMax - ((S.openPositions && S.openPositions.length) || 0));
      baseStake = Math.max(_stakeFloor(), _stakeRound((S.tradingAccount - Math.max(1, S.tradingAccount * 0.02)) / _slotsFree));
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
    // En mode auto, avant de suspendre, tenter de monter l'index levier.
    // [RÈGLE RAMS 06/07, garde ajoutée 15/08] le bot n'emprunte QUE si les fonds
    // manquent (on est ici) ET si la conviction est forte (≥ 85%). Avant cette garde,
    // il empruntait pour n'importe quel trade que le capital ne couvrait pas.
    if (S.botAutoMode === true && _convForValidate >= 0.85 && (S.leverage || 0) < (S.leverageMaxMult || 10)) {
      const prevIdx    = S.leverage || 0;
      // [RÈGLE RAMS 15/08] le bot choisit ×combien : toute la plage jusqu'au plafond,
      // il s'arrête au PREMIER cran qui suffit (emprunt minimal nécessaire, jamais plus).
      const tryIndexes = [];
      for (let _i = prevIdx + 1; _i <= (S.leverageMaxMult || 10); _i++) tryIndexes.push(_i);

      for (const newIdx of tryIndexes) {
        try {
          if (typeof setLeverageByBot === 'function') {
            setLeverageByBot(newIdx, `anticipation capital pour ${pair}`);
          }
          capCheck = validateTotalExposure(baseStake, levBorrowed);
          if (capCheck.ok) {
            S.chainLog.push({
              icon: '🤖⚡',
              desc: `Bot anticipation: levier ${prevIdx}→${newIdx} pour ouvrir ${pair} (conviction ${Math.round(_convForValidate*100)}%)`,
              hash: rndHash(), time: nowStr()
            });
            // [RÈGLE RAMS 15/08] levier activé par le bot = Plein Régime s'allume avec :
            // conviction forte + argent emprunté = il met le paquet. FP retombera avec
            // le levier (couplage dans 02). Le stop d'urgence FP (-5%) reste le filet.
            try {
              if (!S.fullPowerMode && typeof enableFullPowerMode === 'function') {
                enableFullPowerMode();
                S._fpByBot = true;
                S.chainLog.push({ icon:'🤖⚡', desc:'Plein Régime activé avec le levier (règle du 15/08) · retombera quand le levier retombera', hash:rndHash(), time:nowStr() });
              }
            } catch(e) { try{window._decErr&&window._decErr(e)}catch(_e){} }
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
      baseStake = Math.max(_stakeFloor(), _stakeRound(baseStake * scaleFactor));
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
    while (!_check.ok && baseStake > _stakeFloor() && _guard < 50) {
      // paliers proportionnels (15 % de la mise, min 0.5 $) au lieu de -10 $ fixe
      baseStake = Math.max(_stakeFloor(), _stakeRound(baseStake - Math.max(0.5, baseStake * 0.15)));
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
      if (levBorrowed > 0) { try { repayLeverage(levBorrowed); } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} } }
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
  // [TWAP RÉEL · 09/08/2026] si le Bot Exécution a recommandé un split (chunks>1) et
  // que le mode est simulé/EV, l'ENTRÉE est moyennée sur N échantillons de prix (un
  // toutes les ~20 s, balayeur global _twapSweep) : comptes, réserves et gardes sont
  // inchangés (mise pleine à l'ouverture) — seul le prix d'entrée devient la moyenne
  // TWAP, comme une vraie exécution fractionnée. À la fin du remplissage, l'économie
  // RÉELLE et SIGNÉE vs l'entrée en un coup (prix p0) est créditée/débitée au Bot
  // Exécution — le TWAP peut coûter, la vérité l'affichera. RE reste en entrée directe
  // tant que l'exécution fractionnée réelle sur exchange n'existe pas (déclaré).
  let _twapPlan = null;
  if (_execChunks > 1 && S.tradingMode !== 'real') {
    _twapPlan = { n: _execChunks, filled: 1, sumPrice: ps.price, p0: ps.price, nextAt: Date.now() + 20000 };
  }

  // [ÉTAGE 1 · 09/08/2026] trace des ouvertures multi : position N/max + corrélation max
  // avec les positions déjà ouvertes — la matière du « garde à l'œil » au backup.
  try {
    const _nOpen = (S.openPositions && S.openPositions.length) || 0;
    if (_nOpen >= 1 && S.chainLog) {
      let _cmax = null;
      if (typeof _getPairCorrelation === 'function') {
        S.openPositions.forEach(function(op){
          const c = _getPairCorrelation(pair, op.pair);
          if (typeof c === 'number' && (_cmax === null || Math.abs(c) > Math.abs(_cmax))) _cmax = c;
        });
      }
      // [13/08] AA n'a pas de plafond (Vision XIII) : afficher ∞ au lieu du plafond EV
      const _mx = (S.tradingMode === 'real') ? '1' : (S.tradingMode === 'sim') ? '∞' : String((S.paperRealConfig && S.paperRealConfig.maxConcurrentPos) || 1);
      S.chainLog.push({ icon:'📊', desc:'Position ' + (_nOpen+1) + '/' + _mx + ' · ' + pair + (_cmax !== null ? ' · corr max ' + _cmax.toFixed(2) + ' avec l\u2019existant' : ''), hash:Math.random().toString(36).slice(2,8), time:new Date().toLocaleTimeString() });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
    }
  } catch(e) { try{window._decErr&&window._decErr(e)}catch(_e){} }

  // [SPÉCIALISATION · 15/08/2026] jury des disciples capturé à l'ouverture : chaque
  // disciple assis répond sur SON angle (direction/timing/conditions) — trois juges
  // trancheront à la clôture et créditeront le mérite PAR TÂCHE (module 12).
  let _juryPlan = null, _cvOpen = null;
  try {
    if (typeof window._discipleJurySnapshot === 'function') _juryPlan = window._discipleJurySnapshot(pair, side, null);
    const _tj = (typeof getTechSignals === 'function') ? getTechSignals(pair) : null;
    _cvOpen = _tj?.raw?.stddev?.cv ?? null;
  } catch(e) { try{window._decErr&&window._decErr(e)}catch(_e){} }

  S.openPositions.push({
    id, pair, side,
    _sizerMult:    _appliedSizerMult,   // impact Smart Sizer crédité à la clôture (audit 09/08)
    _twap:         _twapPlan,
    _jury:         _juryPlan,           // réponses des spécialistes à l'ouverture (spécialisation 15/08)
    _cvOpen:       _cvOpen,             // volatilité lue à l'ouverture — juge « conditions »
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
      } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} }
      return null;
    })(),

    // A/B testing : assigner une variante
    _abArm: (function() {
      if (S.tradingMode !== 'paperReal') return null;
      try {
        return _abAssignArm();
      } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} }
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


// ════════════════════════════════════════════════════════════════════════
// [TWAP SWEEP · 09/08/2026] balayeur global (10 s) : remplit les entrées TWAP en
// cours. Un échantillon de prix par passage dû, moyenne recalculée, entryPrice de la
// position ré-ancré. Au dernier échantillon : économie réelle signée vs p0 créditée
// au Bot Exécution + trace au journal. Position fermée avant la fin = plan abandonné
// naturellement (la position n'existe plus). TP/SL posés à l'ouverture restent ancrés
// sur p0 (déclaré : ils datent de la décision, pas de la moyenne).
// ════════════════════════════════════════════════════════════════════════
setInterval(function _twapSweep() {
  try {
    if (typeof S === 'undefined' || !S || !S.openPositions) return;
    const now = Date.now();
    S.openPositions.forEach(function (pos) {
      // [SPÉCIALISATION v2 · 15/08] suivi du PIRE prix pendant les 3 premières minutes
      // (les bougies sim n'ont pas de timestamp — prouvé au backup 23:31) : c'est la
      // matière du juge « timing » (excursion défavorable après l'entrée).
      try {
        if (pos.openedAt && (now - pos.openedAt) <= 180000) {
          const psw = S.pairStates && S.pairStates[pos.pair];
          if (psw && psw.price) {
            if (pos._worstPx == null) pos._worstPx = psw.price;
            if (pos.side === 'long'  && psw.price < pos._worstPx) pos._worstPx = psw.price;
            if (pos.side === 'short' && psw.price > pos._worstPx) pos._worstPx = psw.price;
          }
        }
      } catch(e) {}
      const t = pos._twap;
      if (!t || t.filled >= t.n || now < t.nextAt) return;
      const ps = S.pairStates && S.pairStates[pos.pair];
      if (!ps || !ps.price) return;
      t.filled++;
      t.sumPrice += ps.price;
      t.nextAt = now + 20000;
      pos.entryPrice = t.sumPrice / t.filled;
      if (t.filled >= t.n) {
        const avg = pos.entryPrice;
        const saving = (pos.side === 'long' ? (t.p0 - avg) : (avg - t.p0)) / t.p0 * (pos.stakeUsdt || 0);
        try {
          if (S.botFleet && S.botFleet.exec_bot_v1) {
            S.botFleet.exec_bot_v1.pnlContrib = (S.botFleet.exec_bot_v1.pnlContrib || 0) + saving;
          }
          if (S.chainLog) {
            S.chainLog.push({ icon: '⚡', desc: 'TWAP ' + t.n + 'x ' + pos.pair + ' terminé · entrée moyenne ' + avg.toFixed(4) + ' vs spot ' + t.p0.toFixed(4) + ' · ' + (saving >= 0 ? 'économie +' : 'coût −') + '$' + Math.abs(saving).toFixed(3), hash: Math.random().toString(36).slice(2, 8), time: new Date().toLocaleTimeString() });
            if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
          }
        } catch (e) { try{window._decErr&&window._decErr(e)}catch(_e){} }
        pos._twap = null;
      }
    });
  } catch (e) { try{window._decErr&&window._decErr(e)}catch(_e){} }
}, 10000);
