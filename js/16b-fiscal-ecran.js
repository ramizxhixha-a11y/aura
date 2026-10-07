// js/16b-fiscal-ecran.js — [GO FISCAL · 07/10/2026] VERSION 20261007b
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// ÉCRANS DU REGISTRE FISCAL BELGE (le calcul vit dans js/16-fiscal.js, chargé juste avant) :
//   · régime EN COURS (carte d'accueil « Régime fiscal », sous-titre de la « Réserve fiscale », fiche MAN) ;
//   · onglet ⚖ Impôt de la page Fiscal : dépôt et dû de l'année, les deux régimes, bot fiscal (ce que les données de
//     l'année disent), par crypto, historique de chaque trade, mouvements du dépôt, années, réglages, la loi et ses sources ;
//   · export CSV du registre. Rien ici ne décide ni ne déplace d'argent, sauf tes gestes (réglages, « payé »).
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════

// ── RÉGIME EN COURS (ce que le prochain trade recevrait) ──────────────────────────────────────────────────────────
function _fiscRegimeNow() {
  var auto = !!(S && S.botAutoMode);
  var mode = (typeof _walletKey === 'function') ? _walletKey() : 'sim';
  var L = _fiscLedger(mode, false), cfg = _fiscCfg();
  var y = _fiscYearOf(Date.now());
  var yr = (L && L.years[y]) ? L.years[y] : _fiscNewYear(y, L ? L.carry : null);
  var d = _fiscDue(yr, cfg, mode === 'real');
  var rS = (d.rateS * 100);
  var rSs = (Math.round(rS * 10) / 10).toString().replace('.', ',') + ' %';
  if (auto) return { auto: true, regime: 'spec', pct: rSs, col: 'var(--down)', label: 'Spéculatif · AUTO',
                     sub: 'les bots ouvrent → ' + rSs + ' sans exonération · MANU LONG sans levier → 10 %', left: d.left, d: d, mode: mode };
  return { auto: false, regime: 'normal', pct: '10 %', col: 'var(--up)', label: 'Normal · MANU',
           sub: 'LONG sans levier → 10 % · exonération restante ' + _fiscEur(d.left, 0) + ' · SHORT ou levier → ' + rSs, left: d.left, d: d, mode: mode };
}

// ── AFFICHAGE ──────────────────────────────────────────────────────────────────────────────────────────────────────
function _fiscEsc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function _fiscEur(v, dec) {
  dec = (dec == null) ? 2 : dec;
  var n = _fiscNum(v);
  try { return n.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + ' €'; } catch (e) { return n.toFixed(dec) + ' €'; }
}
function _fiscUsd(v, sign) { var n = _fiscNum(v); return (sign && n > 0 ? '+' : (n < 0 ? '−' : '')) + '$' + Math.abs(n).toFixed(2); }
function _fiscSgnEur(v) { var n = _fiscNum(v); return (n > 0 ? '+' : (n < 0 ? '−' : '')) + _fiscEur(Math.abs(n)); }

// Carte d'accueil « Régime fiscal » (09k) : le régime en cours, pas une estimation du comportement.
function _fiscHomeCard() {
  var r = _fiscRegimeNow();
  return { val: r.pct, col: r.col, sub: (r.auto ? '⚠ ' : '✓ ') + r.label + ' · ' + r.sub };
}

// Sous-titre de la carte « Réserve fiscale » (07 et 09k écrivent la même phrase : plus de clignotement entre deux textes).
function _fiscResSub() {
  try {
    if (!S.taxConfig || S.taxConfig.region !== 'BE') { var c = (S.fiscalReserveLog || []).length; return c + (c > 1 ? ' dépôts' : ' dépôt'); }
    var r = _fiscRegimeNow();
    return 'impôt ' + _fiscYearOf(Date.now()) + ' : ' + r.d.due.toFixed(2).replace('.', ',') + ' € dû';
  } catch (e) { return ''; }
}

// Fiche MAN (10 openManDetail) : le régime du trade que tu t'apprêtes à ouvrir, ou de celui qui est ouvert.
function _fiscManNote(pair, manualPos) {
  var r = _fiscRegimeNow(), d = r.d;
  var rS = (Math.round(d.rateS * 1000) / 10).toString().replace('.', ',') + ' %';
  var body;
  if (manualPos) {
    var rg = _fiscRegimeOf(manualPos);
    body = rg.regime === 'normal'
      ? '<b style="color:var(--up);">Normal 10 %</b> · ' + _fiscEsc(rg.why.join(' · ')) + ' · exonération restante ' + _fiscEur(d.left, 0)
      : '<b style="color:var(--down);">Spéculatif ' + rS + '</b> · ' + _fiscEsc(rg.why.join(' · ')) + ' · sans exonération';
  } else {
    body = '<b style="color:var(--up);">LONG, levier ×1 → normal 10 %</b> · exonération restante ' + _fiscEur(d.left, 0)
         + '<br><b style="color:var(--down);">SHORT ou levier &gt; 1 → spéculatif ' + rS + '</b>, sans exonération';
  }
  return '<div class="detail-section-title">⚖️ Régime fiscal (règle du 07/10)</div><div class="fx-man">' + body
       + '<div class="fx-man-sub">Gain → sa part va au dépôt fiscal à la fermeture · perte → elle en revient (même régime, même année).</div></div>';
}

// État d'interface de la page (non sauvegardé)
var _fiscUi = { all: false, mode: null, sig: '', paidAsk: null, lawOpen: false };

function _fiscSig(el, mode) {
  var L = _fiscLedger(mode, false);
  var w = _fiscWallet(mode) || {};
  return [mode, (S.taxConfig && S.taxConfig.region), L ? L.rev : -1, Math.round(_fiscNum(w.fiscalReserveAccount) * 100), Math.round(_fiscNum(w.tradingAccount)), !!(S && S.botAutoMode),
          _fiscUi.all, _fiscUi.paidAsk, JSON.stringify(_fiscCfg()), Math.floor(Date.now() / 60000), (S.openPositions || []).length].join('|');
}

// Bot fiscal : ce que les données de l'année disent, recalculé à chaque affichage et à chaque passe.
function _fiscInsights(mode) {
  var out = [];
  var L = _fiscLedger(mode, false), cfg = _fiscCfg(), isReal = mode === 'real';
  var now = Date.now(), y = _fiscYearOf(now);
  var yr = (L && L.years[y]) ? L.years[y] : _fiscNewYear(y, L ? L.carry : null);
  var d = _fiscDue(yr, cfg, isReal);
  var fx = _fiscFx();
  if (!isReal) out.push(['ℹ️', 'Mode ' + (_FISC_MODE_LBL[mode] || mode) + ' : le calcul est le même, sur l\'argent simulé — rien n\'est dû au fisc. Seul le registre du RE est réel.']);
  if (d.a.pending) out.push(['⚠️', 'Montants indexés de ' + y + ' pas encore publiés au ' + FISC_BE.reviewed.split('-').reverse().join('/') + ' : ceux de ' + d.a.year + ' sont utilisés (base ' + _fiscEur(d.a.base, 0) + '). À mettre à jour.']);
  if (fx.fallback) out.push(['⚠️', 'Cours USD→EUR indisponible : repli 0,92 de l\'app. Le registre se recale au prochain trade.']);
  out.push(['🛡️', 'Exonération ' + y + ' : ' + _fiscEur(d.E, 0) + ' (base ' + _fiscEur(d.a.base, 0) + (d.compAvail > 0 ? ' + reportée ' + _fiscEur(d.compAvail, 0) : '') + ')'
    + (isReal && d.G ? ', dont ' + _fiscSgnEur(d.G) + ' déjà réalisés hors AURA' : '') + '. Reste ' + _fiscEur(d.left, 0)
    + ' : un gain MANU LONG sans levier jusqu\'à ce montant ne coûte rien.']);
  if (d.extSaving > 0) out.push(['💡', 'Tes pertes MANU d\'AURA baissent de ' + _fiscEur(d.extSaving) + ' l\'impôt de tes plus-values hors AURA (même régime, même année).']);
  if (d.N < 0) out.push(['📉', 'Régime normal en perte de ' + _fiscEur(-d.N) + ' : elle compense les gains MANU de l\'année, pas les spéculatifs, et ne se reporte pas au-delà du 31/12.']);
  if (d.S < 0) out.push(['📉', 'Régime spéculatif en perte de ' + _fiscEur(-d.S) + ' (frais compris) : si l\'année finit ainsi, elle se reporte 5 ans sur de futurs gains spéculatifs.']);
  if (d.usedLoss > 0) out.push(['♻️', 'Pertes spéculatives des années passées déduites : ' + _fiscEur(d.usedLoss) + ' sur ' + _fiscEur(d.prior) + ' disponibles.']);
  if (d.taxS > 0 && d.taxableS > 0) {
    var alt = Math.max(0, d.taxableS) * FISC_BE.rateNormal;
    out.push(['💡', 'Gains spéculatifs imposables ' + _fiscEur(d.taxableS) + ' → ' + _fiscEur(d.taxS) + ' d\'impôt. En MANU LONG sans levier, le même gain coûterait au plus ' + _fiscEur(alt) + ' (avant exonération).']);
  }
  if (yr.feesUsd > 0) {
    var grossPos = (yr.normal.gain + yr.spec.gain) / (fx.r || 0.92);
    out.push(['💸', 'Frais de courtage ' + y + ' : ' + _fiscUsd(yr.feesUsd) + ' + glissement ' + _fiscUsd(yr.slipUsd)
      + (grossPos > 0 ? ' (' + ((yr.feesUsd + yr.slipUsd) / grossPos * 100).toFixed(1).replace('.', ',') + ' % des plus-values)' : '')
      + '. Déduits en spéculatif, pas en normal.']);
  }
  if (yr.shortUsd > 0.005) out.push(['🔴', 'Provision incomplète : il manque ' + _fiscUsd(yr.shortUsd) + ' au dépôt (compte trading vide au moment du calcul). Le bot réessaie toutes les 10 min.']);
  if (!(d.commune > 0)) out.push(['🏛️', 'Additionnels communaux non saisis (0 %) : ils s\'ajoutent aux 33 %. Mets le taux de ta commune dans les réglages ci-dessous.']);
  var h = _fiscHarvest(mode);
  if (h) out.push(['💎', 'Perte latente ' + h.pair + ' (' + (h.regime === 'normal' ? 'normal' : 'spéculatif') + ') : la réaliser avant le 31/12 baisserait l\'impôt ' + y + ' de ' + _fiscEur(h.savingEur) + ' (même régime, même année).']);
  var end = new Date(y + 1, 0, 1).getTime();
  var days = Math.max(0, Math.ceil((end - now) / 86400000));
  out.push(['📅', days + ' jour' + (days > 1 ? 's' : '') + ' avant la clôture ' + y + ' : le 1er janvier, le dû est figé, l\'exonération non utilisée (≤ 1 000 €) et les pertes spéculatives sont reportées.']);
  return out;
}

// Raison du régime d'une ligne d'historique (reconstruite : elle n'est pas stockée, le registre reste léger)
function _fiscWhy(e) {
  if (e.r === 'n') return 'MANU · LONG · sans levier';
  var w = [];
  if (e.a) w.push('AUTO (bot)');
  if (e.s !== 'L') w.push('SHORT (vente à découvert = crypto empruntée)');
  if (_fiscNum(e.lv) > 0) w.push('levier (emprunt ' + _fiscNum(e.lv).toFixed(2) + ' $)');
  return w.join(' · ') || 'spéculatif';
}

function _fiscRow(lbl, val, col, strong) {
  return '<div class="fx-row' + (strong ? ' fx-row-strong' : '') + '"><span>' + lbl + '</span><span style="color:' + (col || 'var(--t1)') + ';">' + val + '</span></div>';
}

function _fiscRenderPage(el) {
  if (!el) return;
  var mode = (typeof _walletKey === 'function') ? _walletKey() : 'sim';
  try { if (el.contains(document.activeElement) && /INPUT|SELECT/.test(document.activeElement.tagName)) return; } catch (e) {}
  var sig = _fiscSig(el, mode);
  if (sig === _fiscUi.sig && el.childElementCount) return;
  _fiscUi.sig = sig;
  var badge = document.getElementById('fRegionBadge'); if (badge) badge.textContent = 'BE · ' + (_FISC_MODE_LBL[mode] || mode);
  var region = S.taxConfig && S.taxConfig.region;
  if (region && region !== 'BE') {
    el.innerHTML = '<div class="fx-card"><div class="fx-note">Le registre applique la loi belge. Région choisie : ' + _fiscEsc(region)
      + ' — avec une autre région, AURA ne provisionne aucun impôt. Choisis 🇧🇪 Belgique dans ⚙ pour que le registre s\'applique.</div></div>';
    return;
  }
  var L = _fiscLedger(mode, false), cfg = _fiscCfg(), isReal = mode === 'real';
  var w = _fiscWallet(mode) || {};
  var now = Date.now(), y = _fiscYearOf(now);
  var yr = (L && L.years[y]) ? L.years[y] : _fiscNewYear(y, L ? L.carry : null);
  var d = _fiscDue(yr, cfg, isReal);
  var fx = _fiscFx().r;
  var r = _fiscRegimeNow();
  var lbl = _FISC_MODE_LBL[mode] || mode;
  var modeCol = mode === 'real' ? 'var(--mode-real)' : (mode === 'paperReal' ? 'var(--mode-paper)' : 'var(--mode-sim)');
  var heldUnpaid = L ? Object.keys(L.years).reduce(function (s, k) { var v = L.years[k]; return s + (v.paid ? 0 : _fiscNum(v.provUsd)); }, 0) : 0;
  var dep = _fiscNum(w.fiscalReserveAccount);
  var other = Math.max(0, dep - heldUnpaid);
  var h = [];
  // 1 · en-tête
  h.push('<div class="fx-head"><span class="fx-mode" style="color:' + modeCol + ';border-color:' + modeCol + ';">' + lbl + '</span>'
    + '<span class="fx-head-t">Registre ' + y + ' · loi belge</span>'
    + '<span class="fx-head-s">' + (isReal ? 'argent réel — dû au fisc' : 'simulation — rien n\'est dû') + '</span></div>');
  if (!L) h.push('<div class="fx-note">Le registre de ce mode s\'ouvre au premier trade fermé. Tout ce qui suit est déjà calculé selon la loi : il se remplit trade après trade.</div>');
  // 2 · dépôt et dû
  h.push('<div class="fx-card fx-hero"><div><div class="fx-lbl">Dépôt fiscal · provision ' + y + '</div>'
    + '<div class="fx-big" style="color:var(--gold);">' + _fiscUsd(yr.provUsd) + '</div>'
    + '<div class="fx-sub">≈ ' + _fiscEur(_fiscNum(yr.provUsd) * fx) + (yr.shortUsd > 0.005 ? ' · <span style="color:var(--down);">manque ' + _fiscUsd(yr.shortUsd) + '</span>' : '') + '</div></div>'
    + '<div style="text-align:right;"><div class="fx-lbl">Impôt dû ' + y + ' à ce jour</div><div class="fx-big">' + _fiscEur(d.due) + '</div>'
    + '<div class="fx-sub">10 % : ' + _fiscEur(d.taxN) + ' · 33 % : ' + _fiscEur(d.taxS) + '</div></div></div>');
  // 3 · régime en cours
  h.push('<div class="fx-card fx-regime" style="border-color:' + r.col + '55;"><div class="fx-lbl">Régime en cours · ' + (r.auto ? 'AUTO' : 'MANU') + '</div>'
    + '<div class="fx-regime-v" style="color:' + r.col + ';">' + r.pct + ' · ' + _fiscEsc(r.label) + '</div><div class="fx-sub">' + _fiscEsc(r.sub) + '</div>'
    + '<div class="fx-sub">Règle : MANU + LONG + sans levier → normal 10 %, exonération · AUTO, SHORT ou levier → spéculatif, sans exonération. Le fisc qualifie en dernier ressort.</div></div>');
  // 4 · les deux régimes
  var rSs = (Math.round(d.rateS * 1000) / 10).toString().replace('.', ',') + ' %';
  h.push('<div class="fx-grid">'
    + '<div class="fx-card"><div class="fx-card-t" style="color:var(--up);">Normal · 10 %</div><div class="fx-n">' + yr.nN + ' trade' + (yr.nN > 1 ? 's' : '') + ' · MANU LONG sans levier</div>'
    + _fiscRow('Plus-values', _fiscEur(yr.normal.gain), 'var(--up)') + _fiscRow('Moins-values', '−' + _fiscEur(yr.normal.loss), 'var(--down)')
    + _fiscRow('Net AURA', _fiscSgnEur(d.N), d.N >= 0 ? 'var(--up)' : 'var(--down)')
    + (isReal ? _fiscRow('Hors AURA (réglage)', _fiscSgnEur(d.G)) : '')
    + _fiscRow('Exonération', _fiscEur(d.E, 0) + (d.compAvail > 0 ? ' <span class="fx-dim">(dont report ' + _fiscEur(d.compAvail, 0) + ')</span>' : ''))
    + _fiscRow('Exonération restante', _fiscEur(d.left, 0), 'var(--ice)')
    + _fiscRow('Imposable (part AURA)', _fiscEur(d.taxableN)) + _fiscRow('Impôt 10 %', _fiscEur(d.taxN), 'var(--gold)', true)
    + '<div class="fx-dim fx-tiny">Frais non déduits (loi). Pertes : même année, sans report.</div></div>'
    + '<div class="fx-card"><div class="fx-card-t" style="color:var(--down);">Spéculatif · ' + rSs + '</div><div class="fx-n">' + yr.nS + ' trade' + (yr.nS > 1 ? 's' : '') + ' · AUTO, SHORT, levier</div>'
    + _fiscRow('Plus-values', _fiscEur(yr.spec.gain), 'var(--up)') + _fiscRow('Moins-values', '−' + _fiscEur(yr.spec.loss), 'var(--down)')
    + _fiscRow('Frais déduits', '−' + _fiscEur(yr.spec.fee), 'var(--down)')
    + _fiscRow('Net', _fiscSgnEur(d.S), d.S >= 0 ? 'var(--up)' : 'var(--down)')
    + _fiscRow('Pertes reportées', d.prior > 0 ? '−' + _fiscEur(d.usedLoss) + ' <span class="fx-dim">/ ' + _fiscEur(d.prior, 0) + '</span>' : '<span class="fx-dim">aucune</span>')
    + _fiscRow('Imposable', _fiscEur(d.taxableS))
    + _fiscRow('Taux', '33 %' + (d.commune > 0 ? ' + ' + String(d.commune).replace('.', ',') + ' % commune' : ' <span class="fx-dim">+ commune ?</span>'))
    + _fiscRow('Impôt', _fiscEur(d.taxS), 'var(--gold)', true)
    + '<div class="fx-dim fx-tiny">Aucune exonération. Pertes : 5 ans de report.</div></div></div>');
  // 5 · bot fiscal
  var ins = _fiscInsights(mode);
  h.push('<div class="fx-sec">💎 Bot fiscal · analyse ' + y + '</div><div class="fx-card">'
    + ins.map(function (i) { return '<div class="fx-ins"><span>' + i[0] + '</span><span>' + _fiscEsc(i[1]) + '</span></div>'; }).join('') + '</div>');
  // 6 · par crypto (biens distincts)
  var pk = Object.keys(yr.pairs || {}).sort(function (a, b) { return Math.abs(yr.pairs[b].gN + yr.pairs[b].gS) - Math.abs(yr.pairs[a].gN + yr.pairs[a].gS); });
  h.push('<div class="fx-sec">💱 Par crypto · ' + y + '</div><div class="fx-card">');
  if (!pk.length) h.push('<div class="fx-dim">Aucun trade fermé cette année dans ce registre.</div>');
  else {
    h.push('<div class="fx-tab fx-tab-h"><span>Paire</span><span>Trades</span><span>Normal</span><span>Spéc. net</span><span>Frais</span><span>Dépôt</span></div>');
    pk.forEach(function (p) {
      var v = yr.pairs[p];
      h.push('<div class="fx-tab"><span>' + _fiscEsc(p) + '</span><span>' + v.n + ' <span class="fx-dim">' + v.nN + '/' + v.nS + '</span></span>'
        + '<span style="color:' + (v.gN >= 0 ? 'var(--up)' : 'var(--down)') + ';">' + _fiscSgnEur(v.gN) + '</span>'
        + '<span style="color:' + (v.gS >= 0 ? 'var(--up)' : 'var(--down)') + ';">' + _fiscSgnEur(v.gS) + '</span>'
        + '<span style="color:var(--down);">' + _fiscUsd(v.feeUsd + v.slipUsd) + '</span>'
        + '<span style="color:var(--gold);">' + _fiscUsd(v.movedUsd, true) + '</span></div>');
    });
    h.push('<div class="fx-dim fx-tiny">Normal = plus-value légale (frais exclus) · Spéc. net = frais déduits · Frais = courtage + glissement · Dépôt = provision versée (+) ou rendue (−).</div>');
  }
  h.push('</div>');
  // 7 · historique des trades
  var hist = L ? L.hist.filter(function (e) { return e.y === y; }) : [];
  var shown = _fiscUi.all ? hist : hist.slice(0, 15);
  h.push('<div class="fx-sec">🧾 Historique ' + y + ' · ' + hist.length + ' trade' + (hist.length > 1 ? 's' : '') + '</div><div class="fx-card">');
  if (!hist.length) h.push('<div class="fx-dim">Chaque trade fermé apparaîtra ici : régime, raison, gain en euros, frais, part versée au dépôt.</div>');
  shown.forEach(function (e) {
    var dt = new Date(e.t);
    var when = ('0' + dt.getDate()).slice(-2) + '/' + ('0' + (dt.getMonth() + 1)).slice(-2) + ' ' + ('0' + dt.getHours()).slice(-2) + ':' + ('0' + dt.getMinutes()).slice(-2);
    var rc = e.r === 'n' ? 'var(--up)' : 'var(--down)';
    h.push('<div class="fx-h"><div class="fx-h1"><span class="fx-dim">' + when + '</span><span>' + _fiscEsc(e.p) + ' ' + (e.s === 'L' ? '↑ LONG' : '↓ SHORT') + '</span>'
      + '<span class="fx-chip">' + (e.a ? '🤖 AUTO' : '👤 MAN') + '</span><span class="fx-chip" style="color:' + rc + ';border-color:' + rc + '66;">' + (e.r === 'n' ? 'normal' : 'spéculatif') + '</span></div>'
      + '<div class="fx-h2"><span style="color:' + (e.g >= 0 ? 'var(--up)' : 'var(--down)') + ';">' + _fiscSgnEur(e.g) + '</span>'
      + '<span class="fx-dim">frais ' + _fiscUsd(e.fe + e.sl) + '</span>'
      + '<span style="color:var(--gold);">dépôt ' + _fiscUsd(e.mv, true) + '</span></div>'
      + '<div class="fx-h3">' + _fiscEsc(_fiscWhy(e)) + ' · mise ' + _fiscUsd(e.st) + (e.N > e.st + 1e-9 ? ' (expo ' + _fiscUsd(e.N) + ')' : '') + ' · dû ' + _fiscEur(e.d0) + ' → ' + _fiscEur(e.d1)
      + (e.ff ? ' · cours € de repli' : '') + '</div></div>');
  });
  if (hist.length > 15) h.push('<button class="fx-btn" onclick="_fiscToggleAll()">' + (_fiscUi.all ? 'Réduire' : 'Tout voir (' + hist.length + ')') + '</button>');
  if (L && L.hist.length) h.push('<button class="fx-btn" onclick="_fiscExportCsv()">📥 Exporter le registre ' + lbl + ' (CSV)</button>');
  h.push('</div>');
  // 8 · dépôt fiscal : composition et mouvements
  var lg = (w.fiscalReserveLog || []).slice(0, 10);
  var srcLbl = { tax_trade_close: 'Impôt · trade', tax_release: 'Rendu · perte', tax_adjust: 'Réajustement', tax_paid: 'Impôt payé', leverage_interest: 'Intérêt levier', margin_call: 'Appel de marge', tax_session_dispatch: 'Ancien calcul' };
  h.push('<div class="fx-sec">🏦 Dépôt fiscal · ' + _fiscUsd(dep) + '</div><div class="fx-card">'
    + _fiscRow('Impôt provisionné (années non payées)', _fiscUsd(heldUnpaid), 'var(--gold)')
    + _fiscRow('Autres (intérêts levier, appels de marge)', _fiscUsd(other), 'var(--ice)'));
  if (lg.length) lg.forEach(function (e) {
    var a = _fiscNum(e.amount);
    h.push('<div class="fx-row fx-log"><span>' + _fiscEsc(srcLbl[e.source] || e.source || '') + (e.pair ? ' · ' + _fiscEsc(e.pair) : '') + (e.year ? ' · ' + e.year : '') + ' <span class="fx-dim">' + _fiscEsc(e.time || '') + '</span></span>'
      + '<span style="color:' + (a >= 0 ? 'var(--gold)' : 'var(--ice)') + ';">' + (a >= 0 ? '+' : '−') + '$' + Math.abs(a).toFixed(3) + '</span></div>');
  });
  h.push('</div>');
  // 9 · années
  var ys = L ? Object.keys(L.years).map(Number).sort(function (a, b) { return b - a; }) : [];
  if (ys.length) {
    h.push('<div class="fx-sec">📚 Années</div><div class="fx-card">');
    ys.forEach(function (k) {
      var v = L.years[k];
      var st = !v.closed ? 'en cours' : (v.paid ? 'payé' : 'à payer');
      var co = v.carryOut ? ' · reporté : exonération ' + _fiscEur(v.carryOut.comp, 0) + ', pertes spéc. ' + _fiscEur(v.carryOut.specLoss.reduce(function (s, e) { return s + e.eur; }, 0), 0) : '';
      h.push('<div class="fx-yr"><div><b>' + k + '</b> · ' + v.n + ' trades · dû ' + _fiscEur(v.dueEur) + ' · provision ' + _fiscUsd(v.paid ? v.paidUsd : v.provUsd) + ' <span class="fx-chip">' + st + '</span></div>'
        + '<div class="fx-dim fx-tiny">' + _fiscEsc(co) + '</div>'
        + (v.closed && !v.paid ? '<button class="fx-btn" onclick="_fiscPaidClick(' + k + ')">' + (_fiscUi.paidAsk === k ? 'Confirmer : impôt ' + k + ' payé' : 'Marquer ' + k + ' payé') + '</button>' : '') + '</div>');
    });
    h.push('</div>');
  }
  // 10 · réglages
  var extV = _fiscNum(cfg.ext[y]);
  h.push('<div class="fx-sec">⚙️ Réglages fiscaux</div><div class="fx-card">'
    + '<label class="fx-lbl" for="fxCommune">Additionnels communaux (% de l\'impôt à 33 %, taux de ta commune)</label>'
    + '<input class="fx-in" id="fxCommune" type="number" min="0" max="15" step="0.1" value="' + _fiscNum(cfg.commune) + '" onchange="_fiscSetCommune(this.value)">'
    + '<label class="fx-lbl" for="fxExt">Plus-values nettes ' + y + ' réalisées HORS AURA, régime normal (€, perte en négatif) — elles partagent ton exonération ; RE seulement</label>'
    + '<input class="fx-in" id="fxExt" type="number" step="1" value="' + extV + '" onchange="_fiscSetExt(this.value)">'
    + '</div>');
  // 11 · la loi appliquée
  h.push('<details class="fx-card fx-law"' + (_fiscUi.lawOpen ? ' open' : '') + ' ontoggle="_fiscUi.lawOpen = this.open"><summary>📜 La loi appliquée · relue le ' + FISC_BE.reviewed.split('-').reverse().join('/') + '</summary>'
    + '<div class="fx-law-b">Plus-values réalisées depuis le 01/01/2026, crypto et stablecoins compris (un échange crypto → USDT est une cession). '
    + 'Normal : 10 %, exonération ' + _fiscEur(10000, 0) + '/an + report de la part non utilisée (≤ 1 000 €/an, ≤ 5 000 € utilisés la même année), moins-values de la même année, aucun frais déduit. '
    + 'Spéculatif (CIR 92 art. 90, 1°) : 33 % + additionnels communaux, aucune exonération, frais déduits (art. 97), pertes des 5 années antérieures déduites (art. 103). '
    + 'Indices du fisc pour les crypto (circulaire 2026/C/74 du 22/07/2026) : part du patrimoine en crypto, emprunt, bots de trading — appréciés ensemble. '
    + 'Gain en euros au cours USD→EUR de l\'app à l\'ouverture et à la fermeture. Je ne suis pas conseiller fiscal : en cas de doute, un comptable ou une décision anticipée du SPF Finances (ruling).</div>'
    + '<div class="fx-law-s">' + FISC_BE.sources.map(function (s) { return '<a href="' + s[1] + '" target="_blank" rel="noopener">' + _fiscEsc(s[0]) + '</a>'; }).join(' · ') + '</div></details>');
  el.innerHTML = h.join('');
}

function _fiscToggleAll() { _fiscUi.all = !_fiscUi.all; _fiscUi.sig = ''; try { _fiscRenderPage(document.getElementById('taxPanel')); } catch (e) {} }
function _fiscPaidClick(y) {
  var mode = (typeof _walletKey === 'function') ? _walletKey() : 'sim';
  if (_fiscUi.paidAsk !== y) { _fiscUi.paidAsk = y; }
  else { _fiscUi.paidAsk = null; if (_fiscMarkPaid(mode, y)) { try { showToast('🏦 Impôt ' + y + ' marqué payé · provision retirée du dépôt', 3500, 'user'); } catch (e) {} try { saveState && saveState(true); } catch (e) {} } }
  _fiscUi.sig = ''; try { _fiscRenderPage(document.getElementById('taxPanel')); } catch (e) {}
}
function _fiscSetCommune(v) {
  var n = parseFloat(String(v).replace(',', '.'));
  if (!isFinite(n) || n < 0) n = 0;
  _fiscCfg().commune = n;
  _fiscAdjustAll('additionnels communaux ' + n + ' %');
  _fiscUi.sig = ''; try { saveState && saveState(true); } catch (e) {}
  try { showToast('🏛️ Additionnels communaux : ' + String(n).replace('.', ',') + ' %', 2500, 'user'); } catch (e) {}
}
function _fiscSetExt(v) {
  var n = parseFloat(String(v).replace(',', '.'));
  if (!isFinite(n)) n = 0;
  var y = _fiscYearOf(Date.now());
  _fiscCfg().ext[y] = n;
  _fiscAdjustAll('plus-values hors AURA ' + y);
  _fiscUi.sig = ''; try { saveState && saveState(true); } catch (e) {}
  try { showToast('🧾 Hors AURA ' + y + ' : ' + _fiscSgnEur(n), 2500, 'user'); } catch (e) {}
}
function _fiscExportCsv() {
  var mode = (typeof _walletKey === 'function') ? _walletKey() : 'sim';
  var L = _fiscLedger(mode, false); if (!L) return;
  var head = ['date', 'annee', 'paire', 'sens', 'ouvert_par', 'regime', 'raison', 'prix_entree', 'prix_sortie', 'exposition_usd', 'mise_usd', 'pnl_usd', 'glissement_usd', 'frais_usd', 'cours_eur_entree', 'cours_eur_sortie', 'gain_legal_eur', 'frais_deduits_eur', 'du_avant_eur', 'du_apres_eur', 'depot_usd'];
  var q = function (s) { s = String(s); return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  var rows = L.hist.slice().reverse().map(function (e) {
    return [new Date(e.t).toISOString(), e.y, e.p, e.s === 'L' ? 'LONG' : 'SHORT', e.a ? 'AUTO' : 'MANU', e.r === 'n' ? 'normal 10%' : 'speculatif 33%', _fiscWhy(e),
            e.x0, e.x1, e.N.toFixed(4), e.st.toFixed(4), e.pu.toFixed(6), e.sl.toFixed(6), e.fe.toFixed(6), e.fi, e.fo, e.g.toFixed(6), e.fE.toFixed(6), e.d0.toFixed(6), e.d1.toFixed(6), e.mv.toFixed(6)].map(q).join(';');
  });
  var csv = head.join(';') + '\n' + rows.join('\n');
  try { downloadFile(csv, 'aura_registre_fiscal_' + (_FISC_MODE_LBL[mode] || mode) + '_' + new Date().toISOString().slice(0, 10) + '.csv', 'text/csv'); } catch (e) { try { window._decErr && window._decErr(e); } catch (_e) {} }
}

try {
  window._fiscRegimeNow = _fiscRegimeNow; window._fiscHomeCard = _fiscHomeCard; window._fiscResSub = _fiscResSub; window._fiscManNote = _fiscManNote;
  window._fiscInsights = _fiscInsights; window._fiscWhy = _fiscWhy; window._fiscUi = _fiscUi; window._fiscRenderPage = _fiscRenderPage;
  window._fiscToggleAll = _fiscToggleAll; window._fiscPaidClick = _fiscPaidClick; window._fiscSetCommune = _fiscSetCommune;
  window._fiscSetExt = _fiscSetExt; window._fiscExportCsv = _fiscExportCsv;
} catch (e) {}
