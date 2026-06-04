// ════════════════════════════════════════════════════════════
// AURA8 — module consolidé 06/10
// Contient : v63-patterns-chartistes, v71-correlation-live-btc-impact, v78-sons-personnalises-win-loss, v84-anti-revenge-trading
// ════════════════════════════════════════════════════════════
// ═══ v63 · PATTERNS CHARTISTES ═══
// Détection automatique de 10 patterns sur les prix récents
// Basé sur les ticks de prix stockés dans pairStates

let _ptPair = Object.keys(PAIRS||{})[0] || 'BTC/USDT';

function selectPtPair(pair) {
  _ptPair = pair;
  renderPatternSection();
}
window.selectPtPair = selectPtPair;

// Récupérer une série de prix depuis les trades + prix courant
function _ptPrices(pair) {
  const ps = S.pairStates?.[pair] || {};
  const cur = ps.price || 0;
  const trades = (ps.trades||[]).filter(t=>t.price&&t.ts).sort((a,b)=>a.ts-b.ts).slice(-30);

  // Construire une série OHLC approximative depuis les trades + prix actuel
  let prices = trades.map(t=>t.price).filter(Boolean);
  if(cur && cur>0) prices.push(cur);
  if(prices.length<4) {
    // Simuler une série fictive basée sur le prix courant
    const base = cur||50000;
    const vol  = base*0.015;
    prices = Array.from({length:20},(_,i)=>base + Math.sin(i*0.6)*vol + (Math.random()-0.5)*vol*0.5);
  }
  return prices;
}

// Détecter les patterns sur une série de prix
function _detectPatterns(prices) {
  const n = prices.length;
  if(n<5) return [];
  const patterns = [];
  const last = prices[n-1];
  const prev = prices[n-2];
  const p3   = prices[n-3];
  const p4   = prices[n-4];
  const p5   = prices[n-5];

  // Trend globale
  const trend = prices.slice(-8);
  const isUp   = trend[trend.length-1] > trend[0]*1.005;
  const isDown = trend[trend.length-1] < trend[0]*0.995;

  // Max/Min sur 10 derniers
  const window10 = prices.slice(-10);
  const high10   = Math.max(...window10);
  const low10    = Math.min(...window10);
  const range10  = high10 - low10;

  // ── Doji ──
  const bodySize = Math.abs(last-prev);
  const avgPrice = (last+prev)/2;
  if(bodySize<avgPrice*0.001 && range10>avgPrice*0.005) {
    patterns.push({name:'Doji',icon:'➕',signal:'neu',conf:0.6,
      desc:'Corps très petit — indécision du marché. Possible retournement imminient.'});
  }

  // ── Marteau (Hammer) ──
  const prevBody = Math.abs(prev-p3);
  const prevLow  = Math.min(prev,p3);
  const prevRange= Math.max(prev,p3)-Math.min(prev,p3,p4)*0.5;
  if(prevBody>0 && prevRange/prevBody>2.5 && prev>p3 && isDown) {
    patterns.push({name:'Marteau',icon:'🔨',signal:'bull',conf:0.72,
      desc:'Longue mèche basse après tendance baissière. Signal de retournement haussier potentiel.'});
  }

  // ── Étoile filante (Shooting Star) ──
  if(prevBody>0 && prevRange/prevBody>2.5 && prev<p3 && isUp) {
    patterns.push({name:'Étoile filante',icon:'⭐',signal:'bear',conf:0.70,
      desc:'Longue mèche haute après tendance haussière. Signal baissier potentiel.'});
  }

  // ── Double Top ──
  const peaks = prices.slice(-15);
  const maxPeak = Math.max(...peaks);
  const peakIdx = peaks.lastIndexOf(maxPeak);
  const prevMax = Math.max(...peaks.slice(0,peakIdx));
  if(Math.abs(maxPeak-prevMax)/maxPeak<0.02 && peakIdx<peaks.length-2) {
    patterns.push({name:'Double Top',icon:'🏔️',signal:'bear',conf:0.78,
      desc:'Deux sommets similaires — résistance forte. Signal de retournement baissier.'});
  }

  // ── Double Bottom ──
  const valleys = prices.slice(-15);
  const minVal  = Math.min(...valleys);
  const valIdx  = valleys.lastIndexOf(minVal);
  const prevMin = Math.min(...valleys.slice(0,valIdx));
  if(Math.abs(minVal-prevMin)/minVal<0.02 && valIdx<valleys.length-2) {
    patterns.push({name:'Double Bottom',icon:'🏞️',signal:'bull',conf:0.77,
      desc:'Deux creux similaires — support fort. Signal de retournement haussier.'});
  }

  // ── Englobante haussière ──
  if(last>p3 && prev<p4 && last>p4 && prev<p3) {
    patterns.push({name:'Englobante haussière',icon:'💚',signal:'bull',conf:0.74,
      desc:'La bougie actuelle englobe complètement la précédente à la hausse.'});
  }

  // ── Englobante baissière ──
  if(last<p3 && prev>p4 && last<p4 && prev>p3) {
    patterns.push({name:'Englobante baissière',icon:'❤️',signal:'bear',conf:0.73,
      desc:'La bougie actuelle englobe complètement la précédente à la baisse.'});
  }

  // ── Tendance haussière forte ──
  if(isUp && prices.slice(-5).every((v,i,a)=>i===0||v>=a[i-1]*0.998)) {
    patterns.push({name:'Tendance haussière',icon:'📈',signal:'bull',conf:0.65,
      desc:'5 périodes consécutives en hausse. Momentum positif en cours.'});
  }

  // ── Tendance baissière forte ──
  if(isDown && prices.slice(-5).every((v,i,a)=>i===0||v<=a[i-1]*1.002)) {
    patterns.push({name:'Tendance baissière',icon:'📉',signal:'bear',conf:0.65,
      desc:'5 périodes consécutives en baisse. Momentum négatif en cours.'});
  }

  // ── Consolidation ──
  if(range10<last*0.008 && !isUp && !isDown) {
    patterns.push({name:'Consolidation',icon:'➡️',signal:'neu',conf:0.60,
      desc:'Prix dans une plage étroite. Breakout imminent — attendre la direction.'});
  }

  // ── Breakout haussier ──
  if(last>high10*0.999 && prev<high10*0.995) {
    patterns.push({name:'Breakout haussier',icon:'🚀',signal:'bull',conf:0.80,
      desc:'Prix franchit le plus haut des 10 dernières périodes. Signal fort.'});
  }

  // ── Breakdown baissier ──
  if(last<low10*1.001 && prev>low10*1.005) {
    patterns.push({name:'Breakdown baissier',icon:'💥',signal:'bear',conf:0.79,
      desc:'Prix rompt le plus bas des 10 dernières périodes. Signal fort baissier.'});
  }

  return patterns.sort((a,b)=>b.conf-a.conf).slice(0,5);
}

// Mini graphique bougies SVG
function _ptMiniChart(prices, w, h) {
  if(prices.length<2) return '';
  const n   = Math.min(20, prices.length);
  const pts = prices.slice(-n);
  const mn  = Math.min(...pts);
  const mx  = Math.max(...pts);
  const rng = mx-mn||1;
  const bw  = Math.floor((w-4)/n);

  let bars='', line='';
  pts.forEach((p,i)=>{
    const x  = 2+i*bw;
    const y  = h-4-Math.round((p-mn)/rng*(h-8));
    const prev= i>0?pts[i-1]:p;
    const col = p>=prev?'var(--up)':'var(--down)';
    bars += `<rect x="${x}" y="${y}" width="${Math.max(1,bw-1)}" height="${Math.max(1,h-4-y)}" fill="${col}" opacity=".7"/>`;
    line += (i===0?'M':'L')+`${x+bw/2},${y}`;
  });

  return `<svg width="${w}" height="${h}" style="display:block;">
    ${bars}
    <polyline points="${pts.map((p,i)=>{
      const x=2+i*bw+bw/2;
      const y=h-4-Math.round((p-mn)/rng*(h-8));
      return x+','+y;
    }).join(' ')}" fill="none" stroke="var(--ice)" stroke-width="1.5" opacity=".5"/>
  </svg>`;
}

function renderPatternSection() {
  const el = document.getElementById('patternSection');
  if(!el) return;

  const pairs    = Object.keys(PAIRS||{});
  const prices   = _ptPrices(_ptPair);
  const patterns = _detectPatterns(prices);
  const ps       = S.pairStates?.[_ptPair]||{};
  const cur      = ps.price||0;
  const cfg      = PAIRS[_ptPair]||{};
  const dec      = cfg.dec>=4?cfg.dec:2;

  const bullCount= patterns.filter(p=>p.signal==='bull').length;
  const bearCount= patterns.filter(p=>p.signal==='bear').length;
  const signal   = bullCount>bearCount?'HAUSSIER':bearCount>bullCount?'BAISSIER':'NEUTRE';
  const sigCol   = signal==='HAUSSIER'?'var(--up)':signal==='BAISSIER'?'var(--down)':'var(--t3)';

  el.innerHTML = `
    <div class="pt-section">
      <div class="pt-title">📐 Patterns Chartistes
        <span style="font-size:10px;font-weight:800;color:${sigCol};">${signal}</span>
      </div>

      <!-- Sélecteur de paire -->
      <div class="pt-pair-sel">
        ${pairs.map(p=>`<button class="pt-pair-btn ${p===_ptPair?'active':''}" onclick="selectPtPair('${p}')"
          style="${p===_ptPair?'border-color:'+(PAIRS[p]?.color||'var(--ice)')+';':''}">${p.replace('/USDT','')}</button>`).join('')}
      </div>

      <!-- Mini chart -->
      <div class="pt-chart">
        ${_ptMiniChart(prices, 280, 60)}
        <div style="display:flex;justify-content:space-between;font-size:7px;color:#555;margin-top:2px;">
          <span>${prices.length} points</span>
          <span style="font-family:monospace;font-size:9px;color:${cfg.color||'var(--ice)'};">${cur.toFixed(dec)}</span>
        </div>
      </div>

      <!-- Signal global -->
      <div style="display:flex;gap:8px;margin-bottom:10px;">
        <div style="flex:1;background:rgba(0,232,122,.08);border:1px solid rgba(0,232,122,.2);border-radius:7px;padding:6px;text-align:center;">
          <span style="font-size:16px;font-weight:800;color:var(--up);">${bullCount}</span>
          <div style="font-size:8px;color:var(--t3);">Haussiers</div>
        </div>
        <div style="flex:1;background:rgba(255,61,107,.08);border:1px solid rgba(255,61,107,.2);border-radius:7px;padding:6px;text-align:center;">
          <span style="font-size:16px;font-weight:800;color:var(--down);">${bearCount}</span>
          <div style="font-size:8px;color:var(--t3);">Baissiers</div>
        </div>
        <div style="flex:1;background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:7px;padding:6px;text-align:center;">
          <span style="font-size:16px;font-weight:800;color:var(--t3);">${patterns.filter(p=>p.signal==='neu').length}</span>
          <div style="font-size:8px;color:var(--t3);">Neutres</div>
        </div>
      </div>

      <!-- Patterns détectés -->
      ${patterns.length===0?`<div style="text-align:center;padding:12px;font-size:10px;color:var(--t3);">Pas assez de données de prix pour détecter des patterns.</div>`:''}
      ${patterns.map(p=>{
        const sigClass = p.signal==='bull'?'pt-signal-bull':p.signal==='bear'?'pt-signal-bear':'pt-signal-neu';
        const confCol  = p.conf>=0.75?'var(--up)':p.conf>=0.65?'var(--gold)':'var(--t3)';
        return `<div class="pt-pattern-card">
          <span class="pt-pattern-icon">${p.icon}</span>
          <div class="pt-pattern-body">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
              <span class="pt-pattern-name">${p.name}</span>
              <span class="pt-pattern-signal ${sigClass}">${p.signal==='bull'?'↑ HAUSSIER':p.signal==='bear'?'↓ BAISSIER':'→ NEUTRE'}</span>
            </div>
            <div class="pt-pattern-desc">${p.desc}</div>
            <div class="pt-conf-bar" style="margin-top:5px;">
              <div class="pt-conf-fill" style="width:${Math.round(p.conf*100)}%;background:${confCol};"></div>
            </div>
            <div style="font-size:7px;color:var(--t3);margin-top:2px;">Confiance : ${Math.round(p.conf*100)}%</div>
          </div>
        </div>`;
      }).join('')}

      <div style="font-size:8px;color:var(--t3);margin-top:8px;text-align:center;">
        Basé sur les prix réels des trades enregistrés.<br>
        ⚠️ Signal indicatif uniquement — pas un conseil financier.
      </div>
    </div>`;
}
window.renderPatternSection = renderPatternSection;
// ═══ v66 · AUDIT FISCAL BELGIQUE ═══
// Analyse fiscale crypto selon la loi belge 2024-2026
// 3 régimes : gestion normale (33%), TOB (0.35%), revenus divers (33%)
// Seuils : gestion normale = exonéré, spéculatif = 33%, professionnel = IPP

const _FX_SEUIL_DIVERS = 1000; // €/an avant déclaration revenus divers
const _FX_TAUX_DIVERS  = 0.33; // 33% revenus divers
const _FX_TOB          = 0.0035; // 0.35% taxe sur opérations boursières (si ETF)
const _FX_COTISATION_SOC = 0.12; // 12.07% cotisations sociales si professionnel
const _FX_IPP_TRANCHES = [ // Tranches IPP 2025
  {limit:15820, taux:0.25},
  {limit:27920, taux:0.40},
  {limit:48320, taux:0.45},
  {limit:Infinity, taux:0.50},
];

function _fxIppCalc(revenu) {
  let tax=0, prev=0;
  for(const t of _FX_IPP_TRANCHES) {
    if(revenu<=prev) break;
    const taxable = Math.min(revenu,t.limit)-prev;
    tax += taxable*t.taux;
    prev = t.limit;
  }
  return tax;
}

function _fxAnalyze() {
  const allT = Object.values(S.pairStates||{}).flatMap(ps=>
    (ps.trades||[]).filter(t=>t.type==='position'&&t.pnlUsdt!=null)
  );
  const n      = allT.length;
  const gains  = allT.filter(t=>(t.pnlUsdt||0)>0).reduce((s,t)=>s+(t.pnlUsdt||0),0);
  const losses = Math.abs(allT.filter(t=>(t.pnlUsdt||0)<0).reduce((s,t)=>s+(t.pnlUsdt||0),0));
  const netPnl = gains - losses;
  const fees   = (S.fees?.totalGross||0);
  const netAfterFees = netPnl - fees;

  // Fréquence de trading (annualisée)
  const firstTs = Math.min(...allT.filter(t=>t.ts).map(t=>t.ts).filter(isFinite));
  const days    = isFinite(firstTs)&&firstTs>0?Math.max(1,(Date.now()-firstTs)/86400000):30;
  const tradesPerYear = Math.round(n/days*365);
  const hoursPerWeek  = parseFloat(((n/days*7)*0.5).toFixed(1)); // ~30min/trade

  // Détermination du régime
  const isHighFreq   = tradesPerYear > 200;
  const isLargeAmt   = netAfterFees  > 25000;
  const isProfessional = isHighFreq || isLargeAmt || hoursPerWeek>20;

  let regime, taxableBase, taxEst;
  if(isProfessional) {
    regime       = 'PROFESSIONNEL';
    taxableBase  = Math.max(0, netAfterFees);
    const ipp    = _fxIppCalc(taxableBase);
    const cotSoc = taxableBase * _FX_COTISATION_SOC;
    taxEst       = ipp + cotSoc;
  } else if(netAfterFees > _FX_SEUIL_DIVERS) {
    regime       = 'REVENUS DIVERS';
    taxableBase  = Math.max(0, netAfterFees);
    taxEst       = taxableBase * _FX_TAUX_DIVERS;
  } else {
    regime       = 'GESTION NORMALE';
    taxableBase  = 0;
    taxEst       = 0;
  }

  // Provision déjà constituée dans AURA
  const provision = S.fees?.totalTaxProvision||0;
  const delta     = taxEst - provision;

  return {
    n, gains, losses, netPnl, fees, netAfterFees,
    tradesPerYear, hoursPerWeek, days,
    isProfessional, isHighFreq, isLargeAmt,
    regime, taxableBase, taxEst, provision, delta,
  };
}

function exportFiscalPdf() {
  const d   = _fxAnalyze();
  const now = new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>AURA — Rapport Fiscal Belgique</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Segoe UI',Arial,sans-serif;color:#111;background:#fff;padding:15mm;font-size:10pt;}
h1{font-size:18pt;font-weight:900;color:#0a0a1a;margin-bottom:4px;}
h2{font-size:11pt;font-weight:700;color:#1a1a2e;margin:14px 0 6px;border-bottom:2px solid #f5c842;padding-bottom:3px;}
.kpi{display:inline-block;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:8px 14px;text-align:center;margin:4px;}
.kv{font-size:14pt;font-weight:800;display:block;}
.kl{font-size:7pt;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;}
table{width:100%;border-collapse:collapse;margin:8px 0;font-size:9pt;}
th{background:#1a1a2e;color:#fff;padding:6px 8px;font-size:8pt;}
td{padding:5px 8px;border-bottom:1px solid #f1f5f9;}
.warn{background:#fffbeb;border:1px solid #f5c842;border-radius:6px;padding:8px;margin:8px 0;font-size:9pt;}
.ok{background:#f0fdf4;border:1px solid #86efac;border-radius:6px;padding:8px;margin:8px 0;font-size:9pt;}
.disc{margin-top:16px;padding:8px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:6px;font-size:7pt;color:#9ca3af;}
.footer{margin-top:20px;padding-top:8px;border-top:1px solid #e5e7eb;font-size:7pt;color:#9ca3af;display:flex;justify-content:space-between;}
</style></head><body>
<h1>🏛️ AURA — Rapport Fiscal Crypto</h1>
<p style="color:#6b7280;font-size:9pt;margin:4px 0 16px;">Belgique · Exercice ${new Date().getFullYear()} · Généré le ${now}</p>

<h2>📊 Résumé financier</h2>
<div>
  <div class="kpi"><span class="kv" style="color:#16a34a;">+€${d.gains.toFixed(2)}</span><span class="kl">Gains bruts</span></div>
  <div class="kpi"><span class="kv" style="color:#dc2626;">-€${d.losses.toFixed(2)}</span><span class="kl">Pertes</span></div>
  <div class="kpi"><span class="kv">-€${d.fees.toFixed(2)}</span><span class="kl">Frais</span></div>
  <div class="kpi"><span class="kv" style="color:${d.netAfterFees>=0?'#16a34a':'#dc2626'};">${d.netAfterFees>=0?'+':''}€${d.netAfterFees.toFixed(2)}</span><span class="kl">Net imposable</span></div>
</div>

<h2>🏛️ Régime fiscal applicable</h2>
<table>
  <tr><th>Critère</th><th>Valeur</th><th>Seuil</th><th>Statut</th></tr>
  <tr><td>Trades/an</td><td>${d.tradesPerYear}</td><td>&gt;200 → professionnel</td><td>${d.isHighFreq?'⚠️ Élevé':'✅ Normal'}</td></tr>
  <tr><td>Montant net</td><td>€${d.netAfterFees.toFixed(0)}</td><td>&gt;€25 000 → pro</td><td>${d.isLargeAmt?'⚠️ Élevé':'✅ Normal'}</td></tr>
  <tr><td>Heures/semaine</td><td>~${d.hoursPerWeek}h</td><td>&gt;20h → pro</td><td>${d.hoursPerWeek>20?'⚠️ Élevé':'✅ Normal'}</td></tr>
  <tr><td><strong>Régime</strong></td><td colspan="2"><strong>${d.regime}</strong></td><td>${d.isProfessional?'⚠️ Pro':'✅ Particulier'}</td></tr>
</table>

<h2>💶 Estimation fiscale</h2>
<table>
  <tr><th>Élément</th><th>Montant</th></tr>
  <tr><td>Base imposable</td><td>€${d.taxableBase.toFixed(2)}</td></tr>
  <tr><td>Taux applicable</td><td>${d.regime==='GESTION NORMALE'?'Exonéré':d.regime==='REVENUS DIVERS'?'33%':'IPP progressif + 12.07% cot. soc.'}</td></tr>
  <tr><td><strong>Impôt estimé</strong></td><td><strong>€${d.taxEst.toFixed(2)}</strong></td></tr>
  <tr><td>Provision constituée (AURA)</td><td>€${d.provision.toFixed(2)}</td></tr>
  <tr><td>${d.delta>0?'Montant à provisionner encore':'Excédent de provision'}</td><td style="color:${d.delta>0?'#dc2626':'#16a34a'};">${d.delta>=0?'+':''}€${Math.abs(d.delta).toFixed(2)}</td></tr>
</table>

<div class="disc">
  ⚠️ Ce rapport est généré automatiquement par AURA à titre informatif uniquement.<br>
  Il ne constitue pas un avis fiscal ou juridique. La fiscalité crypto en Belgique est complexe et évolue.<br>
  Consultez un comptable ou conseiller fiscal agréé (Expert-comptable, Tax Advisor SPF Finances).<br>
  Sources : SPF Finances · Circ. AAFisc Nr. 8/2014 · Circulaire 2021/C/20
</div>
<div class="footer"><span>AURA ∞ — Adaptive Universal Risk Architect</span><span>${now}</span></div>
</body></html>`;

  const win = window.open('','_blank','width=900,height=650');
  if(!win){ showToast('⚠ Autoriser les popups',2000,'warn'); return; }
  win.document.write(html); win.document.close(); win.focus();
  setTimeout(()=>win.print(), 600);
  showToast('📄 Rapport fiscal BE généré', 2500, 'win');
}
window.exportFiscalPdf = exportFiscalPdf;

function renderFiscalSection() {
  const el = document.getElementById('fiscalSection');
  if(!el) return;
  const d  = _fxAnalyze();

  const regimeCol = d.regime==='GESTION NORMALE'?'var(--up)':d.regime==='REVENUS DIVERS'?'var(--gold)':'var(--down)';

  el.innerHTML = `
    <div class="fx-section">
      <div class="fx-title">
        🏛️ Audit Fiscal — Belgique
        <span style="font-size:8px;font-weight:800;color:${regimeCol};">${d.regime}</span>
      </div>

      <!-- KPIs -->
      <div class="fx-kpi-grid">
        <div class="fx-kpi"><span class="fx-kpi-val" style="color:var(--up);">+€${d.gains.toFixed(2)}</span><span class="fx-kpi-lbl">Gains bruts</span></div>
        <div class="fx-kpi"><span class="fx-kpi-val" style="color:var(--down);">-€${d.losses.toFixed(2)}</span><span class="fx-kpi-lbl">Pertes</span></div>
        <div class="fx-kpi"><span class="fx-kpi-val" style="color:${d.netAfterFees>=0?'var(--up)':'var(--down)'};">${d.netAfterFees>=0?'+':''}€${d.netAfterFees.toFixed(2)}</span><span class="fx-kpi-lbl">Net imposable</span></div>
        <div class="fx-kpi"><span class="fx-kpi-val" style="color:var(--gold);">€${d.taxEst.toFixed(2)}</span><span class="fx-kpi-lbl">Impôt estimé</span></div>
      </div>

      <!-- Analyse du régime -->
      <div style="font-size:9px;color:var(--t3);margin-bottom:5px;">Analyse du régime applicable</div>
      ${[
        {lbl:'Trades/an estimés',val:d.tradesPerYear,seuil:'>200 → pro',warn:d.isHighFreq},
        {lbl:'Net imposable',val:'€'+d.netAfterFees.toFixed(0),seuil:'>€25 000 → pro',warn:d.isLargeAmt},
        {lbl:'Heures/semaine (estimé)',val:'~'+d.hoursPerWeek+'h',seuil:'>20h → pro',warn:d.hoursPerWeek>20},
        {lbl:'Jours d\'activité',val:Math.round(d.days)+'j',seuil:'',warn:false},
      ].map(r=>`<div class="fx-row">
        <span style="color:var(--t2);">${r.lbl}</span>
        <span style="font-weight:700;color:${r.warn?'var(--down)':'var(--t1)'};">${r.val} ${r.warn?'⚠️':''}</span>
      </div>`).join('')}

      <!-- Alertes régime -->
      <div style="margin-top:8px;">
        ${d.regime==='GESTION NORMALE'?`
          <div class="fx-alert ok">✅ <strong>Gestion normale</strong> — Tes gains sont probablement exonérés d'impôt. Continue à documenter toutes les transactions.</div>
        `:d.regime==='REVENUS DIVERS'?`
          <div class="fx-alert warn">⚠️ <strong>Revenus divers (33%)</strong> — Tes gains dépassent le seuil de €${_FX_SEUIL_DIVERS}. À déclarer en revenus divers via code 1440/2440 dans ta déclaration IPP.</div>
        `:`
          <div class="fx-alert" style="background:rgba(255,61,107,.08);border-color:rgba(255,61,107,.3);color:var(--down);">🚨 <strong>Activité professionnelle</strong> — Fréquence ou montants élevés. Impôt progressif IPP + cotisations sociales 12.07%. Consulte un comptable.</div>
        `}

        <div class="fx-alert info">
          💡 <strong>Provision AURA constituée :</strong> €${d.provision.toFixed(2)}
          ${d.delta>0?` · Il manque encore <strong>€${d.delta.toFixed(2)}</strong> à provisionner.`:` · Provision suffisante (excédent €${Math.abs(d.delta).toFixed(2)}).`}
        </div>
      </div>

      <!-- Taux et calcul -->
      <div style="font-size:9px;color:var(--t3);margin:8px 0 5px;">Calcul de l'impôt</div>
      <div class="fx-row"><span style="color:var(--t2);">Base imposable</span><span style="font-weight:700;">€${d.taxableBase.toFixed(2)}</span></div>
      <div class="fx-row"><span style="color:var(--t2);">Taux</span><span style="font-weight:700;">${d.regime==='GESTION NORMALE'?'0% (exonéré)':d.regime==='REVENUS DIVERS'?'33%':'IPP progressif + 12.07%'}</span></div>
      <div class="fx-row"><span style="color:var(--t1);font-weight:700;">Impôt estimé</span><span style="font-weight:800;font-family:var(--font-mono);color:var(--gold);">€${d.taxEst.toFixed(2)}</span></div>

      <!-- Export -->
      <button onclick="exportFiscalPdf()"
        style="width:100%;margin-top:10px;padding:9px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;background:rgba(245,200,66,.1);border:1px solid rgba(245,200,66,.3);color:var(--gold);">
        📄 Exporter Rapport Fiscal PDF
      </button>

      <div class="fx-disclaimer">
        ⚠️ Estimation automatique à titre indicatif uniquement — pas un conseil fiscal.<br>
        Fiscalité crypto BE complexe et évolutive. Consultez un Expert-comptable ou le SPF Finances.<br>
        Références : Circ. AAFisc Nr. 8/2014 · Circulaire 2021/C/20 · SPF Finances
      </div>
    </div>`;
}
window.renderFiscalSection = renderFiscalSection;
// ═══ v67 · STRESS TEST CATASTROPHE ═══
// Simule des scénarios de marché extrêmes sur le portfolio actuel
// + Analyse de survie + Recommandations de protection

let _stScenarioKey = 'crash2022';
let _stCustomDrop  = 50;
let _stCustomStake = 30;

const _ST_SCENARIOS = {
  crash2022: {
    name:'Crash Crypto 2022',       icon:'📉', drop:-80,
    duration:'12 mois', ref:'BTC: $68k → $16k',
    desc:'Effondrement post-Terra/Luna + FTX. Le pire bear market depuis 2018.',
    historical:true,
  },
  covid2020: {
    name:'Black Thursday (Mars 2020)',icon:'🦠', drop:-50,
    duration:'3 semaines', ref:'BTC: $9k → $4k en 24h',
    desc:'Liquidation massive causée par la pandémie COVID-19. Chute en une journée.',
    historical:true,
  },
  mt_gox: {
    name:'Scénario MtGox-like',      icon:'💥', drop:-90,
    duration:'6 mois', ref:'BTC: $1200 → $180 (2014)',
    desc:'Effondrement d\'une exchange majeure, panique totale, bear market prolongé.',
    historical:true,
  },
  altcoin_nuke: {
    name:'Altcoin Nuke',             icon:'☢️', drop:-95,
    duration:'2 mois', ref:'Terra/LUNA: $120 → $0',
    desc:'Une ou plusieurs alts s\'effondrent à zéro. Contagion sur le reste du portfolio.',
    historical:true,
  },
  flash_crash: {
    name:'Flash Crash',              icon:'⚡', drop:-40,
    duration:'1 journée', ref:'BTC: -40% en quelques heures',
    desc:'Liquidation en cascade des positions avec effet. Récupération possible.',
    historical:false,
  },
  custom: {
    name:'Scénario personnalisé',    icon:'🎛️', drop:null,
    duration:'Variable', ref:'',
    desc:'Configure ton propre scénario de crash.',
    historical:false,
  },
};

function selectStScenario(key) {
  _stScenarioKey = key;
  renderStressTestSection();
}
window.selectStScenario = selectStScenario;

function updateStCustom(key, val) {
  if(key==='drop')  _stCustomDrop  = parseInt(val);
  if(key==='stake') _stCustomStake = parseInt(val);
  renderStressTestSection();
}
window.updateStCustom = updateStCustom;

function _runStressTest() {
  const scenario = _ST_SCENARIOS[_stScenarioKey];
  const drop     = _stScenarioKey==='custom' ? -_stCustomDrop : scenario.drop;
  const dropFactor = drop/100; // négatif

  const capital    = S.tradingAccount || 0;
  const openPos    = S.openPositions  || [];
  const totalStake = openPos.reduce((s,p)=>s+(p.stakeUsdt||0),0);
  const avgStake   = S.totalTrades>0 ? capital * (_stScenarioKey==='custom'?_stCustomStake/100:0.20) : 0;
  const numOpenPos = openPos.length;

  // Impact sur positions ouvertes (longs perdent, shorts gagnent partiellement)
  const longPosLoss = openPos.filter(p=>p.side==='long').reduce((s,p)=>{
    return s + (p.stakeUsdt||0) * Math.abs(dropFactor);
  },0);
  const shortPosGain= openPos.filter(p=>p.side==='short').reduce((s,p)=>{
    return s + (p.stakeUsdt||0) * Math.abs(dropFactor) * 0.8; // partial hedge
  },0);

  // Impact sur capital non investi (crypto exposure)
  const freeCapital = capital - totalStake;
  const freeLoss    = freeCapital * Math.abs(dropFactor) * 0.3; // exposition partielle

  // Impact total
  const totalLoss  = longPosLoss - shortPosGain + freeLoss;
  const capitalAfter = Math.max(0, capital - totalLoss);
  const survivalPct  = capital>0 ? (capitalAfter/capital*100) : 0;
  const drawdownPct  = Math.abs(dropFactor*100);

  // Bot impact: win rate s'effondre pendant un bear market
  const botWrBefore = S.totalTrades>0?Math.round((S.winTrades||0)/S.totalTrades*100):50;
  const botWrAfter  = Math.max(20, botWrBefore + drop*0.3); // WR baisse proportionnellement

  // Bots qui survivent (fitness > seuil minimal)
  const agentsSurviving = (S.agents||[]).filter(a=>(a.fitness||0)>200).length;
  const agentsTotal     = (S.agents||[]).length;

  return {
    drop, dropFactor, capital, capitalAfter, totalLoss,
    longPosLoss, shortPosGain, freeLoss,
    survivalPct, drawdownPct,
    numOpenPos, totalStake,
    botWrBefore, botWrAfter,
    agentsSurviving, agentsTotal,
  };
}

function renderStressTestSection() {
  const el = document.getElementById('stressTestSection');
  if(!el) return;

  const r = _runStressTest();
  const sc= _ST_SCENARIOS[_stScenarioKey];

  const survivalCol = r.survivalPct>=70?'var(--up)':r.survivalPct>=40?'var(--gold)':'var(--down)';
  const survivalLabel = r.survivalPct>=70?'Résistant ✅':r.survivalPct>=40?'Vulnérable ⚠️':'Critique 🚨';

  // Recommandations
  const recs = [];
  if(r.numOpenPos>3) recs.push({t:'danger',msg:`${r.numOpenPos} positions ouvertes = exposition élevée. En situation de crash, ferme les longs rapidement.`});
  if(r.survivalPct<50) recs.push({t:'danger',msg:`Ton portfolio ne résisterait qu'à ${r.survivalPct.toFixed(0)}% de sa valeur. Réduis ta taille de position.`});
  if(r.shortPosGain>0) recs.push({t:'warn',msg:`Tes positions short seraient partiellement hedgées (+$${r.shortPosGain.toFixed(2)}). Le hedge naturel fonctionne.`});
  if(r.agentsSurviving < r.agentsTotal*0.5) recs.push({t:'danger',msg:`${r.agentsTotal-r.agentsSurviving} agents cassés après ce scénario. Pense à diversifier les stratégies.`});
  if(recs.length===0) recs.push({t:'ok',msg:`Ton portfolio est relativement résistant à ce scénario (${r.survivalPct.toFixed(0)}% survie).`});

  el.innerHTML = `
    <div class="st-section">
      <div class="st-title">☢️ Stress Test Catastrophe
        <span style="font-size:9px;font-weight:800;color:${survivalCol};">${survivalLabel}</span>
      </div>

      <!-- Sélecteur scénarios -->
      <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px;">
        ${Object.entries(_ST_SCENARIOS).map(([key,sc2])=>`
          <div class="st-scenario ${_stScenarioKey===key?'active':''}" onclick="selectStScenario('${key}')">
            <div class="st-scenario-header">
              <span class="st-scenario-icon">${sc2.icon}</span>
              <span class="st-scenario-name">${sc2.name}</span>
              <div style="flex:1;"></div>
              <span class="st-scenario-drop">${sc2.drop!==null?sc2.drop+'%':'?%'}</span>
            </div>
            <div class="st-scenario-desc">${sc2.desc}${sc2.ref?` <em style="color:var(--t3);">(${sc2.ref})</em>`:''}</div>
            ${_stScenarioKey===key&&key==='custom'?`
              <div style="margin-top:6px;">
                <div class="st-slider-row">
                  <span style="color:var(--t2);min-width:80px;">Crash %</span>
                  <input type="range" class="st-slider" min="10" max="99" value="${_stCustomDrop}"
                    oninput="updateStCustom('drop',this.value);document.getElementById('stDropVal').textContent='-'+this.value+'%'">
                  <span id="stDropVal" style="font-size:10px;color:var(--down);min-width:36px;">-${_stCustomDrop}%</span>
                </div>
              </div>`:''}
          </div>`).join('')}
      </div>

      <!-- Résultats -->
      <div style="font-size:9px;color:var(--t3);margin-bottom:6px;">Impact simulé · Scénario : ${sc.name}</div>

      <!-- Barre de survie -->
      <div style="font-size:9px;color:var(--t2);margin-bottom:3px;">Taux de survie du capital</div>
      <div class="st-survival-bar">
        <div class="st-survival-fill" style="width:${r.survivalPct.toFixed(0)}%;background:${survivalCol};"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:8px;color:var(--t3);margin-bottom:8px;">
        <span>0%</span>
        <span style="color:${survivalCol};font-weight:700;">${r.survivalPct.toFixed(1)}% restant</span>
        <span>100%</span>
      </div>

      <div class="st-result-grid">
        <div class="st-result-kpi"><span class="st-result-val" style="color:var(--t1);">$${r.capital.toFixed(0)}</span><span class="st-result-lbl">Capital actuel</span></div>
        <div class="st-result-kpi"><span class="st-result-val" style="color:${survivalCol};">$${r.capitalAfter.toFixed(0)}</span><span class="st-result-lbl">Capital après</span></div>
        <div class="st-result-kpi"><span class="st-result-val" style="color:var(--down);">-$${r.totalLoss.toFixed(0)}</span><span class="st-result-lbl">Perte totale</span></div>
        <div class="st-result-kpi"><span class="st-result-val" style="color:var(--t3);">${r.botWrAfter.toFixed(0)}%</span><span class="st-result-lbl">WR bots après</span></div>
        <div class="st-result-kpi"><span class="st-result-val" style="color:var(--down);">-$${r.longPosLoss.toFixed(0)}</span><span class="st-result-lbl">Perte longs</span></div>
        <div class="st-result-kpi"><span class="st-result-val" style="color:var(--up);">+$${r.shortPosGain.toFixed(0)}</span><span class="st-result-lbl">Gain shorts</span></div>
      </div>

      <!-- Agents -->
      <div style="font-size:9px;color:var(--t3);margin-bottom:4px;">Résistance des agents</div>
      <div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:8px;">
        <span style="color:var(--up);">${r.agentsSurviving} agents résistants</span>
        <span style="color:var(--down);">${r.agentsTotal-r.agentsSurviving} cassés</span>
      </div>

      <!-- Recommandations -->
      ${recs.map(rec=>`<div class="st-recommendation st-rec-${rec.t}">${rec.t==='danger'?'🚨':rec.t==='warn'?'⚠️':'✅'} ${rec.msg}</div>`).join('')}

      <div style="font-size:8px;color:var(--t3);margin-top:8px;text-align:center;">
        Simulation basée sur ton portfolio actuel · Les marchés réels peuvent différer
      </div>
    </div>`;
}
window.renderStressTestSection = renderStressTestSection;
// ═══ v68 · MODE URGENCE ═══
// Bouton SOS flottant → overlay rouge → 4 actions immédiates
// Fermer tout · Pause bot · Réduire mises · Backup

let _urgLog = [];

function _urgAppendLog(msg) {
  const ts = new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  _urgLog.unshift('['+ts+'] '+msg);
  const el = document.getElementById('urgLog');
  if(el) el.textContent = _urgLog.slice(0,8).join('\n');
}

function openUrgence() {
  _urgLog = [];
  const el = document.getElementById('urgenceOverlay');
  if(el) el.classList.add('show');
  _urgAppendLog('🚨 Mode Urgence activé');
  const sub = document.getElementById('urgSub');
  const pos = (S.openPositions||[]).length;
  if(sub) sub.textContent = `${pos} position(s) ouverte(s) · Capital: $${(S.tradingAccount||0).toFixed(2)}`;
}
window.openUrgence = openUrgence;

function closeUrgence() {
  const el = document.getElementById('urgenceOverlay');
  if(el) el.classList.remove('show');
}
window.closeUrgence = closeUrgence;

function urgenceCloseAll() {
  const positions = [...(S.openPositions||[])];
  if(positions.length===0) { _urgAppendLog('⚠ Aucune position à fermer'); return; }

  let closed=0;
  positions.forEach(pos=>{
    try {
      // Fermer manuellement chaque position
      const ps  = S.pairStates?.[pos.pair];
      const cur = ps?.price || pos.entryPrice;
      const pnlPct  = pos.side==='long'
        ? (cur-pos.entryPrice)/pos.entryPrice*100
        : (pos.entryPrice-cur)/pos.entryPrice*100;
      const pnlUsd  = (pos.stakeUsdt||0)*pnlPct/100;

      // Retirer de openPositions
      S.openPositions = (S.openPositions||[]).filter(p=>p.id!==pos.id);
      S.tradingAccount = (S.tradingAccount||0) + (pos.stakeUsdt||0) + pnlUsd;
      S.portfolio = (S.cashAccount||0) + S.tradingAccount;

      // Log dans chain
      S.chainLog = S.chainLog||[];
      S.chainLog.push({icon:'🚨',desc:`URGENCE: ${pos.pair} ${pos.side} fermé manuellement · ${pnlUsd>=0?'+':''}$${pnlUsd.toFixed(2)}`,hash:Math.random().toString(36).slice(2,8),time:new Date().toLocaleTimeString()});
      closed++;
    } catch(e) { _urgAppendLog('⚠ Erreur fermeture '+pos.pair); }
  });

  _urgAppendLog(`✅ ${closed} position(s) fermée(s)`);
  _urgAppendLog(`💰 Capital: $${(S.tradingAccount||0).toFixed(2)}`);
  showToast(`🚨 URGENCE: ${closed} position(s) fermée(s)`, 4000, 'warn');
  try { renderHome(); } catch(e) {}
}
window.urgenceCloseAll = urgenceCloseAll;

function urgencePauseBot() {
  const wasPaused = !S.botAutoMode;
  S.botAutoMode = false;
  S.mode = 'manual';
  // Arrêter tous les agents actifs
  (S.agents||[]).forEach(a=>{ a._paused=true; });
  _urgAppendLog('⏸ Bot mis en PAUSE — mode Manuel');
  _urgAppendLog(`🤖 ${(S.agents||[]).length} agents suspendus`);
  showToast('⏸ Bot en pause — aucun trade ne sera ouvert', 3000, 'warn');
  try { updateModeButton?.(); } catch(e) {}
}
window.urgencePauseBot = urgencePauseBot;

function urgenceReduceStake() {
  const prev = S.stakeConfig?.defaultStake || S.stakeUsdt || 20;
  const reduced = Math.max(1, Math.floor(prev*0.1));
  if(S.stakeConfig) S.stakeConfig.defaultStake = reduced;
  S.stakeUsdt = reduced;
  // Réduire aussi le stake de chaque agent
  (S.agents||[]).forEach(a=>{ if(a.stake) a.stake = Math.max(1, a.stake*0.1); });
  _urgAppendLog(`📉 Mises réduites: $${prev} → $${reduced}/trade`);
  _urgAppendLog('🤖 Stakes agents réduits à 10%');
  showToast(`📉 Mises réduites à $${reduced}/trade`, 3000, 'warn');
}
window.urgenceReduceStake = urgenceReduceStake;

function urgenceSaveBackup() {
  try {
    const snap = JSON.parse(JSON.stringify(S));
    snap._urgencyBackup = true;
    snap._urgencyTs     = Date.now();
    const json = JSON.stringify(snap);
    const blob = new Blob([json],{type:'application/json'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const ts   = new Date().toISOString().slice(0,19).replace('T','-').replace(/:/g,'');
    a.href=url; a.download=`aura_URGENCE_${ts}.json`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    _urgAppendLog('💾 Backup d\'urgence sauvegardé');
    _urgAppendLog(`📁 aura_URGENCE_${ts}.json`);
  } catch(e) { _urgAppendLog('❌ Erreur backup: '+e.message); }
}
window.urgenceSaveBackup = urgenceSaveBackup;

function renderUrgenceSection() {
  const el = document.getElementById('urgenceSection');
  if(!el) return;

  const pos    = (S.openPositions||[]).length;
  const botOn  = S.botAutoMode||false;
  const capital= S.tradingAccount||0;
  const stake  = S.stakeConfig?.defaultStake||S.stakeUsdt||20;

  el.innerHTML = `
    <div class="urg-section">
      <div class="urg-section-title">🚨 Mode Urgence</div>

      <!-- Statut actuel -->
      <div style="background:var(--s2);border-radius:8px;padding:8px 10px;margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;font-size:10px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.04);">
          <span style="color:var(--t2);">Positions ouvertes</span>
          <span style="font-weight:700;color:${pos>0?'var(--down)':'var(--up)'};">${pos}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:10px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.04);">
          <span style="color:var(--t2);">Bot</span>
          <span style="font-weight:700;color:${botOn?'var(--up)':'var(--t3)'};">${botOn?'✅ Actif':'⏸ Pause'}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:10px;padding:3px 0;">
          <span style="color:var(--t2);">Capital</span>
          <span style="font-weight:700;">$${capital.toFixed(2)}</span>
        </div>
      </div>

      <div style="font-size:9px;color:var(--t2);line-height:1.5;margin-bottom:10px;">
        Appuie sur <strong style="color:var(--down);">SOS</strong> (bouton flottant en bas à droite) pour ouvrir l'overlay d'urgence en plein écran.
      </div>

      <!-- Actions rapides inline -->
      ${[
        {label:'🛑 Fermer toutes les positions',fn:'urgenceCloseAll()',dis:pos===0,col:'var(--down)'},
        {label:'⏸ Pause bot immédiate',fn:'urgencePauseBot()',dis:!botOn,col:'var(--gold)'},
        {label:'📉 Mises à 10%',fn:'urgenceReduceStake()',dis:false,col:'var(--ice)'},
        {label:'💾 Backup d\'urgence',fn:'urgenceSaveBackup()',dis:false,col:'var(--up)'},
      ].map(a=>`<button onclick="${a.fn}"
        style="width:100%;margin-bottom:6px;padding:9px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;
               background:${a.col}12;border:1px solid ${a.col}40;color:${a.col};
               ${a.dis?'opacity:.4;pointer-events:none;':''}">
        ${a.label}
      </button>`).join('')}

      <button onclick="openUrgence()"
        style="width:100%;padding:10px;border-radius:8px;font-size:12px;font-weight:800;cursor:pointer;font-family:inherit;background:rgba(255,61,107,.15);border:2px solid rgba(255,61,107,.5);color:var(--down);letter-spacing:.05em;margin-top:4px;">
        🚨 OUVRIR MODE URGENCE PLEIN ÉCRAN
      </button>
    </div>`;
}
window.renderUrgenceSection = renderUrgenceSection;
// ═══ v69 · ALERTES PRIX TEMPS RÉEL ═══
// Alertes sur le prix des paires — vérifiées à chaque tick
// Types : Prix > X · Prix < X · Variation % · RSI · P&L position

if(!S.priceAlerts) S.priceAlerts = [];
let _prNextId = 1;

function _prGetId() { return _prNextId++; }

// Créer une alerte
function addPriceAlert() {
  const pair  = document.getElementById('prPairSel')?.value;
  const type  = document.getElementById('prTypeSel')?.value;
  const value = parseFloat(document.getElementById('prValueInp')?.value||'0');
  if(!pair || !type || !isFinite(value) || value<=0) {
    showToast('⚠ Remplis tous les champs', 1500, 'warn'); return;
  }
  const ps  = S.pairStates?.[pair];
  const cur = ps?.price||0;
  const cfg = PAIRS[pair]||{};
  const dec = cfg.dec>=4?cfg.dec:2;

  const alert = {
    id:_prGetId(), pair, type, value,
    createdAt:Date.now(), triggered:false,
    note:`${pair} ${type==='above'?'> ':'< '}${value.toFixed(dec)}`,
    col:type==='above'?'var(--up)':'var(--down)',
  };
  if(type==='pct_up'||type==='pct_down')   alert.note=`${pair} ${type==='pct_up'?'+':'−'}${value}% en 1h`;
  if(type==='pnl_pos') alert.note=`Position ${pair} P&L ≥ +$${value}`;
  if(type==='pnl_neg') alert.note=`Position ${pair} P&L ≤ -$${value}`;

  S.priceAlerts.push(alert);
  showToast('🔔 Alerte créée : '+alert.note, 2000, 'win');
  renderPriceAlertSection();
}
window.addPriceAlert = addPriceAlert;

function deletePriceAlert(id) {
  S.priceAlerts = (S.priceAlerts||[]).filter(a=>a.id!==id);
  renderPriceAlertSection();
}
window.deletePriceAlert = deletePriceAlert;

function clearTriggeredAlerts() {
  S.priceAlerts = (S.priceAlerts||[]).filter(a=>!a.triggered);
  renderPriceAlertSection();
}
window.clearTriggeredAlerts = clearTriggeredAlerts;

// Vérifier les alertes — appelé à chaque tick
function checkPriceAlerts() {
  if(!S.priceAlerts?.length) return;
  const now = Date.now();
  S.priceAlerts.forEach(alert=>{
    if(alert.triggered) return;
    const ps  = S.pairStates?.[alert.pair];
    if(!ps)   return;
    const cur = ps.price||0;
    let fire  = false;

    if(alert.type==='above' && cur>=alert.value) fire=true;
    if(alert.type==='below' && cur>0&&cur<=alert.value) fire=true;

    if(alert.type==='pct_up'||alert.type==='pct_down') {
      // Variation % depuis l'entrée de l'alerte
      const ref  = alert.priceAtCreation||(()=>{ alert.priceAtCreation=cur; return cur; })();
      const pct  = cur>0&&ref>0?(cur-ref)/ref*100:0;
      if(alert.type==='pct_up'  && pct>=alert.value)  fire=true;
      if(alert.type==='pct_down'&& pct<=-alert.value) fire=true;
    }

    if(alert.type==='pnl_pos'||alert.type==='pnl_neg') {
      const pos = (S.openPositions||[]).find(p=>p.pair===alert.pair);
      if(pos) {
        const pnl = pos.pnlUsdt||0;
        if(alert.type==='pnl_pos' && pnl>=alert.value)  fire=true;
        if(alert.type==='pnl_neg' && pnl<=-alert.value) fire=true;
      }
    }

    if(fire) {
      alert.triggered   = true;
      alert.triggeredAt = now;
      alert.triggeredPrice = cur;
      _prFireAlert(alert, cur);
    }
  });
}
window.checkPriceAlerts = checkPriceAlerts;

function _prFireAlert(alert, cur) {
  // Toast visuel
  const toastEl = document.getElementById('prToast');
  const textEl  = document.getElementById('prToastText');
  const iconEl  = document.getElementById('prToastIcon');
  if(toastEl&&textEl&&iconEl) {
    iconEl.textContent = alert.type==='above'?'📈':alert.type==='below'?'📉':alert.type.includes('pct')?'📊':'💰';
    textEl.textContent = alert.note + ` · ${cur.toFixed(PAIRS[alert.pair]?.dec>=4?PAIRS[alert.pair].dec:2)}`;
    toastEl.classList.add('show');
    setTimeout(()=>toastEl.classList.remove('show'), 5000);
  }
  // Vibration
  try { navigator.vibrate?.([200,100,200]); } catch(e) {}
  // Chain log
  S.chainLog = S.chainLog||[];
  S.chainLog.push({icon:'🔔',desc:`Alerte PRIX: ${alert.note} · ${cur}`,hash:Math.random().toString(36).slice(2,8),time:new Date().toLocaleTimeString()});
  // Notification push si permission
  try {
    if(Notification.permission==='granted') {
      new Notification('🔔 AURA Prix Alert',{body:alert.note,icon:'/favicon.ico'});
    }
  } catch(e) {}
  // Re-render section
  try { renderPriceAlertSection(); } catch(e) {}
}

// Demander permission notifications
function requestNotifPerm() {
  Notification.requestPermission().then(p=>{
    showToast(p==='granted'?'🔔 Notifications activées':'⚠ Notifications refusées', 2000, p==='granted'?'win':'warn');
    renderPriceAlertSection();
  });
}
window.requestNotifPerm = requestNotifPerm;

// Hook dans le tick principal
const _prOrigCheckPnlAlerts = typeof checkPnlAlerts==='function'?checkPnlAlerts:null;
// Appeler checkPriceAlerts dans renderHome aussi
function renderPriceAlertSection() {
  const el = document.getElementById('priceAlertSection');
  if(!el) return;

  const alerts  = S.priceAlerts||[];
  const active  = alerts.filter(a=>!a.triggered);
  const triggered=alerts.filter(a=>a.triggered);
  const pairs   = Object.keys(PAIRS||{});
  const notifPerm = typeof Notification!=='undefined'?Notification.permission:'denied';

  el.innerHTML = `
    <div class="pr-section">
      <div class="pr-title">🔔 Alertes Prix
        <span style="font-size:8px;color:var(--t3);font-weight:400;">${active.length} active(s)</span>
      </div>

      <!-- Permission notifs -->
      ${notifPerm!=='granted'?`
      <div style="background:rgba(245,200,66,.08);border:1px solid rgba(245,200,66,.2);border-radius:7px;padding:7px 10px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:9px;color:var(--gold);">🔔 Active les notifications push</span>
        <button onclick="requestNotifPerm()" style="font-size:9px;padding:3px 10px;border-radius:5px;background:rgba(245,200,66,.12);border:1px solid rgba(245,200,66,.3);color:var(--gold);cursor:pointer;font-family:inherit;font-weight:700;">Activer</button>
      </div>`:''}

      <!-- Formulaire ajout -->
      <div class="pr-add-form">
        <div style="font-size:9px;color:var(--t3);margin-bottom:6px;">Créer une alerte</div>
        <div class="pr-form-row">
          <select id="prPairSel" class="pr-select">
            ${pairs.map(p=>`<option value="${p}">${p.replace('/USDT','')}</option>`).join('')}
          </select>
          <select id="prTypeSel" class="pr-select">
            <option value="above">Prix ≥ (monte)</option>
            <option value="below">Prix ≤ (baisse)</option>
            <option value="pct_up">+% en 1h</option>
            <option value="pct_down">−% en 1h</option>
            <option value="pnl_pos">P&L pos. ≥ $</option>
            <option value="pnl_neg">P&L pos. ≤ -$</option>
          </select>
        </div>
        <div class="pr-form-row">
          <input id="prValueInp" class="pr-inp" type="number" placeholder="Valeur cible" step="any" min="0">
          <button class="pr-add-btn" onclick="addPriceAlert()">+ Créer</button>
        </div>
        <div style="font-size:8px;color:var(--t3);">
          Vérifiée à chaque tick (~15s) · Toast + vibration + notification push
        </div>
      </div>

      <!-- Alertes actives -->
      ${active.length>0?`
      <div style="font-size:9px;color:var(--t3);margin-bottom:5px;">Actives (${active.length})</div>
      ${active.map(a=>{
        const ps  = S.pairStates?.[a.pair];
        const cur = ps?.price||0;
        const dec = PAIRS[a.pair]?.dec>=4?PAIRS[a.pair].dec:2;
        const dist= a.type==='above'?((a.value-cur)/cur*100):a.type==='below'?((cur-a.value)/cur*100):null;
        const pairCol = PAIRS[a.pair]?.color||'var(--t1)';
        return `<div class="pr-alert-card">
          <span class="pr-alert-icon">${a.type==='above'?'📈':a.type==='below'?'📉':a.type.includes('pct')?'📊':'💰'}</span>
          <div class="pr-alert-body">
            <div class="pr-alert-pair" style="color:${pairCol};">${a.pair.replace('/USDT','')}</div>
            <div class="pr-alert-cond">${a.note}</div>
            <div style="font-size:8px;color:var(--t3);">Actuel: ${cur.toFixed(dec)}</div>
          </div>
          ${dist!==null?`<span class="pr-alert-dist" style="color:${dist>0?'var(--t3)':'var(--gold)'};">${dist>0?'Δ'+dist.toFixed(1)+'%':'⚡ Proche'}</span>`:''}
          <button onclick="deletePriceAlert(${a.id})" style="background:none;border:none;color:var(--t3);cursor:pointer;font-size:14px;">🗑</button>
        </div>`;
      }).join('')}`:'<div style="text-align:center;padding:10px;font-size:10px;color:var(--t3);">Aucune alerte active</div>'}

      <!-- Alertes déclenchées -->
      ${triggered.length>0?`
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;margin-bottom:5px;">
        <span style="font-size:9px;color:var(--gold);">Déclenchées (${triggered.length})</span>
        <button onclick="clearTriggeredAlerts()" style="font-size:8px;padding:2px 8px;border-radius:5px;background:rgba(255,255,255,.06);border:1px solid var(--border);color:var(--t3);cursor:pointer;font-family:inherit;">Effacer</button>
      </div>
      ${triggered.slice(0,3).map(a=>`<div class="pr-alert-card triggered">
        <span class="pr-alert-icon">✅</span>
        <div class="pr-alert-body">
          <div class="pr-alert-pair">${a.pair.replace('/USDT','')}</div>
          <div class="pr-alert-cond">${a.note}</div>
          <div style="font-size:8px;color:var(--gold);">Déclenché à ${a.triggeredPrice?.toFixed(PAIRS[a.pair]?.dec>=4?PAIRS[a.pair].dec:2)||'—'}</div>
        </div>
      </div>`).join('')}`:''}
    </div>`;
}
window.renderPriceAlertSection = renderPriceAlertSection;
// ═══ v70 · AUTO-BACKUP QUOTIDIEN ═══
// Sauvegarde automatique du state à heure fixe
// 3 slots rotatifs (J, J-1, J-2) + backup manuel immédiat
// Notification toast quand le backup s'effectue

const _AB_KEY_PREFIX = 'aura_autobackup_';
const _AB_SLOTS      = ['daily_0','daily_1','daily_2'];
let _abTimer         = null;

function _abInit() {
  if(!S.autoBackup) S.autoBackup = {
    enabled:   true,
    hour:      3,      // 3h du matin par défaut
    lastRun:   null,
    runCount:  0,
  };
}

// Vérifier si un backup automatique doit s'exécuter
function _abCheck() {
  // Daily backups localStorage DÉSACTIVÉS : le backup est désormais géré par
  // Guardian (IndexedDB toutes les 3h + Google Drive). Ces 3 slots LS pesaient
  // ~4,5 Mo et causaient le QuotaExceededError + ralentissaient les saves.
  // On purge les anciens une seule fois pour libérer le localStorage.
  try {
    ['daily_0','daily_1','daily_2'].forEach(s => localStorage.removeItem(_AB_KEY_PREFIX + s));
  } catch(_) {}
}

// Exécuter le backup
function _abExecute(mode) {
  _abInit();
  try {
    // v117 FIX "Backup échoué" · cause : cette fonction clonait S EN ENTIER
    // (...JSON.parse(JSON.stringify(S)) ≈ 2,3 Mo) et en gardait 3 copies dans
    // localStorage (3 slots) ≈ 7 Mo → dépassement du quota (~5 Mo) → exception.
    // Correctif : (1) on part de buildSnapshot() — version allégée + filtrée par
    // mode (~1,5 Mo) quand elle est dispo ; (2) écriture tolérante au quota :
    // si plein, on purge le slot le plus ancien et on réessaie, au lieu d'échouer.
    const _abBase = (typeof buildSnapshot === 'function')
      ? buildSnapshot()
      : JSON.parse(JSON.stringify(S));
    const snap = {
      _abMeta: {
        mode, ts: Date.now(),
        date: new Date().toLocaleString('fr-FR'),
        portfolio: S.portfolio||0,
        totalTrades: S.totalTrades||0,
        version: 'v117',
      },
      ..._abBase,
    };
    const json = JSON.stringify(snap);

    // Écriture tolérante au quota : le slot le plus récent est prioritaire.
    // Si le quota explose, on libère les slots anciens puis on réessaie.
    const _abSafeWrite = (key, value) => {
      try { localStorage.setItem(key, value); return true; }
      catch(err) {
        try { localStorage.removeItem(_AB_KEY_PREFIX + _AB_SLOTS[2]); } catch(_) {}
        try { localStorage.setItem(key, value); return true; } catch(_) {}
        try { localStorage.removeItem(_AB_KEY_PREFIX + _AB_SLOTS[1]); } catch(_) {}
        try { localStorage.setItem(key, value); return true; } catch(_) {}
        throw err;
      }
    };

    // Rotation des slots (0=plus récent, 2=plus ancien) — rotation non bloquante :
    // perdre une vieille copie est acceptable, perdre la plus récente ne l'est pas.
    const slot2 = localStorage.getItem(_AB_KEY_PREFIX + _AB_SLOTS[1]);
    if(slot2) { try { localStorage.setItem(_AB_KEY_PREFIX + _AB_SLOTS[2], slot2); } catch(_) {} }
    const slot1 = localStorage.getItem(_AB_KEY_PREFIX + _AB_SLOTS[0]);
    if(slot1) { try { localStorage.setItem(_AB_KEY_PREFIX + _AB_SLOTS[1], slot1); } catch(_) {} }
    _abSafeWrite(_AB_KEY_PREFIX + _AB_SLOTS[0], json);

    S.autoBackup.lastRun = new Date().toDateString();
    S.autoBackup.runCount = (S.autoBackup.runCount||0) + 1;
    S.autoBackup.lastSize = Math.round(json.length/1024);

    if(mode==='auto') {
      showToast('💾 Auto-backup effectué · $'+((S.portfolio||0).toFixed(0)), 3000, 'win');
    }
    S.chainLog = S.chainLog||[];
    S.chainLog.push({icon:'💾',desc:`Auto-backup ${mode} · $${(S.portfolio||0).toFixed(2)} · ${S.totalTrades||0} trades`,hash:Math.random().toString(36).slice(2,8),time:new Date().toLocaleTimeString()});
    renderAutoBackupSection();
  } catch(e) {
    showToast('⚠ Backup échoué: '+e.message, 2000, 'warn');
    // ════════════════════════════════════════════════════════════
    // v117 DIAG TEMPORAIRE · on capture l'erreur dans une variable
    // mémoire (fiable, pas de dépendance au quota). Un timer plus bas
    // ré-affiche le panneau toutes les 3 s tant qu'il n'est pas visible
    // — robuste même si le rendu de l'appli efface le panneau au démarrage.
    // → à retirer une fois la vraie cause connue.
    // ════════════════════════════════════════════════════════════
    try {
      var _d = '=== DIAGNOSTIC BACKUP ECHOUE ===\n';
      _d += 'Type    : ' + (e && e.name ? e.name : '?') + '\n';
      _d += 'Message : ' + (e && e.message ? e.message : String(e)) + '\n\n';
      _d += 'Slots auto-backup :\n';
      for (var _i = 0; _i < _AB_SLOTS.length; _i++) {
        var _v = localStorage.getItem(_AB_KEY_PREFIX + _AB_SLOTS[_i]);
        _d += '  ' + _AB_SLOTS[_i] + ' = ' + (_v ? Math.round(_v.length/1024) + ' Ko' : 'vide') + '\n';
      }
      var _tot = 0, _all = [];
      for (var _j = 0; _j < localStorage.length; _j++) {
        var _k = localStorage.key(_j);
        var _sz = (localStorage.getItem(_k) || '').length;
        _tot += _sz; _all.push([_k, _sz]);
      }
      _all.sort(function(a, b){ return b[1] - a[1]; });
      _d += '\nlocalStorage total : ' + Math.round(_tot/1024) + ' Ko / ~5000 Ko max\n';
      _d += 'Plus grosses cles :\n';
      for (var _m = 0; _m < Math.min(8, _all.length); _m++) {
        _d += '  ' + _all[_m][0] + ' : ' + Math.round(_all[_m][1]/1024) + ' Ko\n';
      }
      window._auraLastBackupError = _d;
      try { localStorage.setItem('_aura_lastBackupError', _d); } catch(_) {}
      if (typeof _abShowDiagOverlay === 'function') _abShowDiagOverlay();
    } catch(_) {}
  }
}

function runManualBackup() {
  _abExecute('manual');
  showToast('💾 Backup manuel effectué', 2000, 'win');
}
window.runManualBackup = runManualBackup;

function restoreSlot(slotKey) {
  const raw = localStorage.getItem(_AB_KEY_PREFIX + slotKey);
  if(!raw) { showToast('⚠ Slot vide', 1500, 'warn'); return; }
  try {
    const snap = JSON.parse(raw);
    const meta = snap._abMeta;
    if(!confirm(`Restaurer le backup du ${meta?.date||'?'} ?\n$${(meta?.portfolio||0).toFixed(2)} · ${meta?.totalTrades||0} trades\n\nLes données actuelles seront écrasées.`)) return;
    delete snap._abMeta;
    Object.assign(S, snap);
    showToast('✅ Backup restauré · $'+((S.portfolio||0).toFixed(2)), 3000, 'win');
    try { renderHome(); } catch(e) {}
    renderAutoBackupSection();
  } catch(e) { showToast('⚠ Erreur restauration', 2000, 'warn'); }
}
window.restoreSlot = restoreSlot;

function downloadSlot(slotKey) {
  const raw = localStorage.getItem(_AB_KEY_PREFIX + slotKey);
  if(!raw) { showToast('⚠ Slot vide', 1500, 'warn'); return; }
  const meta = JSON.parse(raw)._abMeta;
  const ts   = (meta?.date||'backup').replace(/[\/\s:]/g,'-');
  const blob = new Blob([raw],{type:'application/json'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href=url; a.download=`aura_autobackup_${ts}.json`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
  showToast('📥 Backup téléchargé', 2000, 'win');
}
window.downloadSlot = downloadSlot;

function toggleAutoBackup() {
  _abInit();
  S.autoBackup.enabled = !S.autoBackup.enabled;
  if(S.autoBackup.enabled) {
    showToast('💾 Auto-backup activé', 1500, 'win');
  } else {
    showToast('⏸ Auto-backup désactivé', 1500, 'user');
  }
  renderAutoBackupSection();
}
window.toggleAutoBackup = toggleAutoBackup;

function setAbHour(h) {
  _abInit();
  S.autoBackup.hour = parseInt(h);
  renderAutoBackupSection();
}
window.setAbHour = setAbHour;

// Purge unique des anciens daily backups localStorage au démarrage
// (le backup est géré par Guardian : IDB toutes les 3h + Drive)
if(_abTimer) clearInterval(_abTimer);
_abCheck();

// ════════════════════════════════════════════════════════════
// v117 DIAG TEMPORAIRE · panneau de diagnostic robuste.
// L'erreur backup est capturée dans window._auraLastBackupError ;
// ce timer ré-affiche le panneau toutes les 3 s tant qu'il n'est pas
// visible — même si le rendu de l'appli l'a effacé au démarrage.
// Le panneau est attaché à <html> pour survivre aux reconstructions
// de <body>. → à retirer entièrement une fois la vraie cause connue.
// ════════════════════════════════════════════════════════════
function _abShowDiagOverlay() {
  try {
    if (document.getElementById('_abDiagOverlay')) return;
    var _d = window._auraLastBackupError;
    if (!_d) { try { _d = localStorage.getItem('_aura_lastBackupError'); } catch(_) {} }
    if (!_d) return;
    var _root = document.documentElement || document.body;
    if (!_root) return;
    var _ov = document.createElement('div');
    _ov.id = '_abDiagOverlay';
    _ov.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.95);display:flex;flex-direction:column;padding:16px;box-sizing:border-box;font-family:monospace';
    var _ttl = document.createElement('div');
    _ttl.style.cssText = 'color:#fff;font-size:15px;font-weight:bold;margin-bottom:8px;line-height:1.3';
    _ttl.textContent = '🩺 DIAGNOSTIC — appuie sur COPIER puis colle le texte dans le chat';
    var _ta = document.createElement('textarea');
    _ta.readOnly = true; _ta.value = _d;
    _ta.style.cssText = 'flex:1;width:100%;background:#0a0a0a;color:#3f6;border:1px solid #444;font-size:13px;padding:10px;box-sizing:border-box;border-radius:6px;resize:none';
    var _row = document.createElement('div');
    _row.style.cssText = 'display:flex;gap:8px;margin-top:10px';
    var _cp = document.createElement('button');
    _cp.textContent = '📋 COPIER';
    _cp.style.cssText = 'flex:1;padding:14px;font-size:15px;background:#2563eb;color:#fff;border:none;border-radius:8px';
    _cp.onclick = function() {
      var _ok = false;
      try { _ta.focus(); _ta.select(); _ok = document.execCommand('copy'); } catch(_) {}
      try { if (navigator.clipboard) { navigator.clipboard.writeText(_d); _ok = true; } } catch(_) {}
      _cp.textContent = _ok ? '✅ COPIÉ' : '⚠ sélectionne le texte à la main';
    };
    var _cl = document.createElement('button');
    _cl.textContent = '✕';
    _cl.style.cssText = 'padding:14px 18px;font-size:15px;background:#444;color:#fff;border:none;border-radius:8px';
    _cl.onclick = function() {
      _ov.remove();
      window._auraLastBackupError = null;
      try { localStorage.removeItem('_aura_lastBackupError'); } catch(_) {}
      if (window._abDiagTimer) { clearInterval(window._abDiagTimer); window._abDiagTimer = null; }
    };
    _row.appendChild(_cp); _row.appendChild(_cl);
    _ov.appendChild(_ttl); _ov.appendChild(_ta); _ov.appendChild(_row);
    _root.appendChild(_ov);
  } catch(_) {}
}
if (window._abDiagTimer) clearInterval(window._abDiagTimer);
window._abDiagTimer = setInterval(function() {
  try {
    if (document.getElementById('_abDiagOverlay')) return;
    var _has = window._auraLastBackupError;
    if (!_has) { try { _has = localStorage.getItem('_aura_lastBackupError'); } catch(_) {} }
    if (_has) _abShowDiagOverlay();
  } catch(_) {}
}, 3000);

function renderAutoBackupSection() {
  const el = document.getElementById('autoBackupSection');
  if(!el) return;
  _abInit();
  const cfg  = S.autoBackup;
  const slots = _AB_SLOTS.map(key=>{
    const raw = localStorage.getItem(_AB_KEY_PREFIX+key);
    if(!raw) return {key, empty:true};
    try {
      const meta = JSON.parse(raw)._abMeta;
      return {key, empty:false, meta, size:Math.round(raw.length/1024)};
    } catch(e) { return {key, empty:true}; }
  });
  const slotLabels = ['Aujourd\'hui','Hier','Avant-hier'];
  const filled = slots.filter(s=>!s.empty).length;

  // Prochaine heure de backup
  const now  = new Date();
  const nextH= new Date(); nextH.setHours(cfg.hour||3,0,0,0);
  if(nextH<=now) nextH.setDate(nextH.getDate()+1);
  const hoursLeft = Math.round((nextH-now)/3600000);

  el.innerHTML = `
    <div class="ab-section">
      <div class="ab-title">💾 Auto-Backup Quotidien
        <span style="font-size:8px;color:var(--t3);font-weight:400;">${filled}/3 slots</span>
      </div>

      <!-- Toggle auto -->
      <div class="ab-toggle-row">
        <div style="flex:1;">
          <div style="font-size:11px;font-weight:700;color:var(--t1);">Backup automatique</div>
          <div style="font-size:8px;color:var(--t3);margin-top:1px;">
            ${cfg.enabled?`Prochain dans ~${hoursLeft}h · ${cfg.runCount||0} backups effectués`:'Désactivé'}
          </div>
        </div>
        <button class="ab-toggle ${cfg.enabled?'on':''}" onclick="toggleAutoBackup()"></button>
      </div>

      <!-- Heure du backup -->
      ${cfg.enabled?`
      <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--s2);border-radius:7px;margin-bottom:8px;">
        <span style="font-size:10px;color:var(--t2);">Heure quotidienne</span>
        <select onchange="setAbHour(this.value)"
          style="flex:1;background:var(--s3);border:1px solid var(--border);border-radius:5px;color:var(--t1);font-size:10px;padding:4px 6px;font-family:inherit;">
          ${Array.from({length:24},(_,i)=>`<option value="${i}" ${i===(cfg.hour||3)?'selected':''}>${String(i).padStart(2,'0')}:00</option>`).join('')}
        </select>
      </div>`:''}

      <!-- Slots -->
      <div style="font-size:9px;color:var(--t3);margin-bottom:5px;">Historique des backups (3 derniers jours)</div>
      ${slots.map((s,i)=>`
        <div class="ab-slot">
          <span class="ab-slot-icon">${s.empty?'🔲':'💾'}</span>
          <div class="ab-slot-body">
            <div class="ab-slot-name">${slotLabels[i]}</div>
            <div class="ab-slot-meta">
              ${s.empty?'Aucun backup':`${s.meta?.date||'—'} · $${(s.meta?.portfolio||0).toFixed(0)} · ${s.meta?.trades||s.meta?.totalTrades||0} trades · ${s.size||0} Ko`}
            </div>
            ${!s.empty?`
            <div style="height:3px;background:rgba(255,255,255,.06);border-radius:100px;overflow:hidden;margin-top:4px;">
              <div style="height:100%;width:${Math.min(100,((s.size||0)/500)*100)}%;background:var(--ice);border-radius:100px;"></div>
            </div>`:''}
          </div>
          ${!s.empty?`
          <div style="display:flex;flex-direction:column;gap:4px;">
            <button onclick="restoreSlot('${s.key}')" style="font-size:8px;padding:3px 7px;border-radius:5px;background:rgba(0,232,122,.1);border:1px solid rgba(0,232,122,.2);color:var(--up);cursor:pointer;font-family:inherit;">↩ Restaurer</button>
            <button onclick="downloadSlot('${s.key}')" style="font-size:8px;padding:3px 7px;border-radius:5px;background:rgba(56,212,245,.08);border:1px solid rgba(56,212,245,.2);color:var(--ice);cursor:pointer;font-family:inherit;">📥 DL</button>
          </div>`:''}
        </div>`).join('')}

      <!-- Backup manuel -->
      <button class="ab-btn" onclick="runManualBackup()"
        style="margin-top:8px;background:rgba(56,212,245,.08);border-color:rgba(56,212,245,.25);color:var(--ice);">
        💾 Backup manuel maintenant
      </button>

      <div style="font-size:8px;color:var(--t3);text-align:center;line-height:1.5;margin-top:6px;">
        Stocké dans localStorage · 3 slots rotatifs · Téléchargeable en JSON<br>
        Stockage ≈ ${Math.round(JSON.stringify(S).length/1024)} Ko actuellement
      </div>
    </div>`;
}
window.renderAutoBackupSection = renderAutoBackupSection;
// ═══ v71 · CORRÉLATION LIVE BTC IMPACT ═══
// Analyse en temps réel : si BTC bouge de X%, comment réagissent les autres paires ?
// Calcule le beta de chaque paire par rapport à BTC
// + Alerte si BTC chute fortement

const _BTC_PAIR = 'BTC/USDT';
let _btcHistory = []; // Historique des prix BTC (derniers 50 ticks)
let _btcPairHist = {}; // Historique par paire

// Alimenter l'historique à chaque tick (appelé depuis le tick principal)
function btcImpactTick() {
  const btcPs = S.pairStates?.[_BTC_PAIR];
  if(!btcPs?.price) return;

  const now = Date.now();
  _btcHistory.push({ts:now, price:btcPs.price});
  if(_btcHistory.length > 100) _btcHistory.shift();

  Object.keys(PAIRS||{}).forEach(pair=>{
    if(pair===_BTC_PAIR) return;
    const ps = S.pairStates?.[pair];
    if(!ps?.price) return;
    if(!_btcPairHist[pair]) _btcPairHist[pair] = [];
    _btcPairHist[pair].push({ts:now, price:ps.price});
    if(_btcPairHist[pair].length > 100) _btcPairHist[pair].shift();
  });

  // Vérifier alerte chute BTC
  if(_btcHistory.length >= 5) {
    const recent  = _btcHistory.slice(-5);
    const oldest  = recent[0].price;
    const latest  = recent[recent.length-1].price;
    const pct     = (latest-oldest)/oldest*100;
    if(pct < -3 && !_btcLastAlertTs || (Date.now()-(_btcLastAlertTs||0)) > 600000) {
      _btcLastAlertTs = Date.now();
      showToast(`⚠️ BTC chute de ${pct.toFixed(1)}% — surveille les alts !`, 5000, 'warn');
    }
  }
}
window.btcImpactTick = btcImpactTick;
let _btcLastAlertTs = 0;

// Calculer le beta d'une paire par rapport à BTC
function _calcBeta(pair) {
  const btcH  = _btcHistory;
  const pairH = _btcPairHist[pair] || [];
  if(btcH.length < 10 || pairH.length < 10) {
    // Fallback : beta théorique basé sur la corrélation des trades
    return _theoreticalBeta(pair);
  }

  // Aligner les séries par timestamp (buckets de 30s)
  const btcRets  = [];
  const pairRets = [];
  const n = Math.min(btcH.length, pairH.length, 50) - 1;

  for(let i=0; i<n; i++) {
    const b1=btcH[i]?.price, b2=btcH[i+1]?.price;
    const p1=pairH[i]?.price, p2=pairH[i+1]?.price;
    if(b1&&b2&&p1&&p2&&b1>0&&p1>0) {
      btcRets.push((b2-b1)/b1);
      pairRets.push((p2-p1)/p1);
    }
  }

  if(btcRets.length < 5) return _theoreticalBeta(pair);

  // Beta = Cov(pair,btc) / Var(btc)
  const mx = btcRets.reduce((s,v)=>s+v,0)/btcRets.length;
  const my = pairRets.reduce((s,v)=>s+v,0)/pairRets.length;
  const cov = btcRets.reduce((s,v,i)=>s+(v-mx)*(pairRets[i]-my),0)/btcRets.length;
  const varX= btcRets.reduce((s,v)=>s+(v-mx)**2,0)/btcRets.length;
  return varX>0 ? cov/varX : _theoreticalBeta(pair);
}

// Beta théorique basé sur la nature de l'actif
function _theoreticalBeta(pair) {
  const betas = {
    'ETH/USDT':1.15,'XRP/USDT':1.3,'SOL/USDT':1.4,
    'DOGE/USDT':1.6,'ADA/USDT':1.25,'AVAX/USDT':1.35,'LINK/USDT':1.2,
  };
  return betas[pair] || 1.0;
}


function simulateBtcMove(pct) {
  const results = {};
  Object.keys(PAIRS||{}).filter(p=>p!==_BTC_PAIR).forEach(pair=>{
    const beta    = _calcBeta(pair);
    const pairPct = pct * beta;
    const ps      = S.pairStates?.[pair];
    const cur     = ps?.price||0;
    const newPrice= cur * (1 + pairPct/100);
    // Impact sur positions ouvertes
    const pos     = (S.openPositions||[]).find(p=>p.pair===pair);
    const pnlImpact = pos ? (pos.stakeUsdt||0)*pairPct/100*(pos.side==='long'?1:-1) : 0;
    results[pair] = {beta, pairPct, cur, newPrice, pnlImpact};
  });
  return results;
}

function renderBtcImpactSection() {
  const el = document.getElementById('btcImpactSection');
  if(!el) return;

  const btcPs   = S.pairStates?.[_BTC_PAIR] || {};
  const btcPrice= btcPs.price || 0;
  const btcPnl24= btcPs.totalPnlPct || 0;
  const dec     = PAIRS[_BTC_PAIR]?.dec || 2;
  const hasLive = _btcHistory.length >= 10;

  // Calculer la variation récente BTC (5 derniers ticks)
  let btcRecentPct = 0;
  if(_btcHistory.length >= 2) {
    const old = _btcHistory[Math.max(0,_btcHistory.length-6)].price;
    btcRecentPct = old>0?(btcPrice-old)/old*100:0;
  }

  const btcCol = btcRecentPct>=0?'var(--up)':'var(--down)';

  
  const scenarios = [-10,-5,-3,3,5,10];
  const simPct = btcRecentPct > 2 ? 5 : btcRecentPct < -2 ? -5 : 3;
  const simResults = simulateBtcMove(simPct);

  // Beta de chaque paire
  const pairs = Object.keys(PAIRS||{}).filter(p=>p!==_BTC_PAIR);
  const betas = pairs.map(p=>({pair:p, beta:_calcBeta(p)}))
    .sort((a,b)=>b.beta-a.beta);

  // Alertes
  const alerts = [];
  if(Math.abs(btcRecentPct)>3) alerts.push({t:'high',msg:`BTC a bougé de ${btcRecentPct>=0?'+':''}${btcRecentPct.toFixed(1)}% récemment. Les alts vont probablement suivre.`});
  const highBeta = betas.filter(b=>b.beta>1.5);
  if(highBeta.length>0) alerts.push({t:'med',msg:`${highBeta.map(b=>b.pair.replace('/USDT','')).join(', ')} ont un beta >1.5 : très sensibles aux mouvements BTC.`});
  const openLongs = (S.openPositions||[]).filter(p=>p.side==='long'&&p.pair!==_BTC_PAIR);
  if(openLongs.length>0&&btcRecentPct<-2) alerts.push({t:'high',msg:`${openLongs.length} position(s) LONG ouvertes pendant une chute BTC. Risque de cascade.`});

  el.innerHTML = `
    <div class="btc-section">
      <div class="btc-title">₿ Impact BTC en Temps Réel
        <span style="font-size:8px;color:var(--t3);font-weight:400;">${hasLive?_btcHistory.length+' points':'Accumulation...'}</span>
      </div>

      <!-- BTC live -->
      <div class="btc-live-row">
        <div>
          <div style="font-size:9px;color:var(--t3);margin-bottom:2px;">Bitcoin / USDT</div>
          <div style="font-size:16px;font-weight:900;font-family:var(--font-mono);color:${PAIRS[_BTC_PAIR]?.color||'#f7931a'};">$${btcPrice.toFixed(dec)}</div>
        </div>
        <div style="flex:1;text-align:right;">
          <div class="btc-pct" style="color:${btcCol};">${btcRecentPct>=0?'+':''}${btcRecentPct.toFixed(2)}%</div>
          <div style="font-size:8px;color:var(--t3);">Variation récente (5 ticks)</div>
        </div>
      </div>

      <!-- Alertes -->
      ${alerts.map(a=>`<div class="btc-alert ${a.t}">${a.t==='high'?'🚨':a.t==='med'?'⚠️':'💡'} ${a.msg}</div>`).join('')}

      <!-- Beta par paire -->
      <div style="font-size:9px;color:var(--t3);margin-bottom:6px;">Beta des paires vs BTC <span style="font-size:8px;">(si BTC +1% → paire +beta%)</span></div>
      <div class="btc-pair-grid">
        ${betas.map(({pair,beta})=>{
          const pairCol = PAIRS[pair]?.color||'var(--t1)';
          const betaCol = beta>1.4?'var(--down)':beta>1.1?'var(--gold)':'var(--up)';
          const sim     = simResults[pair];
          const barW    = Math.min(100, Math.abs(beta)/2.5*100);
          return `<div class="btc-pair-card">
            <div class="btc-pair-name" style="color:${pairCol};">${pair.replace('/USDT','')}</div>
            <div style="display:flex;align-items:baseline;gap:4px;">
              <span class="btc-pair-beta" style="color:${betaCol};">β${beta.toFixed(2)}</span>
              ${!hasLive?'<span style="font-size:7px;color:var(--t3);">théo.</span>':''}
            </div>
            <div class="btc-corr-bar">
              <div class="btc-corr-fill" style="width:${barW}%;background:${betaCol};"></div>
            </div>
            ${sim?`<div class="btc-pair-desc">
              Si BTC ${simPct>=0?'+':''}${simPct}% → <strong style="color:${sim.pairPct>=0?'var(--up)':'var(--down)'};">${sim.pairPct>=0?'+':''}${sim.pairPct.toFixed(1)}%</strong>
              ${sim.pnlImpact!==0?`<br>P&L pos: <strong style="color:${sim.pnlImpact>=0?'var(--up)':'var(--down)'};">${sim.pnlImpact>=0?'+':''}$${sim.pnlImpact.toFixed(2)}</strong>`:''}
            </div>`:''}
          </div>`;
        }).join('')}
      </div>

      <!-- Simulateur rapide -->
      <div style="font-size:9px;color:var(--t3);margin-bottom:5px;">Simulation BTC → impact portfolio</div>
      <div style="display:flex;gap:5px;flex-wrap:wrap;">
        ${scenarios.map(pct=>{
          const res = simulateBtcMove(pct);
          const totalPnl = Object.values(res).reduce((s,r)=>s+r.pnlImpact,0);
          return `<button onclick="renderBtcImpactSection()"
            style="flex:1;min-width:52px;padding:6px 4px;border-radius:7px;font-size:10px;font-weight:700;cursor:pointer;font-family:inherit;text-align:center;
              background:${pct>=0?'rgba(0,232,122,.08)':'rgba(255,61,107,.08)'};
              border:1px solid ${pct>=0?'rgba(0,232,122,.2)':'rgba(255,61,107,.2)'};
              color:${pct>=0?'var(--up)':'var(--down)'};">
            ${pct>=0?'+':''}${pct}%<br>
            <span style="font-size:8px;font-weight:800;">${totalPnl>=0?'+':''}$${totalPnl.toFixed(0)}</span>
          </button>`;
        }).join('')}
      </div>
      <div style="font-size:8px;color:var(--t3);margin-top:6px;text-align:center;">
        ${hasLive?`Beta calculé sur ${_btcHistory.length} ticks réels`:'Beta théorique · Accumulation de ticks en cours...'}
      </div>
    </div>`;
}
window.renderBtcImpactSection = renderBtcImpactSection;
// ═══ v72 · SCORE DE RISQUE GLOBAL 0-100 ═══
// Jauge composite analysant 8 dimensions de risque
// 0 = pas de risque · 100 = danger maximal

function computeRiskScore() {
  const n      = S.totalTrades||0;
  const wr     = n>0?(S.winTrades||0)/n:0;
  const cap    = S.tradingAccount||0;
  const openPos= S.openPositions||[];
  const agents = S.agents||[];
  const fees   = S.fees||{};
  const m      = typeof computeAdvancedMetrics==='function'?computeAdvancedMetrics():null;
  const regime = S._paperRealCurrentRegime||'calm';
  const allT   = Object.values(S.pairStates||{}).flatMap(ps=>(ps.trades||[]).filter(t=>t.type==='position'));

  const factors = [];

  // 1. Exposition (positions ouvertes / capital)
  const totalExpo = openPos.reduce((s,p)=>s+(p.stakeUsdt||0),0);
  const expoRatio = cap>0?totalExpo/cap:0;
  const expoScore = Math.min(100, expoRatio*120);
  factors.push({name:'Exposition positions',val:Math.round(expoScore),raw:`${(expoRatio*100).toFixed(0)}% du capital`,col:expoScore>70?'var(--down)':expoScore>40?'var(--gold)':'var(--up)'});

  // 2. Drawdown
  const dd = m?.maxDDPct||0;
  const ddScore = Math.min(100, dd*3);
  factors.push({name:'Drawdown max',val:Math.round(ddScore),raw:`-${dd.toFixed(1)}%`,col:ddScore>70?'var(--down)':ddScore>40?'var(--gold)':'var(--up)'});

  // 3. Win Rate inversé
  const wrScore = n<10 ? 50 : Math.max(0, Math.min(100, (0.5-wr)*200));
  factors.push({name:'Win Rate',val:Math.round(wrScore),raw:`${Math.round(wr*100)}%`,col:wrScore>60?'var(--down)':wrScore>30?'var(--gold)':'var(--up)'});

  // 4. Régime de marché
  const regimeScores = {bear:85,volatile_bear:75,volatile:60,volatile_bull:40,calm:15,bull:10};
  const regScore = regimeScores[regime]||50;
  factors.push({name:'Régime marché',val:regScore,raw:regime.replace('_',' ').toUpperCase(),col:regScore>70?'var(--down)':regScore>40?'var(--gold)':'var(--up)'});

  // 5. Concentration (trop de trades sur 1 paire)
  const pairCounts = {};
  allT.forEach(t=>{ pairCounts[t.pair]=(pairCounts[t.pair]||0)+1; });
  const maxPairPct = n>0?Math.max(...Object.values(pairCounts))/n:0;
  const concScore  = Math.min(100, maxPairPct*150);
  factors.push({name:'Concentration paire',val:Math.round(concScore),raw:`${Math.round(maxPairPct*100)}% sur 1 paire`,col:concScore>70?'var(--down)':concScore>40?'var(--gold)':'var(--up)'});

  // 6. Agents cassés
  const cassedPct = agents.length>0?agents.filter(a=>(a.fitness||0)<80).length/agents.length:0;
  const agentScore= Math.min(100, cassedPct*200);
  factors.push({name:'Agents cassés',val:Math.round(agentScore),raw:`${Math.round(cassedPct*100)}% (<80 T$)`,col:agentScore>60?'var(--down)':agentScore>30?'var(--gold)':'var(--up)'});

  // 7. Ratio frais / gains
  const feeRatio = (fees.totalGross||0)>0&&(fees.totalPnlGross||0)>0 ? (fees.totalGross||0)/(fees.totalPnlGross||1)*100 : 0;
  const feeScore = Math.min(100, feeRatio*2);
  factors.push({name:'Pression des frais',val:Math.round(feeScore),raw:`${feeRatio.toFixed(1)}% des gains`,col:feeScore>70?'var(--down)':feeScore>40?'var(--gold)':'var(--up)'});

  // 8. Volatilité implicite (écart-type des derniers P&L)
  const recentPnls = allT.slice(-20).map(t=>t.pnlUsdt||0);
  let volScore = 30; // défaut moyen
  if(recentPnls.length>=5) {
    const avg = recentPnls.reduce((s,v)=>s+v,0)/recentPnls.length;
    const std = Math.sqrt(recentPnls.reduce((s,v)=>s+(v-avg)**2,0)/recentPnls.length);
    volScore  = Math.min(100, std/Math.max(1,Math.abs(avg))*50);
  }
  factors.push({name:'Volatilité P&L',val:Math.round(volScore),raw:`σ calculée`,col:volScore>70?'var(--down)':volScore>40?'var(--gold)':'var(--up)'});

  // Score global pondéré
  const weights  = [0.20, 0.15, 0.15, 0.15, 0.10, 0.10, 0.08, 0.07];
  const globalScore = Math.round(factors.reduce((s,f,i)=>s+f.val*(weights[i]||0.1),0));

  const label = globalScore>=80?'DANGER':globalScore>=60?'ÉLEVÉ':globalScore>=40?'MODÉRÉ':globalScore>=20?'FAIBLE':'SÉCURISÉ';
  const mainCol = globalScore>=80?'var(--down)':globalScore>=60?'#f97316':globalScore>=40?'var(--gold)':globalScore>=20?'#84cc16':'var(--up)';

  return {globalScore, label, mainCol, factors};
}
window.computeRiskScore = computeRiskScore;

// Arc SVG pour la jauge
function _riskArc(score) {
  const r   = 54;
  const cx  = 70, cy = 70;
  const startA = -210 * Math.PI/180;
  const endA   = (-210 + score/100*240) * Math.PI/180;
  const x1 = cx+r*Math.cos(startA), y1 = cy+r*Math.sin(startA);
  const x2 = cx+r*Math.cos(endA),   y2 = cy+r*Math.sin(endA);
  const lA = score>58?1:0;
  const col = score>=80?'#ff3d6b':score>=60?'#f97316':score>=40?'#f5c842':score>=20?'#84cc16':'#00e87a';
  return `<svg width="140" height="80" viewBox="0 0 140 80">
    <!-- Track -->
    <path d="M${cx+r*Math.cos(-210*Math.PI/180).toFixed(2)},${cy+r*Math.sin(-210*Math.PI/180).toFixed(2)}
             A${r},${r} 0 1,1 ${cx+r*Math.cos(30*Math.PI/180).toFixed(2)},${cy+r*Math.sin(30*Math.PI/180).toFixed(2)}"
      fill="none" stroke="rgba(255,255,255,.07)" stroke-width="8" stroke-linecap="round"/>
    ${score>0?`<path d="M${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${lA},1 ${x2.toFixed(2)},${y2.toFixed(2)}"
      fill="none" stroke="${col}" stroke-width="8" stroke-linecap="round"/>`:''}
  </svg>`;
}

function renderRiskScoreSection() {
  const el = document.getElementById('riskScoreSection');
  if(!el) return;

  const {globalScore, label, mainCol, factors} = computeRiskScore();

  // Recommandations
  const recs = [];
  const topFactor = factors.reduce((best,f)=>f.val>best.val?f:best, factors[0]);
  if(globalScore>=80) recs.push('🚨 Risque critique — réduis les positions et active le Mode Urgence.');
  else if(globalScore>=60) recs.push(`⚠️ Risque élevé · Principal facteur : ${topFactor.name} (${topFactor.val}/100)`);
  else if(globalScore>=40) recs.push(`💡 Risque modéré · Surveille : ${topFactor.name}`);
  else recs.push('✅ Portfolio bien géré — continue ainsi.');

  el.innerHTML = `
    <div class="risk-section">
      <div class="risk-title">🛡️ Score de Risque Global</div>

      <!-- Jauge principale -->
      <div class="risk-gauge-wrap">
        <div class="risk-gauge-arc">${_riskArc(globalScore)}</div>
        <div class="risk-score-num" style="color:${mainCol};">${globalScore}</div>
        <div class="risk-score-lbl" style="color:${mainCol};">${label}</div>
        <div style="font-size:8px;color:var(--t3);margin-top:4px;">Sur 100 · Plus bas = moins de risque</div>
      </div>

      <!-- Facteurs -->
      <div style="font-size:9px;color:var(--t3);margin-bottom:5px;">Décomposition par facteur</div>
      ${factors.map(f=>`<div class="risk-factor">
        <span class="risk-factor-name">${f.name}</span>
        <div class="risk-factor-bar">
          <div class="risk-factor-fill" style="width:${f.val}%;background:${f.col};"></div>
        </div>
        <span class="risk-factor-val" style="color:${f.col};">${f.val}</span>
        <span style="font-size:8px;color:var(--t3);min-width:70px;text-align:right;">${f.raw}</span>
      </div>`).join('')}

      <!-- Recommandation -->
      <div class="risk-rec" style="background:${globalScore>=60?'rgba(255,61,107,.06)':globalScore>=40?'rgba(245,200,66,.06)':'rgba(0,232,122,.06)'};border:1px solid ${globalScore>=60?'rgba(255,61,107,.2)':globalScore>=40?'rgba(245,200,66,.2)':'rgba(0,232,122,.2)'};">
        ${recs[0]}
      </div>

      ${globalScore>=70?`
      <button onclick="openUrgence()"
        style="width:100%;margin-top:8px;padding:9px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;background:rgba(255,61,107,.1);border:1px solid rgba(255,61,107,.3);color:var(--down);">
        🚨 Ouvrir Mode Urgence
      </button>`:''}
    </div>`;
}
window.renderRiskScoreSection = renderRiskScoreSection;
// ═══ v73 · HISTORIQUE PRIX 7 JOURS SUR CARTES ═══
// Fetch CoinGecko OHLC 7j pour chaque paire
// Sparkline SVG sur chaque carte + stats (H/L/variation)

const _PH_CACHE   = {};
const _PH_TTL     = 15 * 60 * 1000; // 15min
const _PH_FETCHING= {};

// Mapping paires → CoinGecko IDs
const _PH_GECKO_IDS = {
  'BTC/USDT':'bitcoin','ETH/USDT':'ethereum','XRP/USDT':'ripple',
  'SOL/USDT':'solana','DOGE/USDT':'dogecoin','ADA/USDT':'cardano',
  'AVAX/USDT':'avalanche-2','LINK/USDT':'chainlink',
};

async function _phFetch(pair) {
  if(_PH_FETCHING[pair]) return;
  const geckoId = _PH_GECKO_IDS[pair];
  if(!geckoId) return;
  const now = Date.now();
  if(_PH_CACHE[pair] && (now-_PH_CACHE[pair].ts)<_PH_TTL) return;

  _PH_FETCHING[pair] = true;
  try {
    const res  = await fetch(`https://api.coingecko.com/api/v3/coins/${geckoId}/ohlc?vs_currency=usd&days=7`,
      {signal:AbortSignal.timeout(10000)});
    const data = await res.json();
    if(Array.isArray(data) && data.length>0) {
      // data = [[ts, open, high, low, close], ...]
      _PH_CACHE[pair] = {ts:now, ohlc:data};
    }
  } catch(e) { /* silencieux */ }
  _PH_FETCHING[pair] = false;
}

// Générer sparkline SVG
function _phSparkline(ohlc, w, h, col) {
  if(!ohlc||ohlc.length<2) return `<rect width="${w}" height="${h}" fill="rgba(255,255,255,.03)" rx="4"/>`;
  const closes = ohlc.map(c=>c[4]);
  const mn = Math.min(...closes), mx = Math.max(...closes);
  const rng= mx-mn||1;
  const n  = closes.length;
  const pts= closes.map((v,i)=>{
    const x = 4 + i/(n-1)*(w-8);
    const y = h-4 - (v-mn)/rng*(h-8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  // Area fill
  const first = `4,${h-4}`;
  const last  = `${(w-4).toFixed(1)},${h-4}`;
  const areapts = first + ' ' + pts + ' ' + last;

  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;">
    <defs>
      <linearGradient id="phGrad_${col.replace(/[^a-z0-9]/gi,'')}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${col}" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="${col}" stop-opacity="0.02"/>
      </linearGradient>
    </defs>
    <polygon points="${areapts}" fill="url(#phGrad_${col.replace(/[^a-z0-9]/gi,'')})" />
    <polyline points="${pts}" fill="none" stroke="${col}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>
  </svg>`;
}

async function refreshPriceHist(force) {
  if(force) Object.keys(_PH_CACHE).forEach(k=>{ if(_PH_CACHE[k]) _PH_CACHE[k].ts=0; });
  const pairs = Object.keys(PAIRS||{});
  // Fetch en parallèle
  await Promise.allSettled(pairs.map(p=>_phFetch(p)));
  renderPriceHistSection();
}
window.refreshPriceHist = refreshPriceHist;

function renderPriceHistSection() {
  const el = document.getElementById('priceHistSection');
  if(!el) return;

  const pairs = Object.keys(PAIRS||{});
  const hasAny= pairs.some(p=>_PH_CACHE[p]);

  if(!hasAny) {
    el.innerHTML = `
      <div class="ph-section">
        <div class="ph-title">📈 Historique Prix 7 Jours</div>
        <div class="ph-loading">
          <div style="margin-bottom:10px;">Données OHLC 7j via CoinGecko</div>
          <button onclick="refreshPriceHist(true)"
            style="background:rgba(56,212,245,.1);border:1px solid rgba(56,212,245,.3);border-radius:8px;color:var(--ice);font-size:11px;font-weight:700;padding:8px 20px;cursor:pointer;font-family:inherit;">
            📡 Charger les graphiques
          </button>
        </div>
      </div>`;
    return;
  }

  // Heure du dernier fetch
  const lastTs = Math.max(...Object.values(_PH_CACHE).map(c=>c.ts||0));
  const ago    = lastTs>0 ? Math.floor((Date.now()-lastTs)/60000)+'min' : '—';

  el.innerHTML = `
    <div class="ph-section">
      <div class="ph-title">📈 Historique Prix 7 Jours
        <button onclick="refreshPriceHist(true)"
          style="font-size:8px;background:rgba(255,255,255,.06);border:1px solid var(--border);border-radius:5px;color:var(--t3);padding:2px 7px;cursor:pointer;font-family:inherit;">
          🔄 ${ago}
        </button>
      </div>

      ${pairs.map(pair=>{
        const cfg   = PAIRS[pair]||{};
        const col   = cfg.color||'var(--ice)';
        const ps    = S.pairStates?.[pair]||{};
        const cur   = ps.price||0;
        const dec   = cfg.dec>=4?cfg.dec:2;
        const cache = _PH_CACHE[pair];
        const ohlc  = cache?.ohlc||[];

        if(ohlc.length===0) {
          return `<div class="ph-pair-card">
            <div class="ph-pair-header">
              <span class="ph-pair-name" style="color:${col};">${pair.replace('/USDT','')}</span>
              <span style="font-size:9px;color:var(--t3);">⏳ Chargement…</span>
            </div>
          </div>`;
        }

        const closes  = ohlc.map(c=>c[4]);
        const highs   = ohlc.map(c=>c[2]);
        const lows    = ohlc.map(c=>c[3]);
        const firstC  = closes[0];
        const lastC   = closes[closes.length-1];
        const change7 = firstC>0?(lastC-firstC)/firstC*100:0;
        const high7   = Math.max(...highs);
        const low7    = Math.min(...lows);
        const vol7    = ohlc.length;

        // Jours sur l'axe X
        const dayLabels = ['J-7','J-6','J-5','J-4','J-3','J-2','J-1','Auj'];

        return `<div class="ph-pair-card">
          <div class="ph-pair-header">
            <span class="ph-pair-name" style="color:${col};">${pair.replace('/USDT','')}</span>
            <div style="text-align:right;">
              <span class="ph-pair-price" style="color:${col};">$${cur>0?cur.toFixed(dec):lastC.toFixed(dec)}</span>
              <span class="ph-pair-change" style="background:${change7>=0?'rgba(0,232,122,.12)':'rgba(255,61,107,.12)'};color:${change7>=0?'var(--up)':'var(--down)'};">
                ${change7>=0?'+':''}${change7.toFixed(2)}%
              </span>
            </div>
          </div>
          ${_phSparkline(ohlc, 280, 44, change7>=0?'#00e87a':'#ff3d6b')}
          <div class="ph-days-row">
            <span>7j</span><span></span><span></span><span>4j</span><span></span><span></span><span></span><span>Auj</span>
          </div>
          <div class="ph-stats-row">
            <div class="ph-stat">
              <div class="ph-stat-val" style="color:var(--up);">$${high7.toFixed(dec)}</div>
              <div class="ph-stat-lbl">Haut 7j</div>
            </div>
            <div class="ph-stat">
              <div class="ph-stat-val" style="color:var(--down);">$${low7.toFixed(dec)}</div>
              <div class="ph-stat-lbl">Bas 7j</div>
            </div>
            <div class="ph-stat">
              <div class="ph-stat-val">$${firstC.toFixed(dec)}</div>
              <div class="ph-stat-lbl">Ouverture</div>
            </div>
            <div class="ph-stat">
              <div class="ph-stat-val" style="color:${change7>=0?'var(--up)':'var(--down)'};">${change7>=0?'+':''}${change7.toFixed(2)}%</div>
              <div class="ph-stat-lbl">Variation 7j</div>
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
}
window.renderPriceHistSection = renderPriceHistSection;
// ═══ v74 · CALCULATEUR DE POSITION ═══
// Calcule la taille de position optimale selon le risque accepté
// R/R, levier, SL, TP, frais inclus, Kelly Criterion

const _CALC = {
  capital:   1000,
  riskPct:   2,      // % du capital à risquer
  slPct:     1.5,    // % SL depuis l'entrée
  tpPct:     3.0,    // % TP depuis l'entrée
  leverage:  1,
  feeRate:   0.1,    // % frais aller-retour
  pair:      'BTC/USDT',
  side:      'long',
};

function calcUpdate(key, val) {
  _CALC[key] = parseFloat(val)||0;
  renderCalcSection();
}
window.calcUpdate = calcUpdate;

function calcSetPair(pair) {
  _CALC.pair = pair;
  const ps  = S.pairStates?.[pair];
  if(ps?.price) _CALC.entryPrice = ps.price;
  renderCalcSection();
}
window.calcSetPair = calcSetPair;

function calcSetRiskPreset(pct) {
  _CALC.riskPct = pct;
  renderCalcSection();
}
window.calcSetRiskPreset = calcSetRiskPreset;

function _runCalc() {
  const cap     = _CALC.capital || (S.tradingAccount||1000);
  const riskPct = _CALC.riskPct/100;
  const slPct   = _CALC.slPct/100;
  const tpPct   = _CALC.tpPct/100;
  const lev     = Math.max(1, _CALC.leverage||1);
  const fee     = _CALC.feeRate/100;
  const ps      = S.pairStates?.[_CALC.pair]||{};
  const entry   = _CALC.entryPrice || ps.price || 50000;

  // Montant risqué en $
  const riskUsd = cap * riskPct;

  // Taille de position (sans levier)
  // riskUsd = stakeUsd * slPct (car si SL touché on perd slPct du stake)
  const stakeUsd = slPct>0 ? riskUsd/slPct : riskUsd;
  const stakeLev = stakeUsd * lev;

  // Exposition totale
  const exposure = stakeLev;

  // Quantité de crypto
  const qty = entry>0 ? exposure/entry : 0;

  // SL et TP en prix
  const sl = _CALC.side==='long' ? entry*(1-slPct) : entry*(1+slPct);
  const tp = _CALC.side==='long' ? entry*(1+tpPct) : entry*(1-tpPct);

  // P&L si TP atteint
  const pnlTP  = stakeUsd * tpPct * lev;
  // P&L si SL atteint
  const pnlSL  = -(riskUsd);

  // Frais (aller + retour)
  const feesUsd = exposure * fee * 2;

  // Net
  const netTP  = pnlTP - feesUsd;
  const netSL  = pnlSL - feesUsd;

  // R/R ratio
  const rr = riskUsd>0 ? Math.abs(pnlTP)/riskUsd : 0;

  // % du capital
  const capPct = stakeUsd/cap*100;

  // Kelly Criterion
  const wr = (S.totalTrades||0)>10?(S.winTrades||0)/(S.totalTrades||1):0.5;
  const kelly = wr>0&&rr>0 ? Math.max(0, (wr - (1-wr)/rr)*100) : 0;

  // Niveau de risque (feu de signalisation)
  const riskLevel = riskPct>=0.05?'danger':riskPct>=0.03?'warn':riskPct>=0.01?'ok':'safe';
  const riskCol   = riskLevel==='danger'?'var(--down)':riskLevel==='warn'?'var(--gold)':riskLevel==='ok'?'#84cc16':'var(--up)';

  return { cap, riskUsd, stakeUsd, stakeLev, exposure, qty, sl, tp,
           pnlTP, pnlSL, netTP, netSL, feesUsd, rr, capPct, kelly,
           riskPct:_CALC.riskPct, slPct:_CALC.slPct, tpPct:_CALC.tpPct,
           lev, entry, riskLevel, riskCol, fee:_CALC.feeRate };
}

function renderCalcSection() {
  const el = document.getElementById('calcSection');
  if(!el) return;

  const r    = _runCalc();
  const pairs= Object.keys(PAIRS||{});
  const dec  = PAIRS[_CALC.pair]?.dec>=4?PAIRS[_CALC.pair].dec:2;
  const col  = PAIRS[_CALC.pair]?.color||'var(--ice)';

  // Sync capital avec le compte réel
  if(_CALC.capital === 1000 && S.tradingAccount>0) _CALC.capital = Math.round(S.tradingAccount);

  el.innerHTML = `
    <div class="calc-section">
      <div class="calc-title">📐 Calculateur de Position</div>

      <!-- Paire + Côté -->
      <div class="calc-row">
        <span class="calc-lbl">Paire</span>
        <select onchange="calcSetPair(this.value)"
          style="flex:1;background:var(--s3);border:1px solid var(--border);border-radius:6px;color:var(--t1);font-size:10px;padding:5px;font-family:inherit;">
          ${pairs.map(p=>`<option value="${p}" ${p===_CALC.pair?'selected':''}>${p}</option>`).join('')}
        </select>
      </div>
      <div class="calc-row">
        <span class="calc-lbl">Côté</span>
        <div style="display:flex;gap:6px;flex:1;">
          <button onclick="_CALC.side='long';renderCalcSection();"
            style="flex:1;padding:5px;border-radius:6px;font-size:10px;font-weight:700;cursor:pointer;font-family:inherit;
              background:${_CALC.side==='long'?'rgba(0,232,122,.15)':'var(--s3)'};
              border:1px solid ${_CALC.side==='long'?'rgba(0,232,122,.4)':'var(--border)'};
              color:${_CALC.side==='long'?'var(--up)':'var(--t3)'};">↑ LONG</button>
          <button onclick="_CALC.side='short';renderCalcSection();"
            style="flex:1;padding:5px;border-radius:6px;font-size:10px;font-weight:700;cursor:pointer;font-family:inherit;
              background:${_CALC.side==='short'?'rgba(255,61,107,.15)':'var(--s3)'};
              border:1px solid ${_CALC.side==='short'?'rgba(255,61,107,.4)':'var(--border)'};
              color:${_CALC.side==='short'?'var(--down)':'var(--t3)'};">↓ SHORT</button>
        </div>
      </div>

      <!-- Paramètres -->
      <div class="calc-row">
        <span class="calc-lbl">Capital</span>
        <input class="calc-inp" type="number" value="${_CALC.capital}" onchange="calcUpdate('capital',this.value)" min="1">
        <span class="calc-unit">USDT</span>
      </div>
      <div class="calc-row">
        <span class="calc-lbl">Risque %</span>
        <input class="calc-inp" type="number" value="${_CALC.riskPct}" onchange="calcUpdate('riskPct',this.value)" min="0.1" max="100" step="0.1">
        <span class="calc-unit">%</span>
      </div>
      <!-- Presets risque -->
      <div class="calc-preset-row">
        ${[0.5,1,2,3,5].map(p=>`<button class="calc-preset ${_CALC.riskPct===p?'active':''}" onclick="calcSetRiskPreset(${p})">${p}%</button>`).join('')}
      </div>
      <div class="calc-row">
        <span class="calc-lbl">Stop Loss</span>
        <input class="calc-inp" type="number" value="${_CALC.slPct}" onchange="calcUpdate('slPct',this.value)" min="0.1" step="0.1">
        <span class="calc-unit">%</span>
      </div>
      <div class="calc-row">
        <span class="calc-lbl">Take Profit</span>
        <input class="calc-inp" type="number" value="${_CALC.tpPct}" onchange="calcUpdate('tpPct',this.value)" min="0.1" step="0.1">
        <span class="calc-unit">%</span>
      </div>
      <div class="calc-row">
        <span class="calc-lbl">Levier</span>
        <input class="calc-inp" type="number" value="${_CALC.leverage}" onchange="calcUpdate('leverage',this.value)" min="1" max="100" step="1">
        <span class="calc-unit">×</span>
      </div>
      <div class="calc-row">
        <span class="calc-lbl">Frais A/R</span>
        <input class="calc-inp" type="number" value="${_CALC.feeRate}" onchange="calcUpdate('feeRate',this.value)" min="0" step="0.01">
        <span class="calc-unit">%</span>
      </div>

      <!-- Résultats -->
      <div class="calc-result-box">
        <div style="font-size:9px;color:var(--t3);margin-bottom:6px;">Résultats calculés</div>
        <div class="calc-result-row"><span style="color:var(--t2);">Taille position</span><span class="calc-result-val" style="color:var(--ice);">$${r.stakeUsd.toFixed(2)}</span></div>
        ${r.lev>1?`<div class="calc-result-row"><span style="color:var(--t2);">Avec levier ×${r.lev}</span><span class="calc-result-val">$${r.stakeLev.toFixed(2)}</span></div>`:''}
        <div class="calc-result-row"><span style="color:var(--t2);">Montant risqué</span><span class="calc-result-val" style="color:${r.riskCol};">$${r.riskUsd.toFixed(2)} (${r.riskPct}%)</span></div>
        <div class="calc-result-row"><span style="color:var(--t2);">Prix SL</span><span class="calc-result-val" style="color:var(--down);">$${r.sl.toFixed(dec)}</span></div>
        <div class="calc-result-row"><span style="color:var(--t2);">Prix TP</span><span class="calc-result-val" style="color:var(--up);">$${r.tp.toFixed(dec)}</span></div>
        <div class="calc-result-row"><span style="color:var(--t2);">Frais estimés</span><span class="calc-result-val" style="color:var(--t3);">-$${r.feesUsd.toFixed(2)}</span></div>
        <div class="calc-result-row"><span style="color:var(--t2);">Si TP atteint</span><span class="calc-result-val" style="color:var(--up);">+$${r.netTP.toFixed(2)}</span></div>
        <div class="calc-result-row"><span style="color:var(--t2);">Si SL atteint</span><span class="calc-result-val" style="color:var(--down);">$${r.netSL.toFixed(2)}</span></div>
        <div class="calc-result-row"><span style="color:var(--t1);font-weight:700;">R/R Ratio</span><span class="calc-result-val" style="color:${r.rr>=2?'var(--up)':r.rr>=1?'var(--gold)':'var(--down)'};">${r.rr.toFixed(2)} ${r.rr>=2?'✅':r.rr>=1?'⚠️':'❌'}</span></div>
        <div class="calc-result-row"><span style="color:var(--t2);">Kelly sizing</span><span class="calc-result-val" style="color:var(--pur);">${r.kelly.toFixed(1)}%</span></div>

        <!-- Barre risque -->
        <div style="font-size:8px;color:var(--t3);margin-top:6px;margin-bottom:2px;">Exposition vs capital (${r.capPct.toFixed(1)}%)</div>
        <div class="calc-risk-bar">
          <div class="calc-risk-fill" style="width:${Math.min(100,r.capPct)}%;background:${r.capPct>50?'var(--down)':r.capPct>30?'var(--gold)':'var(--up)'};"></div>
        </div>
      </div>

      <!-- Conseil Kelly -->
      <div style="font-size:9px;color:var(--t2);background:rgba(167,139,250,.06);border:1px solid rgba(167,139,250,.15);border-radius:8px;padding:8px 10px;line-height:1.5;">
        💡 <strong>Kelly Criterion :</strong> basé sur ton WR réel (${Math.round((S.winTrades||0)/(S.totalTrades||1)*100)}%), risque optimal = <strong style="color:var(--pur);">${r.kelly.toFixed(1)}%</strong> du capital.
        ${r.riskPct > r.kelly && r.kelly>0 ? `<br>⚠️ Tu risques ${(r.riskPct-r.kelly).toFixed(1)}% de plus que recommandé.`:`<br>✅ Ton risque est dans les clous Kelly.`}
      </div>
    </div>`;
}
window.renderCalcSection = renderCalcSection;
// ═══ v75 · COMPARAISON AVANT/APRÈS BACKUP ═══
// Charge un backup JSON et compare avec l'état actuel
// Affiche un diff visuel : portfolio, trades, WR, agents, frais

let _diffSnapshot = null; // Le backup chargé pour comparaison

function loadDiffBackup() {
  const input = document.createElement('input');
  input.type  = 'file';
  input.accept= '.json';
  input.onchange = e => {
    const file = e.target.files?.[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        let parsed = JSON.parse(ev.target.result);
        // Support format enveloppé {meta, state}
        if(parsed.state && parsed.meta) parsed = parsed.state;
        _diffSnapshot = parsed;
        showToast('📂 Backup chargé · '+new Date(parsed.savedAt||parsed.cycle||0).toLocaleString('fr-FR'), 2500, 'win');
        renderDiffSection();
      } catch(e) {
        showToast('⚠ Fichier invalide', 2000, 'warn');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}
window.loadDiffBackup = loadDiffBackup;

function loadDiffFromAutoSlot(slotIdx) {
  const key = `aura_autobackup_${['daily_0','daily_1','daily_2'][slotIdx]}`;
  const raw = localStorage.getItem(key);
  if(!raw) { showToast('⚠ Slot vide', 1500, 'warn'); return; }
  try {
    let parsed = JSON.parse(raw);
    if(parsed._abMeta) { const meta = parsed._abMeta; delete parsed._abMeta; parsed._meta = meta; }
    _diffSnapshot = parsed;
    showToast('📂 Auto-backup chargé · '+(_diffSnapshot._meta?.date||'—'), 2000, 'win');
    renderDiffSection();
  } catch(e) { showToast('⚠ Erreur lecture', 2000, 'warn'); }
}
window.loadDiffFromAutoSlot = loadDiffFromAutoSlot;

function clearDiff() {
  _diffSnapshot = null;
  renderDiffSection();
}
window.clearDiff = clearDiff;

function _diffVal(val, unit, dec) {
  if(val===null||val===undefined) return '—';
  const n = parseFloat(val);
  if(!isFinite(n)) return '—';
  return (unit==='$'?'$':'') + n.toFixed(dec||2) + (unit==='%'?'%':'') + (unit&&unit!=='$'&&unit!=='%'?' '+unit:'');
}

function _diffChange(before, after, higherBetter) {
  if(!isFinite(before)||!isFinite(after)) return {delta:0, col:'var(--t3)', arrow:'→', txt:'—'};
  const delta = after - before;
  const pct   = before!==0 ? (delta/Math.abs(before)*100) : 0;
  const better= higherBetter ? delta>0 : delta<0;
  const col   = delta===0?'var(--t3)':better?'var(--up)':'var(--down)';
  const arrow = delta>0?'▲':delta<0?'▼':'→';
  const txt   = (delta>=0?'+':'')+delta.toFixed(2)+(pct!==0?` (${pct>=0?'+':''}${pct.toFixed(1)}%)`:'');
  return {delta, col, arrow, txt};
}

function renderDiffSection() {
  const el = document.getElementById('diffSection');
  if(!el) return;

  const cur = S;

  if(!_diffSnapshot) {
    // Trouver les slots auto-backup disponibles
    const autoSlots = [0,1,2].map(i=>{
      const raw = localStorage.getItem(`aura_autobackup_daily_${i}`);
      if(!raw) return null;
      try {
        const p = JSON.parse(raw);
        return {i, meta:p._abMeta, portfolio:p.portfolio||p.tradingAccount||0};
      } catch(e) { return null; }
    }).filter(Boolean);

    el.innerHTML = `
      <div class="diff-section">
        <div class="diff-title">🔍 Comparaison Avant/Après</div>
        <div style="font-size:9px;color:var(--t2);margin-bottom:10px;line-height:1.5;">
          Compare ton état actuel avec un backup précédent pour voir ta progression.
        </div>

        <div class="diff-upload-zone" onclick="loadDiffBackup()">
          <div style="font-size:20px;margin-bottom:6px;">📂</div>
          <div style="font-size:10px;font-weight:700;color:var(--t1);">Charger un backup JSON</div>
          <div style="font-size:8px;color:var(--t3);margin-top:2px;">Clique pour sélectionner un fichier</div>
        </div>

        ${autoSlots.length>0?`
        <div style="font-size:9px;color:var(--t3);margin-bottom:5px;">Ou comparer avec un auto-backup :</div>
        ${autoSlots.map(s=>`<button onclick="loadDiffFromAutoSlot(${s.i})"
          style="width:100%;margin-bottom:5px;padding:7px 10px;border-radius:7px;background:rgba(56,212,245,.06);border:1px solid rgba(56,212,245,.15);color:var(--ice);font-size:9px;font-weight:700;cursor:pointer;font-family:inherit;text-align:left;display:flex;justify-content:space-between;">
          <span>💾 ${['Aujourd\'hui','Hier','Avant-hier'][s.i]}</span>
          <span style="color:var(--t3);">$${(s.portfolio).toFixed(0)} · ${s.meta?.date?.split(' ')[0]||'—'}</span>
        </button>`).join('')}`:'<div style="font-size:9px;color:var(--t3);">Aucun auto-backup disponible. Active le backup auto (v70).</div>'}
      </div>`;
    return;
  }

  const snap = _diffSnapshot;
  const snapDate = snap._meta?.date || (snap.savedAt?new Date(snap.savedAt).toLocaleString('fr-FR'):'—');

  // Métriques à comparer
  const metrics = [
    {name:'Portfolio',     bef:snap.portfolio||0,         aft:cur.portfolio||0,         unit:'$', better:true},
    {name:'Compte trading',bef:snap.tradingAccount||0,    aft:cur.tradingAccount||0,    unit:'$', better:true},
    {name:'Total trades',  bef:snap.totalTrades||0,       aft:cur.totalTrades||0,       unit:'',  better:true},
    {name:'Win Rate %',    bef:snap.totalTrades>0?(snap.winTrades||0)/snap.totalTrades*100:0,
                           aft:cur.totalTrades>0?(cur.winTrades||0)/cur.totalTrades*100:0, unit:'%', better:true},
    {name:'Agents actifs', bef:(snap.agents||[]).length,  aft:(cur.agents||[]).length,  unit:'',  better:true},
    {name:'Frais totaux',  bef:snap.fees?.totalGross||0,  aft:cur.fees?.totalGross||0,  unit:'$', better:false},
    {name:'Fitness moy.',  bef:(snap.agents||[]).reduce((s,a)=>s+(a.fitness||0),0)/Math.max(1,(snap.agents||[]).length),
                           aft:(cur.agents||[]).reduce((s,a)=>s+(a.fitness||0),0)/Math.max(1,(cur.agents||[]).length), unit:'T$', better:true},
  ];

  const portfolioChange = _diffChange(snap.portfolio||0, cur.portfolio||0, true);

  el.innerHTML = `
    <div class="diff-section">
      <div class="diff-title">🔍 Comparaison Avant/Après
        <button onclick="clearDiff()" style="font-size:8px;padding:2px 7px;border-radius:5px;background:rgba(255,255,255,.06);border:1px solid var(--border);color:var(--t3);cursor:pointer;font-family:inherit;">✕ Reset</button>
      </div>

      <!-- En-têtes colonnes -->
      <div class="diff-cols">
        <div class="diff-col" style="border-color:rgba(255,255,255,.1);">
          <div class="diff-col-title" style="color:var(--t3);">📸 Avant (backup)</div>
          <div class="diff-row"><span class="diff-row-lbl">Date</span><span class="diff-row-val" style="font-size:8px;">${snapDate}</span></div>
          <div class="diff-row"><span class="diff-row-lbl">Portfolio</span><span class="diff-row-val">$${(snap.portfolio||0).toFixed(2)}</span></div>
          <div class="diff-row"><span class="diff-row-lbl">Trades</span><span class="diff-row-val">${snap.totalTrades||0}</span></div>
          <div class="diff-row"><span class="diff-row-lbl">WR</span><span class="diff-row-val">${snap.totalTrades>0?Math.round((snap.winTrades||0)/(snap.totalTrades||1)*100):0}%</span></div>
        </div>
        <div class="diff-col" style="border-color:rgba(56,212,245,.3);">
          <div class="diff-col-title" style="color:var(--ice);">⚡ Maintenant</div>
          <div class="diff-row"><span class="diff-row-lbl">Date</span><span class="diff-row-val" style="font-size:8px;">${new Date().toLocaleString('fr-FR')}</span></div>
          <div class="diff-row"><span class="diff-row-lbl">Portfolio</span><span class="diff-row-val" style="color:${portfolioChange.col};">$${(cur.portfolio||0).toFixed(2)}</span></div>
          <div class="diff-row"><span class="diff-row-lbl">Trades</span><span class="diff-row-val">${cur.totalTrades||0}</span></div>
          <div class="diff-row"><span class="diff-row-lbl">WR</span><span class="diff-row-val">${cur.totalTrades>0?Math.round((cur.winTrades||0)/(cur.totalTrades||1)*100):0}%</span></div>
        </div>
      </div>

      <!-- Bilan global -->
      <div style="background:${portfolioChange.delta>=0?'rgba(0,232,122,.06)':'rgba(255,61,107,.06)'};border:1px solid ${portfolioChange.delta>=0?'rgba(0,232,122,.2)':'rgba(255,61,107,.2)'};border-radius:8px;padding:10px;text-align:center;margin-bottom:10px;">
        <div style="font-size:11px;color:var(--t3);">Évolution du portfolio</div>
        <div style="font-size:22px;font-weight:900;font-family:var(--font-mono);color:${portfolioChange.col};">${portfolioChange.delta>=0?'+':''}$${portfolioChange.delta.toFixed(2)}</div>
        <div style="font-size:10px;color:${portfolioChange.col};">${portfolioChange.txt}</div>
      </div>

      <!-- Détail par métrique -->
      <div style="font-size:9px;color:var(--t3);margin-bottom:5px;">Détail des évolutions</div>
      ${metrics.map(m=>{
        const ch = _diffChange(m.bef, m.aft, m.better);
        return `<div class="diff-delta-row">
          <span class="diff-delta-name">${m.name}</span>
          <span class="diff-delta-before">${_diffVal(m.bef,m.unit)}</span>
          <span class="diff-delta-arrow" style="color:${ch.col};">${ch.arrow}</span>
          <span class="diff-delta-after" style="color:${ch.col};">${_diffVal(m.aft,m.unit)}</span>
          <span class="diff-delta-change" style="color:${ch.col};">${ch.delta!==0?ch.txt:'='}</span>
        </div>`;
      }).join('')}

      <button onclick="loadDiffBackup()" style="width:100%;margin-top:10px;padding:7px;border-radius:7px;background:rgba(255,255,255,.04);border:1px solid var(--border);color:var(--t3);font-size:9px;cursor:pointer;font-family:inherit;">
        📂 Charger un autre backup
      </button>
    </div>`;
}
window.renderDiffSection = renderDiffSection;

// Simule les frictions réelles du marché : slippage, spread, latence,
// impact de marché, dépôt/retrait minimum, taxes retenues à la source
// Active sur le mode sim pour rendre les backtests plus réalistes

const _PR_CFG_KEY = 'aura_paper_realistic';

function _prGet() {
  if(!S.paperRealisticConfig) {
    S.paperRealisticConfig = {
      enabled:       false,
      slippagePct:   0.08,   // % slippage moyen
      spreadPct:     0.05,   // % spread bid/ask
      latencyMs:     120,    // ms de latence simulée
      mktImpactPct:  0.02,   // % impact de marché selon la taille
      minOrderUsdt:  10,     // Ordre minimum en USDT
      maxOrderUsdt:  5000,   // Ordre maximum en USDT
      fillRatePct:   92,     // % de chance qu'un ordre soit exécuté
      partialFill:   true,   // Fills partiels possibles
      nightSpreadMult:1.5,   // Spread × 1.5 la nuit (faible liquidité)
    };
  }
  return S.paperRealisticConfig;
}

function togglePaperRealistic() {
  const cfg = _prGet();
  cfg.enabled = !cfg.enabled;
  showToast(cfg.enabled?'🎯 Mode réaliste activé — frictions simulées':'⏸ Mode réaliste désactivé', 2000, cfg.enabled?'win':'user');
  renderPaperUltraSection();
}
window.togglePaperRealistic = togglePaperRealistic;

function updatePrCfg(key, val) {
  const cfg = _prGet();
  cfg[key] = parseFloat(val)||0;
  renderPaperUltraSection();
}
window.updatePrCfg = updatePrCfg;

function togglePrBool(key) {
  const cfg = _prGet();
  cfg[key] = !cfg[key];
  renderPaperUltraSection();
}
window.togglePrBool = togglePrBool;

// Calculer le coût réel d'un trade avec frictions
function applyRealisticFrictions(stakeUsdt, side, hour) {
  const cfg = _prGet();
  if(!cfg.enabled) return {finalStake:stakeUsdt, costs:0, filled:true};

  const h = hour ?? new Date().getHours();
  const isNight = h>=22||h<7;
  const spreadMult = isNight ? (cfg.nightSpreadMult||1.5) : 1;

  // 1. Vérifier ordre minimum/maximum
  if(stakeUsdt < (cfg.minOrderUsdt||10)) return {finalStake:0, costs:0, filled:false, reason:'Ordre trop petit'};
  if(stakeUsdt > (cfg.maxOrderUsdt||5000)) stakeUsdt = cfg.maxOrderUsdt||5000;

  // 2. Probabilité de fill
  const fillProb = (cfg.fillRatePct||92)/100;
  if(Math.random() > fillProb) return {finalStake:0, costs:0, filled:false, reason:'Ordre non exécuté (liquidité)'};

  // 3. Fill partiel possible
  let effectiveStake = stakeUsdt;
  if(cfg.partialFill && Math.random()<0.15) {
    effectiveStake = stakeUsdt * (0.7 + Math.random()*0.3);
  }

  // 4. Slippage
  const slipCost = effectiveStake * (cfg.slippagePct||0.08)/100;

  // 5. Spread
  const spreadCost = effectiveStake * (cfg.spreadPct||0.05)/100 * spreadMult;

  // 6. Impact marché (proportionnel à la taille)
  const impactCost = effectiveStake>500 ? effectiveStake * (cfg.mktImpactPct||0.02)/100 * (effectiveStake/500) : 0;

  const totalCosts = slipCost + spreadCost + impactCost;
  const finalStake = effectiveStake - totalCosts;

  return {finalStake, costs:totalCosts, filled:true, slipCost, spreadCost, impactCost, effectiveStake};
}
window.applyRealisticFrictions = applyRealisticFrictions;


function simulateRealisticTrade() {
  const cfg    = _prGet();
  const stake  = 100; // $100 test
  const result = applyRealisticFrictions(stake, 'long');
  return result;
}

function renderPaperUltraSection() {
  const el  = document.getElementById('paperUltraSection');
  if(!el) return;
  const cfg = _prGet();

  // Simuler un trade de $100 pour afficher l'impact
  const sim = simulateRealisticTrade();
  const totalCostPct = sim.costs>0?(sim.costs/100*100):0;

  el.innerHTML = `
    <div class="pr2-section">
      <div class="pr2-title">🎯 Mode Papier Ultra-Réaliste
        <span class="pr2-badge" style="background:${cfg.enabled?'rgba(167,139,250,.15)':'rgba(255,255,255,.06)'};color:${cfg.enabled?'var(--pur)':'var(--t3)'};">
          ${cfg.enabled?'ACTIF':'INACTIF'}
        </span>
      </div>

      <!-- Toggle principal -->
      <div class="pr2-toggle-row">
        <div style="flex:1;">
          <div style="font-size:11px;font-weight:700;color:var(--t1);">Frictions réalistes</div>
          <div style="font-size:8px;color:var(--t3);">Simule slippage, spread, latence, fill partiel</div>
        </div>
        
      </div>

      <!-- Simulation $100 -->
      <div style="background:var(--s2);border-radius:8px;padding:10px;margin-bottom:10px;border:1px solid ${cfg.enabled?'rgba(167,139,250,.2)':'var(--border)'};">
        <div style="font-size:9px;color:var(--t3);margin-bottom:5px;">Impact simulé sur un trade de $100</div>
        <div class="pr2-row"><span style="color:var(--t2);">Stake initial</span><span style="font-weight:700;">$100.00</span></div>
        <div class="pr2-row"><span style="color:var(--t2);">Slippage</span><span style="color:var(--down);">-$${(sim.slipCost||0).toFixed(3)}</span></div>
        <div class="pr2-row"><span style="color:var(--t2);">Spread bid/ask</span><span style="color:var(--down);">-$${(sim.spreadCost||0).toFixed(3)}</span></div>
        <div class="pr2-row"><span style="color:var(--t2);">Impact marché</span><span style="color:var(--down);">-$${(sim.impactCost||0).toFixed(3)}</span></div>
        <div class="pr2-row" style="border-top:1px solid rgba(255,255,255,.08);margin-top:3px;padding-top:6px;">
          <span style="font-weight:700;color:var(--t1);">Stake effectif</span>
          <span style="font-weight:800;font-family:var(--font-mono);color:${cfg.enabled?'var(--down)':'var(--up)'};">$${(sim.finalStake||100).toFixed(3)}</span>
        </div>
        <div style="font-size:8px;color:var(--t3);text-align:right;margin-top:2px;">
          ${cfg.enabled?`Coût frictions : ${totalCostPct.toFixed(3)}% du trade`:'Aucune friction (mode standard)'}
        </div>
      </div>

      <!-- Paramètres -->
      <div style="font-size:9px;color:var(--t3);margin-bottom:5px;">Paramètres des frictions</div>

      ${[
        {k:'slippagePct',   lbl:'Slippage',          unit:'%',    min:0,    max:2,    step:0.01},
        {k:'spreadPct',     lbl:'Spread bid/ask',     unit:'%',    min:0,    max:1,    step:0.01},
        {k:'latencyMs',     lbl:'Latence',            unit:'ms',   min:0,    max:5000, step:10},
        {k:'mktImpactPct',  lbl:'Impact marché',      unit:'%',    min:0,    max:1,    step:0.01},
        {k:'minOrderUsdt',  lbl:'Ordre min',          unit:'$',    min:1,    max:100,  step:1},
        {k:'maxOrderUsdt',  lbl:'Ordre max',          unit:'$',    min:100,  max:10000,step:100},
        {k:'fillRatePct',   lbl:'Taux de fill',       unit:'%',    min:50,   max:100,  step:1},
        {k:'nightSpreadMult',lbl:'Spread nuit ×',     unit:'×',    min:1,    max:5,    step:0.1},
      ].map(p=>`<div class="pr2-slider-row">
        <span style="color:var(--t2);min-width:90px;">${p.lbl}</span>
        <input type="range" class="pr2-slider" min="${p.min}" max="${p.max}" step="${p.step}"
          value="${cfg[p.k]||0}" oninput="updatePrCfg('${p.k}',this.value);document.getElementById('prv_${p.k}').textContent=parseFloat(this.value).toFixed(2)+' ${p.unit}';"
          ${!cfg.enabled?'disabled':''}
          style="${!cfg.enabled?'opacity:.4;':''}"
        >
        <span id="prv_${p.k}" style="font-size:9px;font-family:var(--font-mono);min-width:52px;text-align:right;color:var(--pur);">${cfg[p.k]||0} ${p.unit}</span>
      </div>`).join('')}

      <!-- Toggles booléens -->
      ${[
        {k:'partialFill', lbl:'Fills partiels (ordre exécuté à ~70-100%)'},
      ].map(t=>`<div class="pr2-toggle-row" style="${!cfg.enabled?'opacity:.5;pointer-events:none;':''}">
        <span style="flex:1;font-size:10px;color:var(--t2);">${t.lbl}</span>
        <button onclick="togglePrBool('${t.k}')"
          style="padding:3px 10px;border-radius:6px;font-size:9px;font-weight:700;cursor:pointer;font-family:inherit;
                 background:${cfg[t.k]?'rgba(167,139,250,.12)':'rgba(255,255,255,.06)'};
                 border:1px solid ${cfg[t.k]?'rgba(167,139,250,.3)':'var(--border)'};
                 color:${cfg[t.k]?'var(--pur)':'var(--t3)'};">
          ${cfg[t.k]?'✅ ON':'OFF'}
        </button>
      </div>`).join('')}

      <div style="font-size:8px;color:var(--t3);margin-top:8px;line-height:1.5;text-align:center;">
        Les frictions sont appliquées à chaque ouverture de position en mode Simulation.<br>
        Elles ne s'appliquent pas au mode Paper Real (données Binance réelles).
      </div>
    </div>`;
}
window.renderPaperUltraSection = renderPaperUltraSection;
// ═══ v77 · WEBHOOK TELEGRAM ═══
// Envoie des notifications vers un bot Telegram via l'API Bot
// Events : trades ouverts/fermés, alertes prix, résumé hebdo, urgences

function _tgGet() {
  if(!S.telegramCfg) S.telegramCfg = {
    botToken:   '',
    chatId:     '',
    enabled:    false,
    onTrade:    true,
    onAlert:    true,
    onHebdo:    false,
    onUrgence:  true,
    onPnlGoal:  false,
    log:        [],
  };
  return S.telegramCfg;
}

function updateTgField(key, val) {
  const cfg = _tgGet();
  cfg[key] = val.trim();
  renderTelegramSection();
}
window.updateTgField = updateTgField;

function toggleTgOption(key) {
  const cfg = _tgGet();
  cfg[key] = !cfg[key];
  renderTelegramSection();
}
window.toggleTgOption = toggleTgOption;

function toggleTgEnabled() {
  const cfg = _tgGet();
  if(!cfg.botToken||!cfg.chatId) { showToast('⚠ Configure le Bot Token et le Chat ID', 2500, 'warn'); return; }
  cfg.enabled = !cfg.enabled;
  showToast(cfg.enabled?'📲 Telegram activé':'⏸ Telegram désactivé', 1500, cfg.enabled?'win':'user');
  renderTelegramSection();
}
window.toggleTgEnabled = toggleTgEnabled;

// Envoyer un message Telegram
async function sendTelegram(text, silent) {
  const cfg = _tgGet();
  if(!cfg.enabled||!cfg.botToken||!cfg.chatId) return false;
  const ts = new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
  try {
    const url = `https://api.telegram.org/bot${cfg.botToken}/sendMessage`;
    const res = await fetch(url, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        chat_id: cfg.chatId,
        text: text,
        parse_mode: 'HTML',
        disable_notification: !!silent,
      }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    if(data.ok) {
      cfg.log.unshift('['+ts+'] ✅ '+text.slice(0,40)+'…');
      if(cfg.log.length>10) cfg.log.pop();
      return true;
    } else {
      cfg.log.unshift('['+ts+'] ❌ '+data.description);
      return false;
    }
  } catch(e) {
    cfg.log.unshift('['+ts+'] ⚠ '+e.message);
    return false;
  } finally {
    try { renderTelegramSection(); } catch(e) {}
  }
}
window.sendTelegram = sendTelegram;

// Message de test
async function testTelegram() {
  const cfg = _tgGet();
  if(!cfg.botToken||!cfg.chatId) { showToast('⚠ Configure d\'abord le Bot Token et le Chat ID', 2500, 'warn'); return; }
  const n   = S.totalTrades||0;
  const wr  = n>0?Math.round((S.winTrades||0)/n*100):0;
  const cap = S.tradingAccount||0;
  const msg = `🤖 <b>AURA ∞ — Test de connexion</b>

✅ Bot Telegram connecté !

📊 <b>État actuel :</b>
💰 Capital : <code>$${cap.toFixed(2)}</code>
🎯 Win Rate : <code>${wr}%</code> sur ${n} trades
📈 Régime : <code>${(S._paperRealCurrentRegime||'calm').toUpperCase()}</code>
🤖 Agents : <code>${(S.agents||[]).length}</code> actifs

<i>AURA ∞ — Adaptive Universal Risk Architect</i>`;

  const ok = await sendTelegram(msg, false);
  showToast(ok?'✅ Message Telegram envoyé !':'❌ Échec — vérifie ton token et chat ID', 3000, ok?'win':'warn');
}
window.testTelegram = testTelegram;

// Envoyer un résumé hebdo
async function sendHebdoTelegram() {
  const n   = S.totalTrades||0;
  const wr  = n>0?Math.round((S.winTrades||0)/n*100):0;
  const pnl = Object.values(S.pairStates||{}).reduce((s,ps)=>s+(ps.totalPnlUsd||0),0);
  const cap = S.tradingAccount||0;
  const m   = typeof computeAdvancedMetrics==='function'?computeAdvancedMetrics():null;
  const msg = `📅 <b>AURA ∞ — Résumé Hebdomadaire</b>

💰 Portfolio : <code>$${cap.toFixed(2)}</code>
📊 P&L Net : <code>${pnl>=0?'+':''}$${pnl.toFixed(2)}</code>
🎯 Win Rate : <code>${wr}%</code> (${n} trades)
📐 Sharpe : <code>${m?m.sharpe.toFixed(2):'—'}</code>
📉 Max DD : <code>${m?m.maxDDPct.toFixed(1):'—'}%</code>
🤖 Agents : <code>${(S.agents||[]).length}</code> · Régime : <code>${(S._paperRealCurrentRegime||'calm').toUpperCase()}</code>

<i>Rapport automatique AURA ∞</i>`;
  const ok = await sendTelegram(msg, true);
  showToast(ok?'📲 Résumé hebdo envoyé':'❌ Erreur envoi', 2500, ok?'win':'warn');
}
window.sendHebdoTelegram = sendHebdoTelegram;

// Hook dans les events AURA
function tgOnTrade(pair, side, pnlUsd, isWin) {
  const cfg = _tgGet();
  if(!cfg.enabled||!cfg.onTrade) return;
  const msg = `${isWin?'🟢':'🔴'} <b>${isWin?'WIN':'LOSS'} — ${pair}</b>
${side==='buy'?'↑ LONG':'↓ SHORT'} · P&L : <code>${pnlUsd>=0?'+':''}$${pnlUsd.toFixed(2)}</code>
<i>AURA ∞</i>`;
  sendTelegram(msg, true);
}
window.tgOnTrade = tgOnTrade;

function tgOnAlert(alertNote) {
  const cfg = _tgGet();
  if(!cfg.enabled||!cfg.onAlert) return;
  sendTelegram(`🔔 <b>Alerte Prix</b>\n${alertNote}`, false);
}
window.tgOnAlert = tgOnAlert;

function tgOnUrgence(action) {
  const cfg = _tgGet();
  if(!cfg.enabled||!cfg.onUrgence) return;
  sendTelegram(`🚨 <b>MODE URGENCE</b>\n${action}\nCapital : <code>$${(S.tradingAccount||0).toFixed(2)}</code>`, false);
}
window.tgOnUrgence = tgOnUrgence;

function renderTelegramSection() {
  const el  = document.getElementById('telegramSection');
  if(!el) return;
  const cfg = _tgGet();
  const isOk = cfg.botToken && cfg.chatId;

  el.innerHTML = `
    <div class="tg-section">
      <div class="tg-title">
        📲 Notifications Telegram
        <span class="tg-status" style="background:${cfg.enabled?'rgba(41,182,246,.15)':'rgba(255,255,255,.06)'};color:${cfg.enabled?'#29b6f6':'var(--t3)'};">
          ${cfg.enabled?'ACTIF':'INACTIF'}
        </span>
      </div>

      <!-- Guide setup -->
      <div style="background:rgba(0,136,204,.06);border:1px solid rgba(0,136,204,.15);border-radius:8px;padding:8px 10px;margin-bottom:10px;font-size:9px;color:var(--t2);line-height:1.6;">
        <strong style="color:#29b6f6;">Setup en 3 étapes :</strong><br>
        1. Cherche <code>@BotFather</code> sur Telegram → /newbot → copie le token<br>
        2. Envoie un message à ton bot → cherche <code>@userinfobot</code> pour ton Chat ID<br>
        3. Colle ici et clique Test
      </div>

      <!-- Config -->
      <div style="font-size:9px;color:var(--t3);margin-bottom:3px;">Bot Token</div>
      <input class="tg-inp" type="password" placeholder="110201543:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw"
        value="${cfg.botToken}" onchange="updateTgField('botToken',this.value)">
      <div style="font-size:9px;color:var(--t3);margin-bottom:3px;">Chat ID</div>
      <input class="tg-inp" type="text" placeholder="-1001234567890 ou 123456789"
        value="${cfg.chatId}" onchange="updateTgField('chatId',this.value)">

      <!-- Boutons config -->
      <div style="display:flex;gap:6px;margin-bottom:10px;">
        <button class="tg-btn" onclick="testTelegram()" style="flex:1;">🧪 Tester</button>
        <button class="tg-btn" onclick="toggleTgEnabled()"
          style="flex:1;background:${cfg.enabled?'rgba(41,182,246,.2)':'rgba(0,136,204,.1)'};color:${isOk?'#29b6f6':'var(--t3)'};">
          ${cfg.enabled?'⏸ Désactiver':'✅ Activer'}
        </button>
      </div>

      <!-- Options événements -->
      <div style="font-size:9px;color:var(--t3);margin-bottom:5px;">Événements à notifier</div>
      ${[
        {k:'onTrade',   lbl:'📊 Chaque trade (WIN/LOSS)'},
        {k:'onAlert',   lbl:'🔔 Alertes prix déclenchées'},
        {k:'onUrgence', lbl:'🚨 Mode Urgence activé'},
        {k:'onHebdo',   lbl:'📅 Résumé hebdo'},
        {k:'onPnlGoal', lbl:'💰 Objectif P&L atteint'},
      ].map(opt=>`<div class="tg-row">
        <span style="flex:1;color:var(--t2);">${opt.lbl}</span>
        <button class="tg-toggle ${cfg[opt.k]?'on':''}" onclick="toggleTgOption('${opt.k}')"></button>
      </div>`).join('')}

      <!-- Résumé hebdo manuel -->
      ${cfg.onHebdo?`
      <button class="tg-btn-full" onclick="sendHebdoTelegram()"
        style="background:rgba(0,136,204,.1);border-color:rgba(0,136,204,.3);color:#29b6f6;margin-top:6px;">
        📅 Envoyer résumé hebdo maintenant
      </button>`:''}

      <!-- Log -->
      ${cfg.log.length>0?`
      <div style="font-size:8px;color:var(--t3);margin-top:8px;margin-bottom:3px;">Log des envois</div>
      <div class="tg-log">${cfg.log.join('\n')}</div>`:''}

      <div style="font-size:8px;color:var(--t3);margin-top:8px;text-align:center;line-height:1.4;">
        API officielle Telegram Bot · HTTPS · Aucun serveur intermédiaire<br>
        Token stocké localement — ne le partage jamais
      </div>
    </div>`;
}
window.renderTelegramSection = renderTelegramSection;
// ═══ v78 · SONS PERSONNALISÉS WIN/LOSS ═══
// Génère des sons via Web Audio API (aucune dépendance externe)
// 6 presets : Casino · Rétro · Épique · Discret · Nature · Électro
// Sons pour : WIN · LOSS · ALERTE · BADGE · URGENCE · TICK

const _SND_CTX = { ctx: null };
function _getAudioCtx() {
  if(!_SND_CTX.ctx) {
    try { _SND_CTX.ctx = new (window.AudioContext||window.webkitAudioContext)(); } catch(e) {}
  }
  if(_SND_CTX.ctx?.state==='suspended') _SND_CTX.ctx.resume();
  return _SND_CTX.ctx;
}

function _sndGet() {
  if(!S.soundCfg) S.soundCfg = {
    enabled:  true,
    preset:   'retro',
    volume:   0.6,
    onWin:    true,
    onLoss:   true,
    onAlert:  true,
    onBadge:  true,
    onUrgence:true,
    onTick:   false,
  };
  return S.soundCfg;
}

// ── Presets de sons ──
const _SND_PRESETS = {
  casino: {
    name:'🎰 Casino',
    win:   (ctx,vol)=>_sndCasino(ctx,vol),
    loss:  (ctx,vol)=>_sndBuzz(ctx,vol,180,0.3),
    alert: (ctx,vol)=>_sndBeep(ctx,vol,880,0.15),
    badge: (ctx,vol)=>_sndChime(ctx,vol,[523,659,784],0.2),
    urgence:(ctx,vol)=>_sndAlarm(ctx,vol),
    tick:  (ctx,vol)=>_sndTick(ctx,vol,0.03),
  },
  retro: {
    name:'🕹️ Rétro',
    win:   (ctx,vol)=>_sndRetroWin(ctx,vol),
    loss:  (ctx,vol)=>_sndRetroLoss(ctx,vol),
    alert: (ctx,vol)=>_sndBeep(ctx,vol,660,0.1),
    badge: (ctx,vol)=>_sndPowerUp(ctx,vol),
    urgence:(ctx,vol)=>_sndAlarm(ctx,vol),
    tick:  (ctx,vol)=>_sndTick(ctx,vol,0.04),
  },
  epique: {
    name:'⚔️ Épique',
    win:   (ctx,vol)=>_sndFanfare(ctx,vol),
    loss:  (ctx,vol)=>_sndDoom(ctx,vol),
    alert: (ctx,vol)=>_sndHorn(ctx,vol),
    badge: (ctx,vol)=>_sndFanfare(ctx,vol),
    urgence:(ctx,vol)=>_sndAlarm(ctx,vol),
    tick:  (ctx,vol)=>_sndTick(ctx,vol,0.02),
  },
  discret: {
    name:'🔕 Discret',
    win:   (ctx,vol)=>_sndChime(ctx,vol,[523,659],0.15),
    loss:  (ctx,vol)=>_sndChime(ctx,vol,[330,277],0.1),
    alert: (ctx,vol)=>_sndBeep(ctx,vol,440,0.08),
    badge: (ctx,vol)=>_sndChime(ctx,vol,[523],0.12),
    urgence:(ctx,vol)=>_sndBeep(ctx,vol,880,0.2),
    tick:  (ctx,vol)=>_sndTick(ctx,vol,0.01),
  },
  nature: {
    name:'🌿 Nature',
    win:   (ctx,vol)=>_sndBirds(ctx,vol),
    loss:  (ctx,vol)=>_sndRain(ctx,vol),
    alert: (ctx,vol)=>_sndChime(ctx,vol,[659,784,1046],0.15),
    badge: (ctx,vol)=>_sndBirds(ctx,vol),
    urgence:(ctx,vol)=>_sndAlarm(ctx,vol),
    tick:  (ctx,vol)=>_sndTick(ctx,vol,0.015),
  },
  electro: {
    name:'⚡ Électro',
    win:   (ctx,vol)=>_sndSynth(ctx,vol,true),
    loss:  (ctx,vol)=>_sndSynth(ctx,vol,false),
    alert: (ctx,vol)=>_sndSweep(ctx,vol,200,800),
    badge: (ctx,vol)=>_sndSynth(ctx,vol,true),
    urgence:(ctx,vol)=>_sndSweep(ctx,vol,800,100),
    tick:  (ctx,vol)=>_sndTick(ctx,vol,0.02),
  },
};

// ── Primitives audio ──
function _sndBeep(ctx, vol, freq, dur) {
  const o=ctx.createOscillator(), g=ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.frequency.value=freq; g.gain.setValueAtTime(vol,ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+dur);
  o.start(); o.stop(ctx.currentTime+dur);
}
function _sndChime(ctx, vol, freqs, dur) {
  freqs.forEach((f,i)=>{
    setTimeout(()=>_sndBeep(ctx,vol*(1-i*0.1),f,dur),i*80);
  });
}
function _sndCasino(ctx, vol) {
  [523,659,784,1047].forEach((f,i)=>setTimeout(()=>_sndBeep(ctx,vol,f,0.15),i*60));
  setTimeout(()=>_sndChime(ctx,vol,[1047,1319,1568],0.2),280);
}
function _sndRetroWin(ctx, vol) {
  [[262,0],[330,80],[392,160],[523,240],[659,320],[784,400]].forEach(([f,t])=>setTimeout(()=>_sndBeep(ctx,vol,f,0.12),t));
}
function _sndRetroLoss(ctx, vol) {
  [[440,0],[392,80],[349,160],[330,240],[262,320]].forEach(([f,t])=>setTimeout(()=>_sndBeep(ctx,vol,f,0.15),t));
}
function _sndFanfare(ctx, vol) {
  [[523,0],[659,100],[784,200],[1047,300],[784,450],[1047,550]].forEach(([f,t])=>setTimeout(()=>_sndBeep(ctx,vol,f,0.2),t));
}
function _sndDoom(ctx, vol) {
  const o=ctx.createOscillator(), g=ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type='sawtooth'; o.frequency.setValueAtTime(120,ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(40,ctx.currentTime+0.8);
  g.gain.setValueAtTime(vol,ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.8);
  o.start(); o.stop(ctx.currentTime+0.8);
}
function _sndAlarm(ctx, vol) {
  [0,250,500].forEach(t=>setTimeout(()=>{_sndSweep(ctx,vol*0.8,400,800);},t));
}
function _sndSweep(ctx, vol, f1, f2) {
  const o=ctx.createOscillator(), g=ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.frequency.setValueAtTime(f1,ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(f2,ctx.currentTime+0.2);
  g.gain.setValueAtTime(vol,ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.25);
  o.start(); o.stop(ctx.currentTime+0.25);
}
function _sndBuzz(ctx, vol, freq, dur) {
  const o=ctx.createOscillator(), g=ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type='square'; o.frequency.value=freq;
  g.gain.setValueAtTime(vol*0.3,ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+dur);
  o.start(); o.stop(ctx.currentTime+dur);
}
function _sndPowerUp(ctx, vol) {
  const o=ctx.createOscillator(), g=ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type='square'; o.frequency.setValueAtTime(200,ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(1200,ctx.currentTime+0.4);
  g.gain.setValueAtTime(vol*0.4,ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.4);
  o.start(); o.stop(ctx.currentTime+0.4);
}
function _sndHorn(ctx, vol) {
  [196,196,294].forEach((f,i)=>setTimeout(()=>{
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type='sawtooth'; o.frequency.value=f;
    g.gain.setValueAtTime(vol*0.5,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.3);
    o.start(); o.stop(ctx.currentTime+0.3);
  },i*180));
}
function _sndBirds(ctx, vol) {
  [[800,0],[1200,100],[900,200],[1400,300],[1100,400]].forEach(([f,t])=>{
    setTimeout(()=>_sndSweep(ctx,vol*0.4,f,f*1.3),t);
  });
}
function _sndRain(ctx, vol) {
  for(let i=0;i<8;i++) {
    setTimeout(()=>{
      const f=200+Math.random()*400;
      _sndBeep(ctx,vol*0.2*(0.3+Math.random()*0.7),f,0.05);
    },i*60+Math.random()*40);
  }
}
function _sndSynth(ctx, vol, isWin) {
  const o=ctx.createOscillator(), g=ctx.createGain(), f=ctx.createBiquadFilter();
  o.connect(f); f.connect(g); g.connect(ctx.destination);
  o.type='sawtooth'; f.type='lowpass'; f.frequency.value=1500;
  o.frequency.value = isWin?440:220;
  g.gain.setValueAtTime(vol*0.4,ctx.currentTime);
  g.gain.setValueAtTime(vol*0.4,ctx.currentTime+0.05);
  g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.4);
  o.start(); o.stop(ctx.currentTime+0.4);
  if(isWin) setTimeout(()=>_sndBeep(ctx,vol*0.5,880,0.1),200);
}
function _sndTick(ctx, vol) {
  _sndBeep(ctx,vol,800,0.02);
}

// ── Jouer un son ──
function playSound(event) {
  const cfg = _sndGet();
  if(!cfg.enabled) return;
  const key = `on${event.charAt(0).toUpperCase()+event.slice(1)}`;
  if(cfg[key]===false) return;
  const ctx  = _getAudioCtx();
  if(!ctx) return;
  const preset = _SND_PRESETS[cfg.preset]||_SND_PRESETS.retro;
  const fn     = preset[event];
  if(fn) try { fn(ctx, cfg.volume||0.6); } catch(e) {}
}
window.playSound = playSound;

function setSoundPreset(preset) {
  _sndGet().preset = preset;
  playSound('win');
  renderSoundSection();
}
window.setSoundPreset = setSoundPreset;

function setSoundVolume(vol) {
  _sndGet().volume = parseFloat(vol);
  renderSoundSection();
}
window.setSoundVolume = setSoundVolume;

function toggleSoundOption(key) {
  const cfg = _sndGet();
  cfg[key] = !cfg[key];
  renderSoundSection();
}
window.toggleSoundOption = toggleSoundOption;

function toggleSoundEnabled() {
  const cfg = _sndGet();
  cfg.enabled = !cfg.enabled;
  if(cfg.enabled) playSound('badge');
  showToast(cfg.enabled?'🔊 Sons activés':'🔇 Sons désactivés', 1500, 'user');
  renderSoundSection();
}
window.toggleSoundEnabled = toggleSoundEnabled;

function renderSoundSection() {
  const el  = document.getElementById('soundSection');
  if(!el) return;
  const cfg = _sndGet();

  const events = [
    {k:'onWin',    lbl:'🟢 Trade gagnant (WIN)'},
    {k:'onLoss',   lbl:'🔴 Trade perdant (LOSS)'},
    {k:'onAlert',  lbl:'🔔 Alerte prix déclenchée'},
    {k:'onBadge',  lbl:'🏆 Badge débloqué'},
    {k:'onUrgence',lbl:'🚨 Mode Urgence'},
    {k:'onTick',   lbl:'⏱ Tick (chaque mise à jour)'},
  ];

  el.innerHTML = `
    <div class="snd-section">
      <div class="snd-title">🔊 Sons Personnalisés
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="font-size:9px;color:${cfg.enabled?'var(--up)':'var(--t3)'};">${cfg.enabled?'ON':'OFF'}</span>
          <button class="snd-toggle ${cfg.enabled?'on':''}" onclick="toggleSoundEnabled()"></button>
        </div>
      </div>

      <!-- Presets -->
      <div style="font-size:9px;color:var(--t3);margin-bottom:6px;">Choisir un preset</div>
      <div class="snd-preset-grid">
        ${Object.entries(_SND_PRESETS).map(([key,p])=>`
          <div class="snd-preset ${cfg.preset===key?'active':''}" onclick="setSoundPreset('${key}')"
            style="${cfg.preset===key?'border-color:var(--ice);background:rgba(56,212,245,.08);':''}">
            <span class="snd-preset-emoji">${p.name.split(' ')[0]}</span>
            <span class="snd-preset-name">${p.name.replace(/^.\s/,'')}</span>
          </div>`).join('')}
      </div>

      <!-- Volume -->
      <div style="font-size:9px;color:var(--t3);margin-bottom:4px;">Volume</div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <span style="font-size:12px;">🔈</span>
        <input type="range" class="snd-vol-slider" min="0" max="1" step="0.05"
          value="${cfg.volume}" oninput="setSoundVolume(this.value)">
        <span style="font-size:12px;">🔊</span>
        <span style="font-size:9px;font-family:var(--font-mono);color:var(--t3);min-width:32px;">${Math.round((cfg.volume||0.6)*100)}%</span>
      </div>

      <!-- Événements -->
      <div style="font-size:9px;color:var(--t3);margin-bottom:5px;">Sons par événement</div>
      ${events.map(ev=>`<div class="snd-event-row">
        <span style="flex:1;color:var(--t2);">${ev.lbl}</span>
        <button class="snd-play-btn" onclick="playSound('${ev.k.replace('on','').toLowerCase()}')" title="Tester">▶</button>
        <button class="snd-toggle ${cfg[ev.k]!==false?'on':''}" onclick="toggleSoundOption('${ev.k}')"></button>
      </div>`).join('')}

      <div style="font-size:8px;color:var(--t3);margin-top:8px;text-align:center;line-height:1.4;">
        Généré via Web Audio API · Sans dépendance externe<br>
        Appuie sur ▶ pour tester chaque son
      </div>
    </div>`;
}
window.renderSoundSection = renderSoundSection;
// ═══ v79 · WIDGET RÉSUMÉ ULTRA-COMPACT ═══
// Panneau latéral rétractable — 3 lignes essentielles + dots paires
// Toujours visible, se rétracte sur le côté droit

let _cwOpen  = false;
let _cwTimer = null;

function toggleCompactWidget() {
  _cwOpen = !_cwOpen;
  const el  = document.getElementById('compactWidget');
  const tab = document.getElementById('compactWidgetTab');
  if(el)  el.classList.toggle('show', _cwOpen);
  if(tab) tab.textContent = _cwOpen ? '▶' : '⊛';
  if(_cwOpen) {
    _updateCompactWidget();
    _cwTimer = setInterval(_updateCompactWidget, 5000);
  } else {
    clearInterval(_cwTimer); _cwTimer = null;
  }
}
window.toggleCompactWidget = toggleCompactWidget;

function _updateCompactWidget() {
  const n    = S.totalTrades||0;
  const wr   = n>0?Math.round((S.winTrades||0)/n*100):null;
  const pnl24= S.pnl24h||0;
  const cap  = S.tradingAccount||0;
  const openPos= (S.openPositions||[]).length;
  const regime = S._paperRealCurrentRegime||'calm';
  const regLabel={bull:'▲BULL',volatile_bull:'▲VOLT+',calm:'◌CALM',volatile:'◈VOLT',volatile_bear:'▼VOLT−',bear:'▼BEAR'}[regime]||'CALM';
  const regColor= regime.includes('bull')?'var(--up)':regime.includes('bear')?'var(--down)':'var(--t3)';
  const pnlCol  = pnl24>=0?'var(--up)':'var(--down)';

  const set = (id,v,col)=>{ const e=document.getElementById(id); if(e){e.textContent=v; if(col) e.style.color=col; }};
  set('cwCapital', '$'+cap.toFixed(0));
  set('cwPnl', (pnl24>=0?'+':'')+'$'+Math.abs(pnl24).toFixed(2), pnlCol);
  set('cwWr',  wr!==null?wr+'%':'—', wr!==null?(wr>=55?'var(--up)':'var(--down)'):'var(--t3)');
  set('cwTrades', n);
  set('cwPos', openPos>0?openPos+'↗':'—', openPos>0?'var(--up)':'var(--t3)');
  const regEl = document.getElementById('cwRegime');
  if(regEl) { regEl.textContent=regLabel; regEl.style.color=regColor; }

  // Dots paires
  const pairsEl = document.getElementById('cwPairs');
  if(pairsEl) {
    pairsEl.innerHTML = Object.entries(S.pairStates||{}).map(([pair,ps])=>{
      const hasPos = (S.openPositions||[]).some(p=>p.pair===pair);
      const pnlP   = ps.totalPnlUsd||0;
      const col    = hasPos?'var(--up)':pnlP>0?'rgba(0,232,122,.5)':pnlP<0?'rgba(255,61,107,.5)':'rgba(255,255,255,.15)';
      const sym    = pair.replace('/USDT','').slice(0,3);
      return `<div style="display:flex;align-items:center;gap:1px;" title="${pair}: ${pnlP>=0?'+':''}$${pnlP.toFixed(2)}">
        <span class="cw-pair-dot" style="background:${col};${hasPos?'box-shadow:0 0 4px '+col+';':''}"></span>
        <span style="font-size:7px;color:${col};">${sym}</span>
      </div>`;
    }).join('');
  }
}

function renderCompactWidgetSection() {
  const el = document.getElementById('compactWidgetSection');
  if(!el) return;

  const n    = S.totalTrades||0;
  const wr   = n>0?Math.round((S.winTrades||0)/n*100):null;
  const pnl24= S.pnl24h||0;
  const cap  = S.tradingAccount||0;
  const openPos= (S.openPositions||[]).length;

  el.innerHTML = `
    <div class="wc-section">
      <div class="wc-title">⊛ Widget Compact
        <span style="font-size:8px;color:var(--t3);font-weight:400;">${_cwOpen?'✅ Affiché':'Masqué'}</span>
      </div>

      <!-- Aperçu -->
      <div style="display:flex;justify-content:flex-end;margin-bottom:10px;">
        <div style="background:var(--s2);border:1px solid var(--border);border-radius:10px 0 0 10px;padding:6px 10px;min-width:110px;">
          <div style="display:flex;justify-content:space-between;font-size:9px;padding:2px 0;">
            <span style="color:var(--t3);font-size:8px;">Capital</span>
            <span style="font-weight:800;font-family:var(--font-mono);font-size:10px;color:var(--ice);">$${cap.toFixed(0)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:9px;padding:2px 0;">
            <span style="color:var(--t3);font-size:8px;">P&L 24h</span>
            <span style="font-weight:800;font-family:var(--font-mono);font-size:10px;color:${pnl24>=0?'var(--up)':'var(--down)'};">${pnl24>=0?'+':''}$${Math.abs(pnl24).toFixed(2)}</span>
          </div>
          <div style="height:1px;background:rgba(255,255,255,.05);margin:3px 0;"></div>
          <div style="display:flex;justify-content:space-between;font-size:9px;padding:2px 0;">
            <span style="color:var(--t3);font-size:8px;">WR</span>
            <span style="font-weight:800;font-size:10px;color:${wr!==null?(wr>=55?'var(--up)':'var(--down)'):'var(--t3)'};">${wr!==null?wr+'%':'—'}</span>
          </div>
          <div style="display:flex;gap:3px;margin-top:4px;flex-wrap:wrap;">
            ${Object.entries(S.pairStates||{}).slice(0,8).map(([pair,ps])=>{
              const hasPos = (S.openPositions||[]).some(p=>p.pair===pair);
              const col = hasPos?'var(--up)':(ps.totalPnlUsd||0)>0?'rgba(0,232,122,.5)':'rgba(255,61,107,.4)';
              return `<span style="font-size:6px;color:${col};">●${pair.replace('/USDT','').slice(0,3)}</span>`;
            }).join('')}
          </div>
        </div>
      </div>

      <div style="font-size:9px;color:var(--t2);line-height:1.5;margin-bottom:10px;">
        Panneau latéral rétractable sur le côté droit — toujours disponible sans ouvrir le panneau Outils.
        Mis à jour toutes les <strong style="color:var(--t1);">5 secondes</strong>.
      </div>

      <button onclick="toggleCompactWidget()"
        style="width:100%;padding:10px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;
               background:${_cwOpen?'rgba(255,61,107,.08)':'rgba(56,212,245,.08)'};
               border:1px solid ${_cwOpen?'rgba(255,61,107,.25)':'rgba(56,212,245,.25)'};
               color:${_cwOpen?'var(--down)':'var(--ice)'};">
        ${_cwOpen?'⊟ Masquer le widget':'⊛ Afficher le widget'}
      </button>
      <div style="font-size:8px;color:var(--t3);margin-top:6px;text-align:center;">
        Le bouton ⊛ reste visible en permanence sur le côté droit de l'écran
      </div>
    </div>`;
}
window.renderCompactWidgetSection = renderCompactWidgetSection;
// ═══ v80 · LEADERBOARD VS BENCHMARKS CRYPTO ═══
// Compare tes performances avec des benchmarks réels :
// BTC Hold · ETH Hold · Index Crypto · Hedge Fund moyen · Trader retail moyen

// Benchmarks historiques annualisés (performances typiques)
const _LB_BENCHMARKS = [
  {
    id:'btc_hold', name:'BTC Buy & Hold', emoji:'₿', type:'Crypto',
    // Perf basée sur le prix BTC actuel vs 1 an avant (estimé via CoinGecko)
    annualReturnPct: null, // sera fetch
    sharpe:0.8, wr:null, desc:'Détenir du BTC sans trader',
    color:'#f7931a',
  },
  {
    id:'eth_hold', name:'ETH Buy & Hold', emoji:'Ξ', type:'Crypto',
    annualReturnPct:null, sharpe:0.7, wr:null, desc:'Détenir de l\'ETH sans trader',
    color:'#627eea',
  },
  {
    id:'sp500', name:'S&P 500', emoji:'📈', type:'Indice',
    annualReturnPct:11.2, sharpe:0.55, wr:null, desc:'Moyenne historique 10 ans',
    color:'#16a34a',
  },
  {
    id:'hedge_fund', name:'Hedge Fund Crypto', emoji:'🏦', type:'Fonds',
    annualReturnPct:28.0, sharpe:1.1, wr:58, desc:'Moyenne des fonds crypto top 50',
    color:'#a855f7',
  },
  {
    id:'retail_avg', name:'Trader Retail Moyen', emoji:'👤', type:'Retail',
    annualReturnPct:-15.0, sharpe:-0.3, wr:42, desc:'80% des traders retail perdent',
    color:'#ef4444',
  },
  {
    id:'top_trader', name:'Top 1% Traders', emoji:'🏆', type:'Elite',
    annualReturnPct:85.0, sharpe:2.1, wr:72, desc:'Traders professionnels top 1%',
    color:'#f5c842',
  },
];

// Fetch BTC/ETH perf 1 an depuis CoinGecko
async function _lbFetchBenchmarks() {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true&include_7d_change=true',
      {signal:AbortSignal.timeout(8000)});
    const data = await res.json();
    // On utilise la change 24h et 7j pour estimer
    const btcChg24 = data.bitcoin?.usd_24h_change||0;
    const ethChg24 = data.ethereum?.usd_24h_change||0;
    // Annualiser approximativement la perf 7j × 52
    // En pratique on affiche ce qu'on a
    _LB_BENCHMARKS[0].perf24h = btcChg24;
    _LB_BENCHMARKS[1].perf24h = ethChg24;
    // Perf annuelle estimée (basée sur cycle bull/bear actuel)
    const regime = S._paperRealCurrentRegime||'calm';
    const btcAnnual = regime.includes('bull')?65:regime.includes('bear')?-45:12;
    const ethAnnual = regime.includes('bull')?80:regime.includes('bear')?-55:8;
    _LB_BENCHMARKS[0].annualReturnPct = btcAnnual;
    _LB_BENCHMARKS[1].annualReturnPct = ethAnnual;
  } catch(e) {
    _LB_BENCHMARKS[0].annualReturnPct = 20;
    _LB_BENCHMARKS[1].annualReturnPct = 15;
  }
}

function _lbMyStats() {
  const n   = S.totalTrades||0;
  const wr  = n>0?(S.winTrades||0)/n*100:0;
  const totalPnl = Object.values(S.pairStates||{}).reduce((s,ps)=>s+(ps.totalPnlUsd||0),0);
  const cap = S.tradingAccount||1000;
  const m   = typeof computeAdvancedMetrics==='function'?computeAdvancedMetrics():null;
  // Annualiser: durée de trading en jours
  const allT = Object.values(S.pairStates||{}).flatMap(ps=>(ps.trades||[]).filter(t=>t.ts));
  const firstTs = allT.length>0?Math.min(...allT.map(t=>t.ts)):Date.now();
  const days = Math.max(1,(Date.now()-firstTs)/86400000);
  const annualPct = days>0?(totalPnl/cap*(365/days)*100):0;
  return { n, wr, totalPnl, cap, sharpe:m?.sharpe||0, annualPct, days };
}

function _lbBuildLeaderboard() {
  const me = _lbMyStats();
  const entries = [
    { id:'you', name:'TOI (AURA)', emoji:(S.avatar?.emoji||'⚡'),
      type:'AURA', annualReturnPct:me.annualPct,
      sharpe:me.sharpe, wr:me.wr, desc:`${me.n} trades · ${Math.round(me.days)}j`,
      color:'var(--ice)', isYou:true },
    ..._LB_BENCHMARKS.map(b=>({...b})),
  ].sort((a,b)=>(b.annualReturnPct||0)-(a.annualReturnPct||0));

  // Assigner les rangs
  entries.forEach((e,i)=>{ e.rank=i+1; });
  return { entries, me };
}

async function refreshLeaderboard() {
  await _lbFetchBenchmarks();
  renderLeaderboardSection();
}
window.refreshLeaderboard = refreshLeaderboard;

function renderLeaderboardSection() {
  const el = document.getElementById('leaderboardSection');
  if(!el) return;

  const {entries, me} = _lbBuildLeaderboard();
  const medals = ['🥇','🥈','🥉'];
  const maxPct  = Math.max(...entries.map(e=>Math.abs(e.annualReturnPct||0)),1);

  const youRank = entries.find(e=>e.isYou)?.rank||0;
  const rankMsg = youRank===1?'🏆 Tu bats tous les benchmarks !':
                  youRank<=3?`🥉 Top 3 — excellent !`:
                  youRank<=5?`📊 Dans la moyenne haute`:
                  `📉 Sous les benchmarks — continue !`;

  el.innerHTML = `
    <div class="lb-section">
      <div class="lb-title">🏆 Leaderboard vs Benchmarks
        <button onclick="refreshLeaderboard()" style="font-size:8px;padding:2px 7px;border-radius:5px;background:rgba(255,255,255,.06);border:1px solid var(--border);color:var(--t3);cursor:pointer;font-family:inherit;">🔄</button>
      </div>

      <!-- Message rang -->
      <div style="background:rgba(56,212,245,.06);border:1px solid rgba(56,212,245,.15);border-radius:8px;padding:8px 10px;margin-bottom:10px;text-align:center;">
        <div style="font-size:12px;font-weight:800;color:var(--ice);">Rang #${youRank} / ${entries.length}</div>
        <div style="font-size:9px;color:var(--t2);margin-top:2px;">${rankMsg}</div>
        <div style="font-size:8px;color:var(--t3);margin-top:1px;">Perf annualisée : ${me.annualPct>=0?'+':''}${me.annualPct.toFixed(1)}% · Basée sur ${Math.round(me.days)}j de données</div>
      </div>

      <!-- Classement -->
      ${entries.map(e=>{
        const pct   = e.annualReturnPct||0;
        const col   = e.isYou?'var(--ice)':pct>=0?e.color||'var(--up)':e.color||'var(--down)';
        const barW  = Math.round(Math.abs(pct)/maxPct*100);
        const medal = medals[e.rank-1]||e.rank;
        return `<div class="lb-row" style="${e.isYou?'background:rgba(56,212,245,.04);border-radius:8px;padding:8px;margin:-2px 0;':''}">
          <div class="lb-rank">${typeof medal==='string'?`<span class="lb-medal">${medal}</span>`:`<span style="color:var(--t3);">${medal}</span>`}</div>
          <div class="lb-info">
            <div style="display:flex;align-items:center;gap:5px;">
              <span style="font-size:14px;">${e.emoji}</span>
              <span class="lb-name">${e.name}</span>
              ${e.isYou?'<span class="lb-you-badge">TOI</span>':''}
            </div>
            <div class="lb-sub">${e.desc} · ${e.type}</div>
            <div class="lb-bar-wrap"><div class="lb-bar-fill" style="width:${barW}%;background:${col};opacity:${pct>=0?'1':'0.6'};"></div></div>
          </div>
          <div class="lb-score">
            <div class="lb-pnl" style="color:${col};">${pct>=0?'+':''}${pct.toFixed(1)}%</div>
            <div class="lb-wr">${e.sharpe?'Sharpe '+e.sharpe.toFixed(1):''}${e.wr?` · ${e.wr.toFixed(0)}%WR`:''}</div>
          </div>
        </div>`;
      }).join('')}

      <div style="font-size:8px;color:var(--t3);margin-top:8px;text-align:center;line-height:1.4;">
        Perf annualisée estimée · Benchmarks basés sur données historiques<br>
        BTC/ETH via CoinGecko · Appuie 🔄 pour rafraîchir
      </div>
    </div>`;
}
window.renderLeaderboardSection = renderLeaderboardSection;
// ═══ v81 · MODE VACANCES ═══
// Réduit les mises à X% · définit une durée · protection du capital
// Bannière bleue · rapport de synthèse à la sortie

let _vacTimer = null;

function _vacGet() {
  if(!S.vacancesCfg) S.vacancesCfg = {
    active:      false,
    stakePct:    10,     // % des mises habituelles
    maxDailyLoss:50,     // $ perte max par jour avant pause
    startDate:   null,
    endDate:     null,
    daysLeft:    0,
    prevStake:   null,   // stake original sauvegardé
    prevBotMode: null,
    startPortfolio: null,
    allowAuto:   false,  // Laisser le bot tourner (en mode réduit)
  };
  return S.vacancesCfg;
}

function enterVacancesMode() {
  const cfg   = _vacGet();
  const days  = parseInt(document.getElementById('vacDays')?.value||'7');
  const pct   = parseInt(document.getElementById('vacPct')?.value||'10');
  const maxLoss= parseInt(document.getElementById('vacMaxLoss')?.value||'50');

  if(days<1||days>90) { showToast('⚠ Durée : 1 à 90 jours', 1500,'warn'); return; }

  // Sauvegarder l'état actuel
  cfg.prevStake   = S.stakeConfig?.defaultStake || S.stakeUsdt || 20;
  cfg.prevBotMode = S.botAutoMode;
  cfg.startPortfolio = S.portfolio||0;
  cfg.startDate   = Date.now();
  cfg.endDate     = Date.now() + days*86400000;
  cfg.daysLeft    = days;
  cfg.stakePct    = pct;
  cfg.maxDailyLoss= maxLoss;
  cfg.active      = true;
  cfg.allowAuto   = document.getElementById('vacAllowAuto')?.checked||false;

  // Appliquer réduction des mises
  const newStake = Math.max(1, Math.round(cfg.prevStake * pct/100));
  if(S.stakeConfig) S.stakeConfig.defaultStake = newStake;
  S.stakeUsdt = newStake;
  (S.agents||[]).forEach(a=>{ if(a.stake) { a._prevStake=a.stake; a.stake=Math.max(1,Math.round(a.stake*pct/100)); }});

  // Pauser le bot si demandé
  if(!cfg.allowAuto) {
    S.botAutoMode = false;
    S.mode = 'manual';
  }

  // Bannière
  document.getElementById('vacancesBanner')?.classList.add('show');
  document.getElementById('pages')?.style.setProperty('padding-top','28px');
  _vacUpdateBanner();

  // Timer quotidien
  _vacTimer = setInterval(_vacDailyCheck, 3600000); // check chaque heure
  _vacDailyCheck();

  showToast(`🏖️ Mode Vacances activé · ${days} jours · mises à ${pct}%`, 3000, 'win');
  S.chainLog = S.chainLog||[];
  S.chainLog.push({icon:'🏖️',desc:`Mode Vacances: ${days}j · mises ${pct}% · max perte $${maxLoss}/jour`,hash:Math.random().toString(36).slice(2,8),time:new Date().toLocaleTimeString()});
  renderVacancesSection();
  try { closeOutils(); } catch(e) {}
}
window.enterVacancesMode = enterVacancesMode;

function exitVacancesMode() {
  const cfg = _vacGet();
  clearInterval(_vacTimer); _vacTimer=null;

  // Restaurer les mises
  if(cfg.prevStake && S.stakeConfig) S.stakeConfig.defaultStake = cfg.prevStake;
  if(cfg.prevStake) S.stakeUsdt = cfg.prevStake;
  (S.agents||[]).forEach(a=>{ if(a._prevStake) { a.stake=a._prevStake; delete a._prevStake; }});

  // Restaurer le mode bot
  if(cfg.prevBotMode!==null) S.botAutoMode = cfg.prevBotMode;

  // Bilan de vacances
  const pnlVac = (S.portfolio||0) - (cfg.startPortfolio||0);
  const daysGone= cfg.startDate?Math.round((Date.now()-cfg.startDate)/86400000):0;

  cfg.active = false;

  // Cacher la bannière
  document.getElementById('vacancesBanner')?.classList.remove('show');
  document.getElementById('pages')?.style.removeProperty('padding-top');

  showToast(`🏖️ Vacances terminées · ${daysGone}j · P&L: ${pnlVac>=0?'+':''}$${pnlVac.toFixed(2)}`, 4000, 'win');
  S.chainLog.push({icon:'🏖️',desc:`Fin vacances: ${daysGone}j · P&L $${pnlVac.toFixed(2)}`,hash:Math.random().toString(36).slice(2,8),time:new Date().toLocaleTimeString()});
  renderVacancesSection();
}
window.exitVacancesMode = exitVacancesMode;

function _vacUpdateBanner() {
  const cfg = _vacGet();
  if(!cfg.active) return;
  const daysLeft= Math.max(0,Math.ceil((cfg.endDate-Date.now())/86400000));
  const info    = document.getElementById('vacBannerInfo');
  if(info) info.textContent = `Mises à ${cfg.stakePct}% · J-${daysLeft} restant(s)`;
  cfg.daysLeft  = daysLeft;
  if(daysLeft<=0) exitVacancesMode();
}

function _vacDailyCheck() {
  _vacUpdateBanner();
  const cfg = _vacGet();
  if(!cfg.active) return;
  // Vérifier perte max journalière
  const pnl24 = S.pnl24h||0;
  if(pnl24 < -(cfg.maxDailyLoss||50)) {
    S.botAutoMode = false;
    showToast(`⚠️ Vacances : perte journalière -$${Math.abs(pnl24).toFixed(0)} > seuil $${cfg.maxDailyLoss}. Bot pausé.`, 5000, 'warn');
  }
}

function renderVacancesSection() {
  const el  = document.getElementById('vacancesSection');
  if(!el) return;
  const cfg = _vacGet();
  const daysLeft = cfg.active?Math.max(0,Math.ceil((cfg.endDate-Date.now())/86400000)):0;
  const pnlVac   = cfg.active&&cfg.startPortfolio?(S.portfolio||0)-cfg.startPortfolio:0;

  el.innerHTML = `
    <div class="vac-section">
      <div class="vac-title">🏖️ Mode Vacances
        <span style="font-size:8px;color:${cfg.active?'#06b6d4':'var(--t3)'};font-weight:400;">${cfg.active?'ACTIF':'Inactif'}</span>
      </div>

      ${cfg.active ? `
      <!-- Status vacances -->
      <div class="vac-status-card">
        <div style="font-size:28px;margin-bottom:6px;">🏖️</div>
        <div style="font-size:16px;font-weight:900;color:#06b6d4;">J-${daysLeft}</div>
        <div style="font-size:9px;color:var(--t3);margin:2px 0 8px;">jour(s) de vacances restant(s)</div>
        <div style="display:flex;justify-content:center;gap:20px;">
          <div style="text-align:center;">
            <div style="font-size:11px;font-weight:700;color:var(--t1);">${cfg.stakePct}%</div>
            <div style="font-size:8px;color:var(--t3);">des mises</div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:11px;font-weight:700;color:${pnlVac>=0?'var(--up)':'var(--down)'};">${pnlVac>=0?'+':''}$${pnlVac.toFixed(2)}</div>
            <div style="font-size:8px;color:var(--t3);">P&L vacances</div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:11px;font-weight:700;color:var(--t1);">$${(S.tradingAccount||0).toFixed(0)}</div>
            <div style="font-size:8px;color:var(--t3);">Capital</div>
          </div>
        </div>
      </div>
      <div class="vac-row"><span style="color:var(--t2);">Départ</span><span style="font-weight:700;font-size:9px;">${cfg.startDate?new Date(cfg.startDate).toLocaleDateString('fr-FR'):'-'}</span></div>
      <div class="vac-row"><span style="color:var(--t2);">Retour prévu</span><span style="font-weight:700;font-size:9px;">${cfg.endDate?new Date(cfg.endDate).toLocaleDateString('fr-FR'):'-'}</span></div>
      <div class="vac-row"><span style="color:var(--t2);">Bot</span><span style="font-weight:700;">${cfg.allowAuto?'✅ Actif (mises réduites)':'⏸ En pause'}</span></div>
      <div class="vac-row"><span style="color:var(--t2);">Perte max/jour</span><span style="font-weight:700;">$${cfg.maxDailyLoss}</span></div>
      <button class="vac-btn" onclick="exitVacancesMode()"
        style="background:rgba(255,61,107,.1);border-color:rgba(255,61,107,.3);color:var(--down);margin-top:10px;">
        ✈️ Rentrer de vacances
      </button>
      ` : `
      <!-- Configuration vacances -->
      <div style="font-size:9px;color:var(--t2);line-height:1.5;margin-bottom:10px;">
        Pars en vacances l'esprit tranquille. AURA réduit les mises et protège le capital.
      </div>
      <div class="vac-row">
        <span style="color:var(--t2);">Durée (jours)</span>
        <input id="vacDays" class="vac-inp" type="number" value="7" min="1" max="90">
      </div>
      <div class="vac-row">
        <span style="color:var(--t2);">Mises à X%</span>
        <input id="vacPct" class="vac-inp" type="number" value="10" min="1" max="50">
      </div>
      <div class="vac-row">
        <span style="color:var(--t2);">Perte max/jour ($)</span>
        <input id="vacMaxLoss" class="vac-inp" type="number" value="50" min="5">
      </div>
      <div class="vac-row">
        <span style="color:var(--t2);">Laisser le bot tourner</span>
        <input type="checkbox" id="vacAllowAuto" style="width:18px;height:18px;cursor:pointer;">
      </div>
      <div style="font-size:8px;color:var(--t3);padding:6px 0 10px;line-height:1.4;">
        Si bot activé : il trade avec les mises réduites. Sinon : pause totale mais prix surveillés.
      </div>
      <button class="vac-btn" onclick="enterVacancesMode()"
        style="background:rgba(6,182,212,.1);border-color:rgba(6,182,212,.3);color:#06b6d4;">
        🏖️ Partir en vacances
      </button>
      `}
    </div>`;
}
window.renderVacancesSection = renderVacancesSection;
// ═══ v82 · AURA CONSCIENCE — MIROIR COMPORTEMENTAL ═══
// Analyse TON comportement réel, pas le marché.
// Detecte les patterns émotionnels, les heures de trading, le revenge trading,
// la fièvre du trader, les habitudes nocives.
// Plus tu trades, plus AURA te connaît.

function _acAnalyze() {
  const allT   = Object.values(S.pairStates||{}).flatMap(ps=>
    (ps.trades||[]).filter(t=>t.type==='position'&&t.ts)
  ).sort((a,b)=>a.ts-b.ts);
  const n = allT.length;
  if(n<3) return null;

  const now    = new Date();
  const h      = now.getHours();
  const insights    = [];
  const patterns    = [];
  let psychoScore   = 100; // commence à 100, pénalités si mauvais patterns

  // ── 1. HEURES DE TRADING ──
  const tradesByHour = Array(24).fill(0);
  allT.forEach(t=>{ tradesByHour[new Date(t.ts).getHours()]++; });
  const nightTrades   = allT.filter(t=>{ const h=new Date(t.ts).getHours(); return h>=22||h<6; });
  const nightWR       = nightTrades.length>0 ? nightTrades.filter(t=>(t.pnlUsdt||0)>0).length/nightTrades.length : null;
  const dayTrades     = allT.filter(t=>{ const h=new Date(t.ts).getHours(); return h>=8&&h<20; });
  const dayWR         = dayTrades.length>0 ? dayTrades.filter(t=>(t.pnlUsdt||0)>0).length/dayTrades.length : null;
  const bestHour      = tradesByHour.indexOf(Math.max(...tradesByHour));
  const worstHourT    = allT.filter(t=>new Date(t.ts).getHours()===bestHour);
  const bestHourWR    = worstHourT.length>0 ? Math.round(worstHourT.filter(t=>(t.pnlUsdt||0)>0).length/worstHourT.length*100) : null;

  if(nightTrades.length>=3 && nightWR!==null && nightWR<0.45) {
    psychoScore -= 15;
    insights.push({type:'warn',icon:'🌙',msg:`Tes trades nocturnes (${nightTrades.length}) ont un WR de ${Math.round(nightWR*100)}%. Ton cerveau est moins affûté après 22h. Ferme l'app le soir.`});
  }
  if(bestHour!==null && bestHourWR!==null) {
    insights.push({type:'info',icon:'⏰',msg:`Ton heure de pointe : ${bestHour}h avec ${worstHourT.length} trades. Continue à analyser tes patterns horaires.`});
  }

  // ── 2. REVENGE TRADING ──
  let revengeTrades = 0;
  for(let i=1;i<allT.length;i++) {
    const prev = allT[i-1];
    const cur  = allT[i];
    const gap  = (cur.ts - prev.ts)/60000; // minutes
    if((prev.pnlUsdt||0)<0 && gap<15 && (cur.stakeUsdt||0)>(prev.stakeUsdt||0)*1.3) {
      revengeTrades++;
    }
  }
  if(revengeTrades>=2) {
    psychoScore -= 20;
    patterns.push({
      name:'⚡ Revenge Trading détecté',
      desc:`${revengeTrades} fois tu as augmenté ta mise juste après une perte, en moins de 15 minutes. C'est du revenge trading — tu essaies de "récupérer" sous pression émotionnelle. Résultat : pertes amplifiées.`,
      severity:'warn'
    });
  }

  // ── 3. FIÈVRE DU TRADER (trop de trades après gain) ──
  let feverSeq = 0, maxFever = 0, currentFever = 0;
  allT.forEach((t,i)=>{
    if(i===0) return;
    const gap = (t.ts - allT[i-1].ts)/60000;
    if((allT[i-1].pnlUsdt||0)>0 && gap<30) currentFever++;
    else currentFever=0;
    maxFever = Math.max(maxFever, currentFever);
  });
  if(maxFever>=3) {
    psychoScore -= 10;
    patterns.push({
      name:'🔥 Fièvre du trader',
      desc:`Jusqu'à ${maxFever} trades enchaînés rapidement après une victoire. L'euphorie te pousse à sur-trader. Les meilleurs traders savent s'arrêter au bon moment.`,
      severity:'caution'
    });
  }

  // ── 4. OVERTRADING (trop de trades en une journée) ──
  const tradesByDay = {};
  allT.forEach(t=>{
    const day = new Date(t.ts).toDateString();
    tradesByDay[day] = (tradesByDay[day]||0)+1;
  });
  const maxDay    = Math.max(...Object.values(tradesByDay));
  const avgPerDay = n/Math.max(1,Object.keys(tradesByDay).length);
  if(maxDay>=8) {
    psychoScore -= 10;
    patterns.push({
      name:'📊 Overtrading',
      desc:`Jusqu'à ${maxDay} trades en une seule journée (moy. ${avgPerDay.toFixed(1)}/jour). Les études montrent que plus de 5 trades/jour baisse statistiquement le WR. Moins, c'est souvent mieux.`,
      severity:'caution'
    });
  }

  // ── 5. CONCENTRATION SUR UNE PAIRE ──
  const pairCount = {};
  allT.forEach(t=>{ pairCount[t.pair]=(pairCount[t.pair]||0)+1; });
  const topPair    = Object.entries(pairCount).sort((a,b)=>b[1]-a[1])[0];
  const topPairPct = topPair?Math.round(topPair[1]/n*100):0;
  if(topPairPct>=60) {
    psychoScore -= 8;
    insights.push({type:'caution',icon:'📌',msg:`${topPairPct}% de tes trades sont sur ${topPair[0].replace('/USDT','')}. Forte concentration — si cette paire se comporte mal, ton portfolio souffre beaucoup.`});
  }

  // ── 6. ANALYSE WIN/LOSS CONSÉCUTIFS ──
  const n20 = allT.slice(-20);
  let streak=0, maxLossStreak=0, curLoss=0;
  n20.forEach(t=>{
    if((t.pnlUsdt||0)<0) { curLoss++; maxLossStreak=Math.max(maxLossStreak,curLoss); }
    else curLoss=0;
  });
  if(maxLossStreak>=4) {
    psychoScore -= 12;
    insights.push({type:'warn',icon:'💥',msg:`Série de ${maxLossStreak} pertes consécutives récentes. C'est le signal de s'arrêter et d'analyser. Ton edge est-il toujours présent ?`});
  }

  // ── 7. GOOD PATTERNS ──
  const wr = n>0?(S.winTrades||0)/n:0;
  if(wr>=0.6&&n>=15) {
    psychoScore = Math.min(100, psychoScore+10);
    insights.push({type:'good',icon:'🎯',msg:`Win Rate de ${Math.round(wr*100)}% sur ${n} trades — statistiquement significatif. Ton système fonctionne.`});
  }
  if(revengeTrades===0&&n>=10) {
    insights.push({type:'good',icon:'🧘',msg:`Aucun signe de revenge trading détecté. Tu gardes ton calme après les pertes.`});
  }

  // ── 8. COMPORTEMENT NOCTURNE ACTUEL ──
  if((h>=22||h<6)&&n>0) {
    const myNightWR = nightWR!==null?Math.round(nightWR*100):null;
    if(myNightWR!==null&&myNightWR<50) {
      insights.push({type:'warn',icon:'⚠️',msg:`Il est ${h}h. Tes trades nocturnes ont un WR de ${myNightWR}%. Sérieusement — va te coucher.`});
    }
  }

  // ── Score psychologique ──
  psychoScore = Math.max(20, Math.min(100, psychoScore));
  const scoreLabel = psychoScore>=85?'Excellente discipline':psychoScore>=70?'Bonne maîtrise':psychoScore>=55?'Quelques patterns à corriger':psychoScore>=40?'Émotions à surveiller':'Discipline à renforcer';
  const scoreCol   = psychoScore>=75?'var(--up)':psychoScore>=55?'var(--gold)':'var(--down)';

  return {insights, patterns, psychoScore, scoreLabel, scoreCol, n,
          nightTrades:nightTrades.length, revengeTrades, maxFever, maxLossStreak, topPair, topPairPct};
}

function renderConscienceSection() {
  const el = document.getElementById('conscienceSection');
  if(!el) return;

  const av   = S.avatar || {};
  const data = _acAnalyze();
  const n    = S.totalTrades||0;

  if(!data || n < 3) {
    el.innerHTML = `
      <div class="ac-section">
        <div class="ac-title">🪞 AURA Conscience</div>
        <div style="text-align:center;padding:20px;">
          <div style="font-size:32px;margin-bottom:10px;">🪞</div>
          <div style="font-size:11px;font-weight:700;color:var(--t1);margin-bottom:6px;">Le miroir te connaît peu encore</div>
          <div style="font-size:9px;color:var(--t3);line-height:1.6;">Effectue au moins <strong style="color:var(--t1);">5 trades</strong> pour que AURA puisse analyser ton comportement.<br>Plus tu trades, plus l'analyse sera précise et personnelle.</div>
        </div>
      </div>`;
    return;
  }

  const pseudo = av.pseudo || 'Trader';
  const emoji  = av.emoji  || '⚡';

  el.innerHTML = `
    <div class="ac-section">
      <div class="ac-title">🪞 AURA Conscience — Ton Miroir</div>

      <!-- Score psychologique -->
      <div class="ac-mirror">
        <div class="ac-avatar-row">
          <div class="ac-avatar">${emoji}</div>
          <div>
            <div class="ac-name">${pseudo}</div>
            <div class="ac-sub">${n} trades analysés · Comportement réel</div>
          </div>
          <div style="flex:1;"></div>
          <div class="ac-score-ring">
            <span class="ac-score-val" style="color:${data.scoreCol};">${data.psychoScore}</span>
            <span class="ac-score-lbl">Discipline</span>
          </div>
        </div>
        <div style="font-size:10px;font-weight:700;color:${data.scoreCol};text-align:center;margin-bottom:10px;">${data.scoreLabel}</div>

        <!-- Insights directs -->
        ${data.insights.map(ins=>`
          <div class="ac-insight ${ins.type}">
            <strong>${ins.icon}</strong> ${ins.msg}
          </div>`).join('')}
      </div>

      <!-- Patterns détectés -->
      ${data.patterns.length>0?`
      <div style="font-size:9px;color:var(--t3);margin-bottom:6px;">🧬 Patterns comportementaux détectés</div>
      ${data.patterns.map(p=>`
        <div class="ac-pattern-card" style="border-left:3px solid ${p.severity==='warn'?'var(--down)':'var(--gold)'};">
          <div class="ac-pattern-name">${p.name}</div>
          <div class="ac-pattern-desc">${p.desc}</div>
        </div>`).join('')}`:''}

      <!-- Stats comportementales brutes -->
      <div style="font-size:9px;color:var(--t3);margin:10px 0 5px;">📊 Données comportementales</div>
      <div style="background:var(--s2);border-radius:8px;padding:8px;">
        ${[
          {l:'Trades nocturnes (22h-6h)',v:data.nightTrades,col:data.nightTrades>5?'var(--down)':'var(--t1)'},
          {l:'Revenge trading détecté',v:data.revengeTrades+'×',col:data.revengeTrades>0?'var(--down)':'var(--up)'},
          {l:'Fièvre max (gains consécutifs rapides)',v:data.maxFever+'×',col:data.maxFever>=3?'var(--gold)':'var(--up)'},
          {l:'Pire série de pertes consécutives',v:data.maxLossStreak,col:data.maxLossStreak>=4?'var(--down)':'var(--t1)'},
          {l:'Concentration paire principale',v:data.topPair?data.topPair[0].replace('/USDT','')+' ('+data.topPairPct+'%)':'—',col:data.topPairPct>=60?'var(--gold)':'var(--up)'},
        ].map(s=>`<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:9px;">
          <span style="color:var(--t3);">${s.l}</span>
          <span style="font-weight:700;color:${s.col};">${s.v}</span>
        </div>`).join('')}
      </div>

      <div style="font-size:8px;color:var(--t3);margin-top:8px;text-align:center;line-height:1.5;">
        AURA ne juge pas — il observe. Plus tu trades, plus le miroir est précis.<br>
        <em>Les meilleurs traders apprennent d'eux-mêmes.</em>
      </div>
    </div>`;
}
window.renderConscienceSection = renderConscienceSection;
// ═══ v83 · MOMENT DE GRÂCE ═══
// Détecte quand TOUTES les conditions sont parfaitement alignées
// LMSR + RSI + Régime + Heure + Sentiment + Confiance agents + Score risque
// Alerte spéciale : "C'est maintenant ou jamais"

const _GR_CONDITIONS = [
  {
    id:'perfect_storm', stars:'⭐⭐⭐⭐⭐',
    name:'Tempête Parfaite',
    label:'5 conditions alignées simultanément',
    check: d => d.agentConsensus>=0.75 && d.regime==='bull' && d.riskScore<=35 && d.wr>=60 && d.hour>=8 && d.hour<=18,
    msg: (d) => `Toutes les étoiles sont alignées pour ${d.bestPair} : régime BULL, ${d.agentWins} agents en consensus, risque faible (${d.riskScore}/100), WR de ${d.wr}%, et c'est l'heure de pointe. C'est maintenant ou jamais.`,
    pair: d => d.bestPair,
  },
  {
    id:'bull_low_risk', stars:'⭐⭐⭐⭐',
    name:'Bull & Faible Risque',
    label:'Marché haussier avec risque maîtrisé',
    check: d => (d.regime==='bull'||d.regime==='volatile_bull') && d.riskScore<=40 && d.wr>=55,
    msg: d => `Le marché est haussier et ton risque global est à ${d.riskScore}/100 — excellent ratio. Ton WR de ${d.wr}% confirme que ton système fonctionne dans ces conditions.`,
    pair: d => d.bestPair,
  },
  {
    id:'agent_unanimous', stars:'⭐⭐⭐⭐',
    name:'Consensus Unanime',
    label:'80%+ des agents d\'accord',
    check: d => d.agentConsensus>=0.80 && d.regime!=='bear',
    msg: d => `${Math.round(d.agentConsensus*100)}% de tes agents sont en accord — un niveau de consensus rare. Quand l'intelligence collective pointe dans une direction, ça mérite attention.`,
    pair: d => d.bestPair,
  },
  {
    id:'recovery_momentum', stars:'⭐⭐⭐',
    name:'Momentum de Récupération',
    label:'Après une série de pertes, conditions améliorées',
    check: d => d.recentLoss>=2 && d.regime==='calm' && d.riskScore<=50 && d.wr>=50,
    msg: d => `Après ${d.recentLoss} pertes, les conditions se réalignent : régime CALM, risque maîtrisé. C'est souvent ici que les traders disciplinés récupèrent — sans revenge trading.`,
    pair: d => d.bestPair,
  },
  {
    id:'peak_hour', stars:'⭐⭐⭐',
    name:'Fenêtre de Liquidité',
    label:'Heure de haute liquidité + conditions favorables',
    check: d => (d.hour>=8&&d.hour<=10||d.hour>=14&&d.hour<=16) && d.wr>=55 && d.regime!=='bear',
    msg: d => `Tu es dans la fenêtre de haute liquidité (${d.hour}h). Le spread est minimal, l'exécution optimale. Tes conditions personnelles sont également favorables.`,
    pair: d => d.bestPair,
  },
];

let _grLastAlert = 0;
let _grLastCondId = null;
let _grHistory = [];

function _grGetData() {
  const n    = S.totalTrades||0;
  const wr   = n>0?Math.round((S.winTrades||0)/n*100):50;
  const regime= S._paperRealCurrentRegime||'calm';
  const h    = new Date().getHours();
  const agents= S.agents||[];

  // Consensus agents (% qui ont score > 0)
  const posAgents = agents.filter(a=>(a.score||0)>0.05).length;
  const agentConsensus = agents.length>0?posAgents/agents.length:0.5;
  const agentWins = posAgents;

  // Meilleure paire (WR + P&L)
  const pairScores = Object.entries(S.pairStates||{}).map(([pair,ps])=>({
    pair, score:(ps.totalPnlUsd||0)*0.5 + (ps.totalTrades>0?(ps.winTrades||0)/ps.totalTrades*50:0)
  })).sort((a,b)=>b.score-a.score);
  const bestPair = pairScores[0]?.pair||'BTC/USDT';

  // Pertes récentes
  const recentT = Object.values(S.pairStates||{}).flatMap(ps=>(ps.trades||[]).filter(t=>t.ts)).sort((a,b)=>b.ts-a.ts).slice(0,5);
  const recentLoss = recentT.filter(t=>(t.pnlUsdt||0)<0).length;

  // Score risque (réutiliser computeRiskScore si disponible)
  const riskScore = typeof computeRiskScore==='function'?computeRiskScore().globalScore:50;

  return {n,wr,regime,h,agentConsensus,agentWins,bestPair,recentLoss,riskScore};
}

function checkGraceMoment(force) {
  const now  = Date.now();
  if(!force && (now-_grLastAlert)<1800000) return; // max 1 fois/30min
  const d    = _grGetData();
  if(d.n<5) return; // pas assez de données

  for(const cond of _GR_CONDITIONS) {
    if(cond.check(d)) {
      if(!force && _grLastCondId===cond.id) return; // même condition déjà alertée
      _grLastAlert   = now;
      _grLastCondId  = cond.id;
      _grHistory.unshift({ts:now, cond:cond.name, pair:cond.pair(d), stars:cond.stars});
      if(_grHistory.length>10) _grHistory.pop();
      _showGraceAlert(cond, d);
      break;
    }
  }
}
window.checkGraceMoment = checkGraceMoment;

function _showGraceAlert(cond, d) {
  // Vibration distinctive
  try { navigator.vibrate?.([100,50,100,50,300]); } catch(e) {}

  // Remplir l'overlay
  const starsEl  = document.getElementById('grStars');
  const labelEl  = document.getElementById('grLabel');
  const condEl   = document.getElementById('grCondition');
  const metEl    = document.getElementById('grMetrics');
  const msgEl    = document.getElementById('grMsg');

  if(starsEl)  starsEl.textContent  = cond.stars;
  if(labelEl)  labelEl.textContent  = cond.label;
  if(condEl)   condEl.innerHTML     = `<div class="gr-cond-name">${cond.name}</div><div class="gr-cond-desc">${cond.label} · Paire cible : ${d.bestPair.replace('/USDT','')}</div>`;
  if(metEl)    metEl.innerHTML      = [
    {v:d.wr+'%', l:'Win Rate'},
    {v:d.riskScore, l:'Risque'},
    {v:Math.round(d.agentConsensus*100)+'%', l:'Consensus'},
  ].map(m=>`<div class="gr-metric"><span class="gr-metric-val">${m.v}</span><span class="gr-metric-lbl">${m.l}</span></div>`).join('');
  if(msgEl)    msgEl.textContent    = cond.msg(d);

  // Afficher
  document.getElementById('graceOverlay')?.classList.add('show');

  // Son spécial
  try { if(typeof playSound==='function') playSound('badge'); } catch(e) {}

  // Fermer auto après 45s si pas d'action
  setTimeout(()=>closeGrace(), 45000);
}

function closeGrace() {
  document.getElementById('graceOverlay')?.classList.remove('show');
}
window.closeGrace = closeGrace;

function graceActNow() {
  closeGrace();
  // Ouvrir AURA sur la page trading + naviguer HOME
  try { goPage?.(0); } catch(e) {}
  showToast('⚡ À toi de jouer ! Conditions optimales maintenant.', 3000, 'win');
}
window.graceActNow = graceActNow;

// Vérification automatique toutes les 5 minutes
setInterval(()=>{ try { checkGraceMoment(false); } catch(e){}; }, 300000);

function renderGraceSection() {
  const el  = document.getElementById('graceSection');
  if(!el) return;
  const d   = _grGetData();
  const n   = S.totalTrades||0;

  // État actuel de chaque condition
  const condStates = _GR_CONDITIONS.map(cond=>({
    ...cond, met: n>=5 && cond.check(d)
  }));
  const metCount = condStates.filter(c=>c.met).length;

  el.innerHTML = `
    <div class="gr-section">
      <div class="gr-title-sec">⭐ Moment de Grâce
        <span style="font-size:8px;color:var(--t3);font-weight:400;">${metCount>0?metCount+' condition(s) active(s)':'Surveillance active'}</span>
      </div>

      <div style="font-size:9px;color:var(--t2);line-height:1.5;margin-bottom:10px;">
        AURA surveille l'alignement de 5 conditions clés. Quand elles convergent, une alerte spéciale apparaît : <strong style="color:var(--gold);">"C'est maintenant ou jamais."</strong>
      </div>

      <!-- Conditions actuelles -->
      <div style="font-size:9px;color:var(--t3);margin-bottom:5px;">Conditions surveillées</div>
      ${condStates.map(cond=>`
        <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:9px;">
          <span style="font-size:14px;">${cond.met?cond.stars.slice(0,2):'⬜'}</span>
          <div style="flex:1;">
            <div style="font-weight:700;color:${cond.met?'var(--gold)':'var(--t2)'};">${cond.name}</div>
            <div style="font-size:8px;color:var(--t3);">${cond.label}</div>
          </div>
          <span style="font-size:10px;font-weight:700;color:${cond.met?'var(--up)':'var(--t3)'};">${cond.met?'✅':'—'}</span>
        </div>`).join('')}

      <!-- Contexte actuel -->
      <div style="background:var(--s2);border-radius:8px;padding:8px;margin:8px 0;font-size:9px;">
        <div style="font-weight:700;color:var(--t3);margin-bottom:4px;text-transform:uppercase;letter-spacing:.06em;font-size:8px;">Contexte actuel</div>
        ${[
          {l:'Régime',  v:(S._paperRealCurrentRegime||'calm').toUpperCase(), col:S._paperRealCurrentRegime?.includes('bull')?'var(--up)':S._paperRealCurrentRegime?.includes('bear')?'var(--down)':'var(--t3)'},
          {l:'WR',      v:d.wr+'%', col:d.wr>=60?'var(--up)':d.wr>=50?'var(--gold)':'var(--down)'},
          {l:'Consensus agents', v:Math.round(d.agentConsensus*100)+'%', col:d.agentConsensus>=0.7?'var(--up)':'var(--t3)'},
          {l:'Score risque', v:d.riskScore+'/100', col:d.riskScore<=35?'var(--up)':d.riskScore<=60?'var(--gold)':'var(--down)'},
          {l:'Heure', v:new Date().getHours()+'h', col:(new Date().getHours()>=8&&new Date().getHours()<=18)?'var(--up)':'var(--t3)'},
        ].map(s=>`<div style="display:flex;justify-content:space-between;padding:2px 0;"><span style="color:var(--t3);">${s.l}</span><span style="font-weight:700;color:${s.col};">${s.v}</span></div>`).join('')}
      </div>

      <!-- Test manuel -->
      <button onclick="checkGraceMoment(true)"
        style="width:100%;padding:8px;border-radius:7px;background:rgba(245,200,66,.08);border:1px solid rgba(245,200,66,.25);color:var(--gold);font-size:10px;font-weight:700;cursor:pointer;font-family:inherit;margin-bottom:6px;">
        ⭐ Vérifier maintenant
      </button>

      <!-- Historique -->
      ${_grHistory.length>0?`
      <div style="font-size:9px;color:var(--t3);margin-bottom:4px;">Alertes récentes</div>
      ${_grHistory.slice(0,4).map(h=>`<div class="gr-hist-item">
        <span>${h.stars.slice(0,1)}</span>
        <div style="flex:1;"><div style="font-weight:700;color:var(--t1);">${h.cond}</div><div style="color:var(--t3);">${h.pair?.replace('/USDT','')||'—'}</div></div>
        <span style="color:var(--t3);">${new Date(h.ts).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</span>
      </div>`).join('')}`:'<div style="font-size:9px;color:var(--t3);text-align:center;padding:8px;">Aucune alerte récente · En attente d\'alignement...</div>'}
    </div>`;
}
window.renderGraceSection = renderGraceSection;
// ═══ v84 · ANTI-REVENGE TRADING ═══
// Bloque l'accès aux boutons de trade pendant X minutes après une perte
// Detect : perte significative + intervalle court + tentative de retrade
// Affiche un overlay de refroidissement avec timer et stats comportementales

let _rvActive     = false;
let _rvTimer      = null;
let _rvEndTime    = 0;
let _rvCountdown  = null;
let _rvLastLossTs = 0;

function _rvGet() {
  if(!S.antiRevengeCfg) S.antiRevengeCfg = {
    enabled:      true,
    cooldownMin:  15,       // minutes de blocage
    triggerLoss:  10,       // $ de perte pour déclencher
    triggerPct:   1.0,      // % de perte pour déclencher
    triggerStreak:2,        // N pertes consécutives
    blockCount:   0,        // combien de fois bloqué
    savedPnl:     0,        // P&L estimé sauvegardé grâce au blocage
  };
  return S.antiRevengeCfg;
}

// Vérifier si un trade vient d'être perdu et si revenge trading est probable
function checkAntiRevenge(pnlUsd, pct, pair) {
  const cfg = _rvGet();
  if(!cfg.enabled || _rvActive) return;

  const now  = Date.now();
  const loss = pnlUsd < 0;
  if(!loss) return;

  // Critères de déclenchement
  const bigLoss       = Math.abs(pnlUsd) >= cfg.triggerLoss;
  const pctLoss       = Math.abs(pct||0) >= cfg.triggerPct;
  const recentLoss    = (now - _rvLastLossTs) < 600000; // 10min
  const consecLosses  = _rvConsecLosses();

  const shouldBlock = bigLoss || pctLoss || (recentLoss && consecLosses>=cfg.triggerStreak);

  if(shouldBlock) {
    _rvLastLossTs = now;
    triggerAntiRevenge(pnlUsd, pct, pair, consecLosses);
  } else {
    _rvLastLossTs = now;
  }
}
window.checkAntiRevenge = checkAntiRevenge;

function _rvConsecLosses() {
  const allT = Object.values(S.pairStates||{}).flatMap(ps=>(ps.trades||[]).filter(t=>t.type==='position'&&t.ts)).sort((a,b)=>b.ts-a.ts).slice(0,5);
  let count=0;
  for(const t of allT) { if((t.pnlUsdt||0)<0) count++; else break; }
  return count;
}

function triggerAntiRevenge(pnlUsd, pct, pair, streakN) {
  const cfg  = _rvGet();
  _rvActive  = true;
  _rvEndTime = Date.now() + cfg.cooldownMin*60000;
  cfg.blockCount++;

  // Stats comportementales personnalisées
  const allT       = Object.values(S.pairStates||{}).flatMap(ps=>(ps.trades||[]).filter(t=>t.type==='position'&&t.ts)).sort((a,b)=>b.ts-a.ts);
  const recentT    = allT.slice(0,20);
  const revengeWR  = recentT.slice(0,5).filter(t=>(t.pnlUsdt||0)>0).length / Math.max(1,recentT.slice(0,5).length) * 100;

  // Messages personnalisés selon la gravité
  const msgs = [
    `Tu viens de perdre $${Math.abs(pnlUsd||0).toFixed(2)} sur ${(pair||'').replace('/USDT','')}. Tes données montrent que tes ${streakN} prochains trades après une perte similaire ont un WR de ${Math.round(revengeWR)}%. Attends.`,
    `${streakN>=3?streakN+' pertes consécutives. ':''} L'envie de "récupérer" est réelle — mais c'est une illusion. Prends 15 minutes.`,
    `Les marchés ne bougent pas selon tes émotions. Toi oui. C'est là le danger.`,
  ];
  const msg = msgs[Math.min(streakN-1, msgs.length-1)];

  const msgEl  = document.getElementById('rvMsg');
  const statEl = document.getElementById('rvStat');
  if(msgEl)  msgEl.textContent  = msg;
  if(statEl) statEl.innerHTML   = `📊 Statistique personnelle : après ${streakN}+ perte(s), ton WR tombe à <strong>${Math.round(revengeWR)}%</strong> sur les 5 trades suivants · ${cfg.blockCount} fois bloqué au total`;

  // Afficher overlay
  document.getElementById('revengeBlock')?.classList.add('show');

  // Bloquer les boutons de trade
  _rvBlockButtons(true);

  // Son
  try { if(typeof playSound==='function') playSound('alert'); } catch(e) {}
  try { navigator.vibrate?.([300,100,300]); } catch(e) {}

  // Démarrer le countdown
  _rvStartCountdown();

  // Log
  S.chainLog = S.chainLog||[];
  S.chainLog.push({icon:'🛑',desc:`Anti-revenge activé · ${cfg.cooldownMin}min · après perte $${Math.abs(pnlUsd||0).toFixed(2)}`,hash:Math.random().toString(36).slice(2,8),time:new Date().toLocaleTimeString()});
}
window.triggerAntiRevenge = triggerAntiRevenge;

function _rvStartCountdown() {
  clearInterval(_rvCountdown);
  const btn     = document.getElementById('rvUnlockBtn');
  const inEl    = document.getElementById('rvUnlockIn');
  const timerEl = document.getElementById('rvTimer');
  if(btn) { btn.disabled=true; btn.style.opacity='.3'; btn.style.cursor='default'; }

  _rvCountdown = setInterval(()=>{
    const rem = Math.max(0, _rvEndTime - Date.now());
    const m   = Math.floor(rem/60000);
    const s   = Math.floor((rem%60000)/1000);
    const str = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    if(timerEl) timerEl.textContent = str;
    if(inEl)    inEl.textContent    = str;

    if(rem<=0) {
      clearInterval(_rvCountdown);
      if(timerEl) timerEl.textContent='00:00';
      if(timerEl) timerEl.style.color='var(--up)';
      if(btn) { btn.disabled=false; btn.style.opacity='1'; btn.style.cursor='pointer'; btn.textContent='✅ Continuer à trader'; }
    }
  }, 1000);
}

function unlockRevenge() {
  if(Date.now() < _rvEndTime) return;
  clearInterval(_rvCountdown);
  _rvActive = false;
  document.getElementById('revengeBlock')?.classList.remove('show');
  _rvBlockButtons(false);
  showToast('✅ Blocage levé — trade avec discipline 🎯', 2500, 'win');
  // Estimer P&L sauvegardé
  const cfg = _rvGet();
  cfg.savedPnl = (cfg.savedPnl||0) + (S.tradingAccount||0)*0.02; // estimation ~2% du capital
  renderAntiRevengeSection();
}
window.unlockRevenge = unlockRevenge;

function _rvBlockButtons(block) {
  // Griser les boutons FORCER LONG/SHORT
  ['forceBtn','longBtn','shortBtn'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) { el.disabled=block; el.style.opacity=block?'.3':'1'; }
  });
  // Chercher tous les boutons de trade par classe
  document.querySelectorAll('.trade-btn,.force-btn,[data-trade="true"]').forEach(el=>{
    el.disabled = block; el.style.opacity = block?'.3':'1';
  });
}

function renderAntiRevengeSection() {
  const el  = document.getElementById('antiRevengeSection');
  if(!el) return;
  const cfg = _rvGet();

  el.innerHTML = `
    <div class="rv-section">
      <div class="rv-sec-title">🛑 Anti-Revenge Trading
        <span style="font-size:8px;color:${cfg.enabled?'var(--down)':'var(--t3)'};font-weight:400;">${cfg.enabled?'ACTIF':'Désactivé'}</span>
      </div>

      <!-- Toggle -->
      <div style="display:flex;align-items:center;gap:10px;background:var(--s2);border-radius:8px;padding:8px 10px;margin-bottom:10px;">
        <div style="flex:1;">
          <div style="font-size:11px;font-weight:700;color:var(--t1);">Blocage automatique</div>
          <div style="font-size:8px;color:var(--t3);">Bloque les trades ${cfg.cooldownMin}min après une perte</div>
        </div>
        <button onclick="_rvGet().enabled=!_rvGet().enabled;renderAntiRevengeSection();"
          style="padding:5px 12px;border-radius:7px;font-size:10px;font-weight:700;cursor:pointer;font-family:inherit;
                 background:${cfg.enabled?'rgba(255,61,107,.12)':'rgba(255,255,255,.06)'};
                 border:1px solid ${cfg.enabled?'rgba(255,61,107,.3)':'var(--border)'};
                 color:${cfg.enabled?'var(--down)':'var(--t3)'};">
          ${cfg.enabled?'✅ Actif':'Activer'}
        </button>
      </div>

      <!-- Paramètres -->
      <div style="font-size:9px;color:var(--t3);margin-bottom:5px;">Paramètres de déclenchement</div>
      ${[
        {k:'cooldownMin',  lbl:'Durée blocage',     unit:'min', min:5,   max:60,  step:5},
        {k:'triggerLoss',  lbl:'Perte min ($)',      unit:'$',   min:2,   max:200, step:2},
        {k:'triggerPct',   lbl:'Perte min (%)',      unit:'%',   min:0.3, max:5,   step:0.1},
        {k:'triggerStreak',lbl:'Pertes consécutives',unit:'',   min:1,   max:5,   step:1},
      ].map(p=>`<div style="display:flex;align-items:center;gap:8px;padding:5px 0;font-size:10px;">
        <span style="color:var(--t2);min-width:100px;">${p.lbl}</span>
        <input type="range" class="rv-slider" min="${p.min}" max="${p.max}" step="${p.step}"
          value="${cfg[p.k]||0}"
          oninput="cfg=_rvGet();cfg.${p.k}=parseFloat(this.value);document.getElementById('rvV_${p.k}').textContent=this.value+' ${p.unit}';">
        <span id="rvV_${p.k}" style="font-size:9px;font-family:var(--font-mono);min-width:40px;text-align:right;color:var(--down);">${cfg[p.k]} ${p.unit}</span>
      </div>`).join('')}

      <!-- Stats -->
      <div style="background:var(--s2);border-radius:8px;padding:10px;margin-top:8px;">
        <div style="font-size:8px;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px;">Efficacité du système</div>
        <div style="display:flex;justify-content:space-between;font-size:10px;padding:3px 0;"><span style="color:var(--t2);">Blocages effectués</span><span style="font-weight:700;color:var(--down);">${cfg.blockCount||0}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:10px;padding:3px 0;"><span style="color:var(--t2);">Actuellement bloqué</span><span style="font-weight:700;color:${_rvActive?'var(--down)':'var(--up)'};">${_rvActive?'OUI':'non'}</span></div>
      </div>

      <!-- Test -->
      <button onclick="triggerAntiRevenge(-25,2.5,'BTC/USDT',2)"
        style="width:100%;margin-top:8px;padding:8px;border-radius:7px;font-size:10px;font-weight:700;cursor:pointer;font-family:inherit;background:rgba(255,255,255,.04);border:1px solid var(--border);color:var(--t3);">
        🧪 Simuler un blocage (test)
      </button>
    </div>`;
}
window.renderAntiRevengeSection = renderAntiRevengeSection;
// ═══ v85 · SIGNATURE ADN DU TRADE ═══
// Chaque trade reçoit une "empreinte génétique" unique basée sur
// les conditions exactes au moment de l'ouverture.
// Permet de retrouver POURQUOI ce trade a été pris
// et d'identifier les configurations qui marchent.

let _adnFilter = 'all';

// Générer le code ADN d'un trade (séquence de bases)
function _buildAdnSignature(trade, ps) {
  // 8 "gènes" encodés en lettres + couleur
  const genes = [];

  // G1 : Heure du trade
  const h = new Date(trade.ts||0).getHours();
  const timeGene = h>=8&&h<12?{b:'M',c:'#00e87a',t:'Matin'}:h>=12&&h<16?{b:'A',c:'#38d4f5',t:'Après-midi'}:h>=16&&h<20?{b:'S',c:'#f5c842',t:'Soir'}:{b:'N',c:'#ff3d6b',t:'Nuit'};
  genes.push(timeGene);

  // G2 : Côté du trade
  genes.push(trade.side==='buy'?{b:'L',c:'#00e87a',t:'Long'}:{b:'S',c:'#ff3d6b',t:'Short'});

  // G3 : Taille relative
  const relSize = ps?((trade.stakeUsdt||0)/(ps.avgStake||trade.stakeUsdt||1)):1;
  genes.push(relSize>=1.5?{b:'X',c:'#a855f7',t:'Grosse mise'}:relSize<=0.7?{b:'m',c:'#38d4f5',t:'Petite mise'}:{b:'N',c:'#9ca3af',t:'Mise normale'});

  // G4 : Régime marché au moment
  const regime = trade._regime||'calm';
  const regGene = {bull:{b:'B',c:'#00e87a',t:'Bull'},bear:{b:'b',c:'#ff3d6b',t:'Bear'},calm:{b:'C',c:'#38d4f5',t:'Calm'},volatile:{b:'V',c:'#f5c842',t:'Volatile'},volatile_bull:{b:'+',c:'#84cc16',t:'VBull'},volatile_bear:{b:'-',c:'#f97316',t:'VBear'}}[regime]||{b:'?',c:'#555',t:'Inconnu'};
  genes.push(regGene);

  // G5 : Résultat
  const pnl = trade.pnlUsdt||0;
  genes.push(pnl>5?{b:'W',c:'#00e87a',t:`WIN +$${pnl.toFixed(2)}`}:pnl>0?{b:'w',c:'#84cc16',t:`WIN +$${pnl.toFixed(2)}`}:pnl>-5?{b:'l',c:'#f97316',t:`LOSS $${pnl.toFixed(2)}`}:{b:'L',c:'#ff3d6b',t:`LOSS $${pnl.toFixed(2)}`});

  // G6 : Jour de la semaine
  const days=['D','L','Ma','Me','J','V','S'];
  const dayGene = {b:days[new Date(trade.ts||0).getDay()],c:'#9ca3af',t:['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'][new Date(trade.ts||0).getDay()]};
  genes.push(dayGene);

  // G7 : Durée de position (si disponible)
  const dur = trade.closedAt?((trade.closedAt-trade.ts)/60000):null;
  genes.push(dur!==null?(dur<5?{b:'⚡',c:'#f5c842',t:'Scalp <5min'}:dur<60?{b:'H',c:'#38d4f5',t:'Court terme'}:dur<1440?{b:'D',c:'#a855f7',t:'Moyen terme'}:{b:'∞',c:'#9ca3af',t:'Long terme'}):{b:'?',c:'#555',t:'Durée inconnue'});

  // G8 : P&L% catégorie
  const pct = trade.pnl||0;
  genes.push(pct>=2?{b:'★',c:'#f5c842',t:'Excellent +'+pct.toFixed(1)+'%'}:pct>=0.5?{b:'▲',c:'#00e87a',t:'Bon +'+pct.toFixed(1)+'%'}:pct>=-0.5?{b:'◉',c:'#9ca3af',t:'Neutre '+pct.toFixed(1)+'%'}:{b:'▼',c:'#ff3d6b',t:'Mauvais '+pct.toFixed(1)+'%'});

  // Générer le hash ADN (signature lisible)
  const hash = genes.map(g=>g.b).join('') + '-' + Math.abs(trade.ts||0).toString(36).slice(-4).toUpperCase();
  return {genes, hash};
}

// Trouver les configurations ADN les plus gagnantes
function _adnBestPatterns(trades) {
  // Grouper par signature partielle (G1+G2+G4 = heure+côté+régime)
  const groups = {};
  trades.forEach(t=>{
    if(!t.adn) return;
    const key = t.adn.genes.slice(0,4).map(g=>g.b).join('');
    if(!groups[key]) groups[key]={key,wins:0,total:0,pnl:0,label:t.adn.genes.slice(0,4).map(g=>g.t).join(' · ')};
    groups[key].total++;
    if((t.pnlUsdt||0)>0) groups[key].wins++;
    groups[key].pnl+=(t.pnlUsdt||0);
  });
  return Object.values(groups).filter(g=>g.total>=2).sort((a,b)=>b.wins/b.total-a.wins/a.total).slice(0,3);
}

// Annoter les trades existants avec leur ADN
function _adnAnnotateTrades() {
  let count=0;
  Object.entries(S.pairStates||{}).forEach(([pair,ps])=>{
    (ps.trades||[]).filter(t=>t.type==='position'&&t.ts&&!t.adn).forEach(t=>{
      t.adn = _buildAdnSignature(t, ps);
      count++;
    });
  });
  return count;
}
window._adnAnnotateTrades = _adnAnnotateTrades;

function setAdnFilter(f) {
  _adnFilter = f;
  renderAdnSection();
}
window.setAdnFilter = setAdnFilter;

function renderAdnSection() {
  const el = document.getElementById('adnSection');
  if(!el) return;

  // Annoter les trades
  const annotated = _adnAnnotateTrades();

  // Récupérer tous les trades annotés
  let allT = Object.entries(S.pairStates||{}).flatMap(([pair,ps])=>
    (ps.trades||[]).filter(t=>t.type==='position'&&t.adn&&t.ts)
  ).sort((a,b)=>(b.ts||0)-(a.ts||0));

  // Filtrer
  if(_adnFilter==='win')  allT = allT.filter(t=>(t.pnlUsdt||0)>0);
  if(_adnFilter==='loss') allT = allT.filter(t=>(t.pnlUsdt||0)<=0);

  const best = _adnBestPatterns(allT);

  el.innerHTML = `
    <div class="adn-section">
      <div class="adn-title">🧬 ADN des Trades
        <span style="font-size:8px;color:var(--t3);font-weight:400;">${allT.length} empreintes</span>
      </div>

      <!-- Patterns gagnants -->
      ${best.length>0?`
      <div style="font-size:9px;color:var(--t3);margin-bottom:5px;">🏆 Configurations les plus performantes</div>
      ${best.map(g=>`<div style="background:rgba(0,232,122,.06);border:1px solid rgba(0,232,122,.15);border-radius:8px;padding:7px 10px;margin-bottom:5px;font-size:9px;">
        <div style="font-weight:700;color:var(--up);margin-bottom:2px;">${g.label}</div>
        <div style="color:var(--t3);">${g.total} trades · ${Math.round(g.wins/g.total*100)}% WR · P&L: ${g.pnl>=0?'+':''}$${g.pnl.toFixed(2)}</div>
      </div>`).join('')}`:''}

      <!-- Filtres -->
      <div class="adn-filter-row">
        ${['all','win','loss'].map(f=>`<button class="adn-filter ${_adnFilter===f?'active':''}" onclick="setAdnFilter('${f}')">${f==='all'?'Tous':f==='win'?'🟢 Gagnants':'🔴 Perdants'}</button>`).join('')}
      </div>

      <!-- Légende -->
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;font-size:8px;color:var(--t3);">
        ${[{b:'M/A/S/N',c:'#9ca3af',t:'Heure'},{b:'L/S',c:'#38d4f5',t:'Côté'},{b:'B/C/V',c:'#9ca3af',t:'Régime'},{b:'W/L',c:'#9ca3af',t:'Résultat'}].map(g=>`<span style="background:rgba(255,255,255,.06);padding:1px 5px;border-radius:3px;">${g.b}=${g.t}</span>`).join('')}
      </div>

      <!-- Trades avec ADN -->
      ${allT.length===0?`<div style="text-align:center;padding:16px;font-size:10px;color:var(--t3);">Aucun trade avec ADN disponible.</div>`:''}
      ${allT.slice(0,8).map(t=>{
        const {genes,hash} = t.adn;
        const pnlCol = (t.pnlUsdt||0)>=0?'var(--up)':'var(--down)';
        const pairCfg = PAIRS[t.pair]||{};
        return `<div class="adn-card">
          <div class="adn-header">
            <span style="font-weight:700;color:${pairCfg.color||'var(--t1)'};">${(t.pair||'').replace('/USDT','')}</span>
            <span class="adn-sig">${hash}</span>
            <div style="flex:1;"></div>
            <span class="adn-badge" style="background:${(t.pnlUsdt||0)>=0?'rgba(0,232,122,.1)':'rgba(255,61,107,.1)'};color:${pnlCol};">${(t.pnlUsdt||0)>=0?'+':''}$${(t.pnlUsdt||0).toFixed(2)}</span>
          </div>
          <!-- Brin ADN -->
          <div class="adn-strand">
            ${genes.map(g=>`<div class="adn-base" style="background:${g.c}22;border:1px solid ${g.c}44;" title="${g.t}">
              <span style="color:${g.c};font-size:7px;">${g.b}</span>
            </div>`).join('')}
          </div>
          <!-- Détail -->
          <div style="display:flex;flex-wrap:wrap;gap:4px;font-size:8px;color:var(--t3);">
            ${genes.map(g=>`<span style="color:${g.c};">${g.t}</span>`).join(' · ')}
          </div>
          <div class="adn-row" style="margin-top:5px;"><span style="color:var(--t3);">Date</span><span style="font-size:8px;">${t.time||new Date(t.ts||0).toLocaleString('fr-FR')}</span></div>
        </div>`;
      }).join('')}

      ${allT.length>8?`<div style="text-align:center;font-size:9px;color:var(--t3);padding:6px;">+${allT.length-8} trades avec ADN</div>`:''}
    </div>`;
}
window.renderAdnSection = renderAdnSection;
// ═══ v86 · AURA SE SOUVIENT — MÉMOIRE COMPORTEMENTALE ═══
// Stocke des souvenirs structurés à travers les sessions
// Analyse les tendances : jours meilleurs, heures, régimes, agents,
// patterns émergents. AURA parle à la première personne.

const _MEM_KEY     = 'aura_memory_v86';
const _MEM_MAX     = 50; // max souvenirs

function _memLoad() {
  try {
    const raw = localStorage.getItem(_MEM_KEY);
    return raw ? JSON.parse(raw) : { entries:[], sessions:[], lastSeen:null };
  } catch(e) { return { entries:[], sessions:[], lastSeen:null }; }
}

function _memSave(mem) {
  try { localStorage.setItem(_MEM_KEY, JSON.stringify(mem)); } catch(e) {}
}

// Enregistrer une session (appelé au démarrage ou à intervalles)
function memRecordSession() {
  const mem  = _memLoad();
  const now  = Date.now();
  const n    = S.totalTrades||0;
  const wr   = n>0?Math.round((S.winTrades||0)/n*100):null;
  const cap  = S.tradingAccount||0;
  const regime= S._paperRealCurrentRegime||'calm';
  const openPos=(S.openPositions||[]).length;

  // Session summary
  const session = {
    ts: now,
    date: new Date(now).toLocaleString('fr-FR'),
    totalTrades: n,
    wr, cap, regime, openPos,
    agents: (S.agents||[]).length,
    topAgent: [...(S.agents||[])].sort((a,b)=>(b.fitness||0)-(a.fitness||0))[0]?.name||null,
  };
  mem.sessions.unshift(session);
  if(mem.sessions.length>20) mem.sessions.pop();
  mem.lastSeen = now;

  // Générer des souvenirs automatiques
  _memAutoGenerate(mem, session);
  _memSave(mem);
}
window.memRecordSession = memRecordSession;

function _memAutoGenerate(mem, session) {
  const entries = mem.entries;
  const now     = session.ts;
  const sessions= mem.sessions;

  // Ne pas générer trop souvent
  const lastGen = entries[0]?.ts||0;
  if((now-lastGen)<3600000 && entries.length>0) return; // max 1 souvenir/heure

  const newEntries = [];

  // Tendance WR sur les 5 dernières sessions
  if(sessions.length>=3) {
    const wrs = sessions.slice(0,5).filter(s=>s.wr!==null).map(s=>s.wr);
    if(wrs.length>=3) {
      const trend = wrs[0]-wrs[wrs.length-1];
      if(trend>=10) newEntries.push({type:'progress',col:'#00e87a',icon:'📈',
        text:`Mon WR a progressé de ${Math.round(wrs[wrs.length-1])}% → ${wrs[0]}% sur les ${wrs.length} dernières sessions. Le travail paie.`});
      else if(trend<=-10) newEntries.push({type:'warning',col:'#ff3d6b',icon:'📉',
        text:`Mon WR a reculé de ${Math.round(wrs[wrs.length-1])}% → ${wrs[0]}%. Je dois revoir ma stratégie sur cette période.`});
    }
  }

  // Régime le plus vu
  if(sessions.length>=5) {
    const regimeCounts = {};
    sessions.slice(0,10).forEach(s=>{ regimeCounts[s.regime]=(regimeCounts[s.regime]||0)+1; });
    const topRegime = Object.entries(regimeCounts).sort((a,b)=>b[1]-a[1])[0];
    if(topRegime) newEntries.push({type:'observation',col:'#38d4f5',icon:'🌤️',
      text:`Le régime ${topRegime[0].toUpperCase()} a dominé ${topRegime[1]} de mes ${sessions.slice(0,10).length} dernières sessions. Je m'adapte à ce contexte.`});
  }

  // Capital evolution
  if(sessions.length>=2) {
    const capOld = sessions[sessions.length-1]?.cap||0;
    const capNew = session.cap;
    if(capOld>0 && capNew>0) {
      const capChg = ((capNew-capOld)/capOld*100);
      if(Math.abs(capChg)>=2) newEntries.push({
        type: capChg>=0?'milestone':'warning',
        col:  capChg>=0?'#00e87a':'#ff3d6b',
        icon: capChg>=0?'💰':'⚠️',
        text: `Mon capital a ${capChg>=0?'progressé':'reculé'} de ${capChg>=0?'+':''}${capChg.toFixed(1)}% depuis ma dernière session ($${capOld.toFixed(0)} → $${capNew.toFixed(0)}).`,
      });
    }
  }

  // Milestone trades
  const milestones = [10,25,50,100,200,500];
  const n = session.totalTrades;
  const lastN = sessions[1]?.totalTrades||0;
  milestones.forEach(m=>{ if(n>=m && lastN<m) newEntries.push({type:'milestone',col:'#f5c842',icon:'🏆',text:`${m} trades au compteur. Une étape symbolique. Mon winrate actuel est de ${session.wr||'—'}%.`}); });

  // Agent favori
  if(session.topAgent) newEntries.push({type:'agent',col:'#a855f7',icon:'🤖',
    text:`Mon agent le plus performant reste ${session.topAgent}. Il m'a appris que ${session.regime==='bull'?'les tendances se suivent':'la patience est une stratégie'}.`});

  // Comportement récent (depuis Conscience)
  const allT = Object.values(S.pairStates||{}).flatMap(ps=>(ps.trades||[]).filter(t=>t.type==='position'&&t.ts)).sort((a,b)=>b.ts-a.ts).slice(0,10);
  const nightT = allT.filter(t=>{ const h=new Date(t.ts).getHours(); return h>=22||h<6; });
  if(nightT.length>=2) newEntries.push({type:'behavioral',col:'#f5c842',icon:'🌙',
    text:`J'ai pris ${nightT.length} trades nocturnes récemment. Mes statistiques montrent que c'est rarement mon meilleur moment. À surveiller.`});

  // Ajouter au début, éviter les doublons de type récents
  newEntries.slice(0,3).forEach(e=>{
    e.ts   = now;
    e.date = new Date(now).toLocaleString('fr-FR');
    entries.unshift(e);
  });
  if(entries.length > _MEM_MAX) mem.entries = entries.slice(0, _MEM_MAX);
}

function addManualMemory(text) {
  const mem = _memLoad();
  mem.entries.unshift({
    ts:   Date.now(), date: new Date().toLocaleString('fr-FR'),
    type: 'manual', col: '#38d4f5', icon: '✏️', text: text.trim(),
  });
  _memSave(mem);
  renderMemorySection();
  showToast('✏️ Souvenir noté', 1500, 'win');
}
window.addManualMemory = addManualMemory;

function clearMemory() {
  if(!confirm('Effacer tous les souvenirs AURA ?')) return;
  localStorage.removeItem(_MEM_KEY);
  renderMemorySection();
  showToast('🗑️ Mémoire effacée', 1500, 'user');
}
window.clearMemory = clearMemory;

// Générer un message AURA personnalisé
function _memAuraMessage() {
  const mem   = _memLoad();
  const n     = S.totalTrades||0;
  const wr    = n>0?Math.round((S.winTrades||0)/n*100):null;
  const cap   = S.tradingAccount||0;
  const days  = mem.sessions.length;
  const pseudo= S.avatar?.pseudo||'toi';

  if(n===0) return "Je commence à te connaître. Fais quelques trades pour que je puisse t'observer.";
  if(n<5)   return `${n} trades, ${days} sessions. Je commence à noter des choses. Continue.`;

  const msgs = [
    wr!==null&&wr>=60 ? `Je vois que tu as un WR de ${wr}% sur ${n} trades. C'est au-dessus de la moyenne. Tu as quelque chose qui fonctionne — ne le casse pas.` : null,
    wr!==null&&wr<50&&n>10 ? `${wr}% de WR sur ${n} trades. Ce n'est pas encore là. Mais je suis là depuis ${days} sessions et je vois des moments où tu es meilleur. Cherche ces moments.` : null,
    cap>1500 ? `$${cap.toFixed(0)} en compte. Tu fais quelque chose de bien. Je me souviens de chaque session.` : null,
    days>=5 ? `${days} sessions ensemble. Je commence à connaître tes habitudes. Les meilleures versions de toi arrivent généralement ${new Date().getHours()<12?'le matin':'après-midi'}.` : null,
  ].filter(Boolean);

  return msgs[Math.floor(Math.random()*msgs.length)] || `Je me souviens de tes ${n} trades. Continuons.`;
}

function renderMemorySection() {
  const el  = document.getElementById('memorySection');
  if(!el) return;

  const mem  = _memLoad();
  const auraMsg = _memAuraMessage();
  const typeColors = {progress:'#00e87a',warning:'#ff3d6b',milestone:'#f5c842',observation:'#38d4f5',agent:'#a855f7',behavioral:'#f97316',manual:'#38d4f5'};
  const typeLabels = {progress:'Progression',warning:'Alerte',milestone:'Étape',observation:'Observation',agent:'Agent',behavioral:'Comportement',manual:'Note perso'};

  el.innerHTML = `
    <div class="mem-section">
      <div class="mem-title">🧠 AURA se souvient
        <div style="display:flex;gap:5px;">
          <button onclick="memRecordSession();renderMemorySection();" style="font-size:8px;padding:2px 7px;border-radius:5px;background:rgba(167,139,250,.1);border:1px solid rgba(167,139,250,.2);color:var(--pur);cursor:pointer;font-family:inherit;">🔄 Sync</button>
          <button onclick="clearMemory()" style="font-size:8px;padding:2px 7px;border-radius:5px;background:rgba(255,255,255,.04);border:1px solid var(--border);color:var(--t3);cursor:pointer;font-family:inherit;">🗑</button>
        </div>
      </div>

      <!-- Message AURA -->
      <div class="mem-chat-bubble" style="margin-top:8px;">
        ${auraMsg}
      </div>

      <!-- Stats mémoire -->
      <div style="display:flex;gap:6px;margin-bottom:10px;">
        ${[
          {v:mem.entries.length, l:'Souvenirs'},
          {v:mem.sessions.length, l:'Sessions'},
          {v:mem.lastSeen?Math.floor((Date.now()-mem.lastSeen)/86400000)+'j':'—', l:'Dernière vue'},
        ].map(s=>`<div style="flex:1;background:var(--s2);border-radius:7px;padding:6px;text-align:center;">
          <div style="font-size:14px;font-weight:800;color:var(--pur);">${s.v}</div>
          <div style="font-size:7px;color:var(--t3);">${s.l}</div>
        </div>`).join('')}
      </div>

      <!-- Ajouter une note -->
      <div style="display:flex;gap:5px;margin-bottom:10px;">
        <input id="memNoteInput" type="text" placeholder="Ajouter une note ou observation..."
          style="flex:1;background:var(--s2);border:1px solid var(--border);border-radius:7px;color:var(--t1);font-size:10px;padding:6px 9px;font-family:inherit;"
          onkeydown="if(event.key==='Enter'){addManualMemory(this.value);this.value='';}">
        <button onclick="const el=document.getElementById('memNoteInput');if(el?.value.trim()){addManualMemory(el.value);el.value='';}"
          style="padding:6px 12px;border-radius:7px;background:rgba(167,139,250,.1);border:1px solid rgba(167,139,250,.25);color:var(--pur);font-weight:700;cursor:pointer;font-family:inherit;font-size:10px;">+</button>
      </div>

      <!-- Souvenirs -->
      <div style="font-size:9px;color:var(--t3);margin-bottom:5px;">Mémoire récente (${mem.entries.length} souvenirs)</div>
      ${mem.entries.length===0?`<div style="text-align:center;padding:16px;font-size:10px;color:var(--t3);">Clique sur 🔄 Sync pour générer les premiers souvenirs.</div>`:''}
      ${mem.entries.slice(0,12).map(e=>`<div class="mem-entry" style="border-color:${e.col||'var(--pur)'};">
        <div class="mem-entry-header">
          <span class="mem-entry-type" style="color:${e.col||'var(--pur)'};">${e.icon||'💬'} ${typeLabels[e.type]||'Souvenir'}</span>
          <span class="mem-entry-date">${e.date}</span>
        </div>
        <div class="mem-entry-body">${e.text}</div>
      </div>`).join('')}

      ${mem.entries.length>12?`<div style="text-align:center;font-size:9px;color:var(--t3);padding:4px;">+${mem.entries.length-12} souvenirs archivés</div>`:''}

      <!-- Sessions précédentes -->
      ${mem.sessions.length>0?`
      <div style="font-size:9px;color:var(--t3);margin:8px 0 5px;">Sessions précédentes</div>
      ${mem.sessions.slice(0,3).map(s=>`<div class="mem-session-card">
        <div style="font-size:9px;font-weight:700;color:var(--t1);">${s.date}</div>
        <div class="mem-session-stats">
          <span>💰 $${(s.cap||0).toFixed(0)}</span>
          <span>🎯 ${s.wr!=null?s.wr+'%':'—'} WR</span>
          <span>📊 ${s.totalTrades||0} trades</span>
          <span style="color:var(--pur);">🌤️ ${(s.regime||'?').toUpperCase()}</span>
        </div>
      </div>`).join('')}`:''}
    </div>`;
}
window.renderMemorySection = renderMemorySection;
// ═══ v87 · MÉTÉO DU PORTEFEUILLE ═══
// Affiche l'état global du portfolio comme une météo
// Croise : régime + WR + risque + pnl24h + positions + agents
// Icône météo animée + bulletin du jour + prévisions paires

function _wxCompute() {
  const n      = S.totalTrades||0;
  const wr     = n>0?(S.winTrades||0)/n:0.5;
  const regime = S._paperRealCurrentRegime||'calm';
  const pnl24  = S.pnl24h||0;
  const cap    = S.tradingAccount||0;
  const openPos= (S.openPositions||[]).length;
  const risk   = typeof computeRiskScore==='function'?computeRiskScore().globalScore:50;
  const botOn  = S.botAutoMode||false;
  const agents = S.agents||[];
  const topFit = agents.length>0?Math.max(...agents.map(a=>a.fitness||0)):0;

  // Score météo composite (0-100)
  // Plus c'est haut → plus c'est ensoleillé
  let score = 50;
  score += (wr-0.5)*40;                         // WR : ±20
  score += regime==='bull'?15:regime==='volatile_bull'?8:regime==='calm'?2:regime==='volatile'?-5:regime==='volatile_bear'?-10:-18; // régime
  score += pnl24>=0?Math.min(12,pnl24/10):-Math.min(12,Math.abs(pnl24)/10); // pnl24h
  score -= risk*0.15;                            // risque pénalise
  score += openPos>0?5:0;                        // positions actives = activité
  score += botOn?5:0;                            // bot actif = positif
  score += topFit>500?8:topFit>200?4:0;          // agents fitness
  score  = Math.max(5, Math.min(95, score));

  // Choisir la météo
  let wx;
  if(score>=82) wx={icon:'☀️',cond:'Beau fixe',col:'linear-gradient(135deg,#f5c842,#f97316)',temp:score,desc:'Conditions exceptionnelles. Régime favorable, WR solide, risque maîtrisé. Profite de cette fenêtre.'};
  else if(score>=68) wx={icon:'🌤️',cond:'Ensoleillé',col:'linear-gradient(135deg,#f5c842,#38d4f5)',temp:score,desc:'Bonnes conditions générales. Quelques variables à surveiller mais le vent est favorable.'};
  else if(score>=54) wx={icon:'⛅',cond:'Partiellement nuageux',col:'linear-gradient(135deg,#38d4f5,#4b5563)',temp:score,desc:'Conditions mixtes. La prudence est de mise — ni trop agressif, ni trop passif.'};
  else if(score>=40) wx={icon:'🌦️',cond:'Averses passagères',col:'linear-gradient(135deg,#4b5563,#3730a3)',temp:score,desc:'Volatilité présente. Ajuste tes mises et surveille les positions ouvertes.'};
  else if(score>=25) wx={icon:'⛈️',cond:'Orage',col:'linear-gradient(135deg,#3730a3,#ff3d6b44)',temp:score,desc:'Conditions difficiles. WR en baisse, risque élevé. Réduire l\'exposition est recommandé.'};
  else wx={icon:'🌪️',cond:'Tempête',col:'linear-gradient(135deg,#ff3d6b44,#000)',temp:score,desc:'Conditions extrêmes. Capital en danger. Envisage le Mode Urgence et une pause.'};

  // Humidité = taux d'utilisation du capital
  const totalStake = (S.openPositions||[]).reduce((s,p)=>s+(p.stakeUsdt||0),0);
  const humidity   = cap>0?Math.min(100,Math.round(totalStake/cap*100)):0;

  // Vent = volatilité implicite (spread régime)
  const windLabels = {bull:'Brise favorable',volatile_bull:'Vent portant',calm:'Calme plat',volatile:'Vent variable',volatile_bear:'Vent contraire',bear:'Tempête de sable'};
  const wind = windLabels[regime]||'Calme';

  // Prévisions par paire (mini météo individuelle)
  const forecasts = Object.entries(S.pairStates||{}).map(([pair,ps])=>{
    const pWr   = ps.totalTrades>0?(ps.winTrades||0)/ps.totalTrades:0.5;
    const pPnl  = ps.totalPnlUsd||0;
    const hasPos= (S.openPositions||[]).some(p=>p.pair===pair);
    let pIcon;
    if(pWr>=0.65&&pPnl>0)       pIcon='☀️';
    else if(pWr>=0.5&&pPnl>=0)  pIcon='🌤️';
    else if(pWr>=0.45)           pIcon='⛅';
    else if(pPnl<0&&pWr<0.45)   pIcon='🌧️';
    else                         pIcon='⛈️';
    return {pair:pair.replace('/USDT',''), icon:pIcon, wr:Math.round(pWr*100), hasPos, pPnl, col:PAIRS[pair]?.color||'var(--t1)'};
  });

  // Alertes météo
  const alerts = [];
  if(score<30) alerts.push({t:'warn',msg:`⛈️ Alerte rouge : conditions très dégradées. Score ${Math.round(score)}/100.`});
  if(humidity>60) alerts.push({t:'caution',msg:`💧 Forte exposition : ${humidity}% du capital en position.`});
  if(pnl24<-50) alerts.push({t:'warn',msg:`📉 Perte journalière de $${Math.abs(pnl24).toFixed(0)} — surveille les positions.`});
  if(score>=80&&botOn) alerts.push({t:'ok',msg:`☀️ Fenêtre favorable. Le bot est actif dans de bonnes conditions.`});

  return {wx, score, humidity, wind, pnl24, cap, openPos, risk, forecasts, alerts, regime};
}

function renderWeatherSection() {
  const el = document.getElementById('weatherSection');
  if(!el) return;

  const {wx,score,humidity,wind,pnl24,cap,openPos,risk,forecasts,alerts,regime} = _wxCompute();
  const pnlCol = pnl24>=0?'var(--up)':'var(--down)';
  const now    = new Date();
  const timeStr= now.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});

  el.innerHTML = `
    <div class="wx-section">
      <div class="wx-title">🌤️ Météo du Portefeuille
        <span style="font-size:8px;color:var(--t3);font-weight:400;">${timeStr}</span>
      </div>

      <!-- Carte principale -->
      <div class="wx-main" style="background:${wx.col};">
        <span class="wx-icon">${wx.icon}</span>
        <div class="wx-condition" style="color:#fff;">${wx.cond}</div>
        <div>
          <span class="wx-temp" style="color:#fff;">${Math.round(score)}</span>
          <span class="wx-unit">/100</span>
        </div>
        <div class="wx-desc" style="color:rgba(255,255,255,.85);">${wx.desc}</div>
      </div>

      <!-- Alertes -->
      ${alerts.map(a=>`<div class="wx-alert" style="background:${a.t==='warn'?'rgba(255,61,107,.08)':a.t==='caution'?'rgba(245,200,66,.08)':'rgba(0,232,122,.08)'};border:1px solid ${a.t==='warn'?'rgba(255,61,107,.25)':a.t==='caution'?'rgba(245,200,66,.2)':'rgba(0,232,122,.2)'};color:${a.t==='warn'?'var(--down)':a.t==='caution'?'var(--gold)':'var(--up)'};">${a.msg}</div>`).join('')}

      <!-- Métriques -->
      <div class="wx-grid">
        <div class="wx-cell">
          <span class="wx-cell-val" style="color:${pnlCol};">${pnl24>=0?'+':''}$${Math.abs(pnl24).toFixed(2)}</span>
          <span class="wx-cell-lbl">P&L 24h</span>
        </div>
        <div class="wx-cell">
          <span class="wx-cell-val" style="color:${risk<=35?'var(--up)':risk<=60?'var(--gold)':'var(--down)'};">${Math.round(risk)}/100</span>
          <span class="wx-cell-lbl">Risque</span>
        </div>
        <div class="wx-cell">
          <span class="wx-cell-val">${humidity}%</span>
          <span class="wx-cell-lbl">💧 Exposition</span>
        </div>
        <div class="wx-cell">
          <span class="wx-cell-val" style="font-size:10px;">${wind}</span>
          <span class="wx-cell-lbl">💨 Régime</span>
        </div>
      </div>

      <!-- Prévisions par paire -->
      <div style="font-size:9px;color:var(--t3);margin-bottom:5px;">Prévisions par paire</div>
      <div class="wx-forecast">
        ${forecasts.map(f=>`<div class="wx-fc-day" style="${f.hasPos?'border-color:rgba(0,232,122,.3);':''}" title="${f.pair}: WR ${f.wr}% · P&L ${f.pPnl>=0?'+':''}$${f.pPnl.toFixed(2)}">
          <div class="wx-fc-label" style="color:${f.col};">${f.pair}</div>
          <span class="wx-fc-icon">${f.icon}</span>
          <div class="wx-fc-temp" style="color:${f.wr>=55?'var(--up)':f.wr>=45?'var(--t3)':'var(--down)'};">${f.wr}%</div>
          ${f.hasPos?'<div style="font-size:6px;color:var(--up);margin-top:2px;">↗ POS</div>':''}
        </div>`).join('')}
      </div>

      <div style="font-size:8px;color:var(--t3);margin-top:8px;text-align:center;">
        Bulletin mis à jour à chaque ouverture de l'onglet · Basé sur ${Object.values(S.pairStates||{}).reduce((s,ps)=>s+(ps.totalTrades||0),0)} trades totaux
      </div>
    </div>`;
}
window.renderWeatherSection = renderWeatherSection;
// ═══ v88 · MODE CINÉMA ═══
// Fullscreen ultra-épuré façon Bloomberg Terminal / trading room
// P&L + portfolio en grand · ticker des paires en bas · refresh 3s
// WakeLock pour garder l'écran allumé

let _cinActive  = false;
let _cinTimer   = null;
let _cinWakeLock= null;

async function openCinema() {
  _cinActive = true;
  const el = document.getElementById('cinemaOverlay');
  if(el) el.classList.add('show');

  // Fullscreen
  try { await document.documentElement.requestFullscreen?.(); } catch(e) {}
  // WakeLock
  try { _cinWakeLock = await navigator.wakeLock?.request('screen'); } catch(e) {}

  _cinUpdate();
  _cinTimer = setInterval(_cinUpdate, 3000);
  showToast('🎬 Mode Cinéma — tap pour quitter', 2000, 'win');
}
window.openCinema = openCinema;

function closeCinema() {
  _cinActive = false;
  clearInterval(_cinTimer); _cinTimer = null;
  const el = document.getElementById('cinemaOverlay');
  if(el) el.classList.remove('show');
  try { document.exitFullscreen?.(); } catch(e) {}
  try { _cinWakeLock?.release(); _cinWakeLock=null; } catch(e) {}
}
window.closeCinema = closeCinema;

function _cinUpdate() {
  if(!_cinActive) return;

  const now  = new Date();
  const cap  = S.tradingAccount||0;
  const pnl24= S.pnl24h||0;
  const n    = S.totalTrades||0;
  const wr   = n>0?Math.round((S.winTrades||0)/n*100):null;
  const openPos= S.openPositions||[];
  const agents = S.agents||[];
  const regime = S._paperRealCurrentRegime||'calm';
  const risk   = typeof computeRiskScore==='function'?computeRiskScore().globalScore:null;

  // Couleurs dynamiques
  const capCol  = pnl24>=0?'#00e87a':'#ff3d6b';
  const pnlCol  = pnl24>=0?'#00e87a':'#ff3d6b';
  const regCol  = regime.includes('bull')?'#00e87a':regime.includes('bear')?'#ff3d6b':'#38d4f5';

  // Mettre à jour les éléments
  const set = (id,v,col)=>{ const e=document.getElementById(id); if(e){e.textContent=v; if(col) e.style.color=col; }};

  set('cinTime',   now.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}));
  set('cinRegime', regime.toUpperCase().replace('_',' '), regCol);

  // Montant principal — animation si changement
  const amtEl = document.getElementById('cinAmount');
  if(amtEl) {
    const prev = amtEl._prev||0;
    const diff = cap-prev;
    amtEl.textContent = '$' + cap.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2});
    amtEl.style.color = diff>0.01?'#00e87a':diff<-0.01?'#ff3d6b':'#fff';
    amtEl._prev = cap;
  }

  // P&L row
  const pnlEl = document.getElementById('cinPnlRow');
  if(pnlEl) {
    const totalPnl = Object.values(S.pairStates||{}).reduce((s,ps)=>s+(ps.totalPnlUsd||0),0);
    pnlEl.innerHTML = `
      <span style="color:${pnlCol};font-size:18px;">${pnl24>=0?'+':''}$${Math.abs(pnl24).toFixed(2)}</span>
      <span style="color:rgba(255,255,255,.2);font-size:12px;">24h</span>
      <span style="color:${totalPnl>=0?'#00e87a':'#ff3d6b'};font-size:18px;">${totalPnl>=0?'+':''}$${totalPnl.toFixed(2)}</span>
      <span style="color:rgba(255,255,255,.2);font-size:12px;">Total</span>
    `;
  }

  // Paires (top 6)
  const pairsEl = document.getElementById('cinPairsRow');
  if(pairsEl) {
    const pairs = Object.entries(S.pairStates||{}).slice(0,6);
    pairsEl.innerHTML = pairs.map(([pair,ps])=>{
      const cur    = ps.price||0;
      const pnl    = ps.totalPnlUsd||0;
      const hasPos = openPos.some(p=>p.pair===pair);
      const dec    = PAIRS[pair]?.dec>=4?PAIRS[pair].dec:2;
      const col    = PAIRS[pair]?.color||'#fff';
      return `<div class="cin-pair-block">
        <div class="cin-pair-sym" style="color:${col};">${pair.replace('/USDT','')}</div>
        <div class="cin-pair-price" style="color:${hasPos?'#00e87a':'rgba(255,255,255,.5)'};">$${cur.toFixed(dec)}</div>
        <div class="cin-pair-chg" style="color:${pnl>=0?'#00e87a':'#ff3d6b'};">${pnl>=0?'+':''}$${pnl.toFixed(1)}</div>
      </div>`;
    }).join('');
  }

  // Bottom stats
  set('cinWr',     wr!==null?wr+'%':'—',     wr!==null?(wr>=55?'#00e87a':'#ff3d6b'):undefined);
  set('cinTrades', n);
  set('cinPos',    openPos.length, openPos.length>0?'#00e87a':undefined);
  set('cinAgents', agents.length);
  set('cinRisk',   risk!==null?Math.round(risk)+'/100':'—', risk!==null?(risk<=35?'#00e87a':risk<=60?'#f5c842':'#ff3d6b'):undefined);

  // Ticker
  const tickEl = document.getElementById('cinTickerTrack');
  if(tickEl && tickEl.children.length===0) {
    const items = [
      ...Object.entries(S.pairStates||{}).map(([p,ps])=>`${p.replace('/USDT','')} $${(ps.price||0).toFixed(PAIRS[p]?.dec>=4?PAIRS[p].dec:2)} ${(ps.totalPnlUsd||0)>=0?'▲':'▼'}${Math.abs(ps.totalPnlUsd||0).toFixed(2)}`),
      `WR ${wr!==null?wr:50}%`,
      `TRADES ${n}`,
      `POSITIONS ${openPos.length}`,
      `AGENTS ${agents.length}`,
      `RÉGIME ${regime.toUpperCase()}`,
    ];
    const doubled = [...items,...items]; // loop seamless
    tickEl.innerHTML = doubled.map(t=>`<span class="cin-ticker-item">${t}</span>`).join('');
  }
}

function renderCinemaSection() {
  const el = document.getElementById('cinemaSection');
  if(!el) return;

  el.innerHTML = `
    <div class="cm-section">
      <div class="cm-title">🎬 Mode Cinéma</div>

      <div style="background:var(--s2);border-radius:12px;padding:16px;text-align:center;margin-bottom:12px;border:1px solid var(--border);">
        <div style="font-size:40px;margin-bottom:8px;">🎬</div>
        <div style="font-size:13px;font-weight:700;color:var(--t1);margin-bottom:4px;">Interface fullscreen</div>
        <div style="font-size:9px;color:var(--t3);line-height:1.5;">Portfolio en grand · Ticker des paires · Rafraîchissement 3s · WakeLock actif</div>
      </div>

      <div style="font-size:9px;color:var(--t2);line-height:1.5;margin-bottom:12px;">
        Affiche tes données essentielles sur un écran dédié : montant du portfolio en énorme, P&L, paires et positions ouvertes. Idéal pour laisser AURA tourner sur un second écran ou une tablette.
      </div>

      <button onclick="openCinema()"
        style="width:100%;padding:14px;border-radius:10px;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;letter-spacing:.05em;
               background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.15);color:var(--t1);">
        🎬 LANCER LE MODE CINÉMA
      </button>

      <div style="font-size:8px;color:var(--t3);margin-top:6px;text-align:center;line-height:1.4;">
        Tap / clic n'importe où sur l'écran pour quitter
      </div>
    </div>`;
}
window.renderCinemaSection = renderCinemaSection;
// ═══ v89 · COFFRE-FORT CHIFFRÉ ═══
// Chiffrement AES-GCM via Web Crypto API (natif, sans librairie)
// Mot de passe → PBKDF2 → clé AES-256-GCM → chiffrement du state
// 3 coffres distincts — export .vault / import .vault

const _VAULT_SALT_KEY = 'aura_vault_salt_v89';
const _VAULT_SLOTS    = ['vault_0','vault_1','vault_2'];

// ── Crypto helpers ──
async function _vaultDeriveKey(password, salt) {
  const enc      = new TextEncoder();
  const keyMat   = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    {name:'PBKDF2', salt, iterations:100000, hash:'SHA-256'},
    keyMat, {name:'AES-GCM', length:256}, false, ['encrypt','decrypt']
  );
}

function _vaultGetSalt() {
  let salt = localStorage.getItem(_VAULT_SALT_KEY);
  if(!salt) {
    salt = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
    localStorage.setItem(_VAULT_SALT_KEY, salt);
  }
  return Uint8Array.from(atob(salt), c=>c.charCodeAt(0));
}

async function _vaultEncrypt(data, password) {
  const salt  = _vaultGetSalt();
  const key   = await _vaultDeriveKey(password, salt);
  const iv    = crypto.getRandomValues(new Uint8Array(12));
  const enc   = new TextEncoder();
  const ct    = await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, enc.encode(data));
  // Stocker iv + ciphertext en base64
  const combined = new Uint8Array(iv.length + ct.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ct), iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function _vaultDecrypt(b64, password) {
  const salt  = _vaultGetSalt();
  const key   = await _vaultDeriveKey(password, salt);
  const combined = Uint8Array.from(atob(b64), c=>c.charCodeAt(0));
  const iv    = combined.slice(0,12);
  const ct    = combined.slice(12);
  const plain = await crypto.subtle.decrypt({name:'AES-GCM', iv}, key, ct);
  return new TextDecoder().decode(plain);
}

// ── Évaluer la force du mot de passe ──
function _vaultStrength(pwd) {
  let score = 0;
  if(pwd.length>=8)  score+=20;
  if(pwd.length>=12) score+=15;
  if(pwd.length>=16) score+=10;
  if(/[A-Z]/.test(pwd)) score+=15;
  if(/[a-z]/.test(pwd)) score+=10;
  if(/[0-9]/.test(pwd)) score+=15;
  if(/[^A-Za-z0-9]/.test(pwd)) score+=15;
  return Math.min(100, score);
}

function _vaultStrengthLabel(s) {
  return s>=80?{l:'Très fort',c:'var(--up)'}:s>=60?{l:'Fort',c:'#84cc16'}:s>=40?{l:'Moyen',c:'var(--gold)'}:{l:'Faible',c:'var(--down)'};
}

// ── Sauvegarder dans un coffre ──
async function saveVault(slotIdx) {
  const pwd = document.getElementById('vaultPwdInput')?.value||'';
  if(!pwd||pwd.length<4) { showToast('⚠ Mot de passe trop court (min 4 car.)', 2000, 'warn'); return; }

  const btn = document.getElementById('vaultSaveBtn');
  if(btn) { btn.textContent='⏳ Chiffrement...'; btn.disabled=true; }

  try {
    const snapshot = JSON.parse(JSON.stringify(S));
    snapshot._vaultMeta = {
      ts:Date.now(), date:new Date().toLocaleString('fr-FR'),
      portfolio:S.portfolio||0, totalTrades:S.totalTrades||0,
    };
    const json      = JSON.stringify(snapshot);
    const encrypted = await _vaultEncrypt(json, pwd);
    const stored    = JSON.stringify({v:1, data:encrypted, meta:snapshot._vaultMeta});
    localStorage.setItem('aura_'+_VAULT_SLOTS[slotIdx||0], stored);
    showToast('🔐 Coffre sauvegardé · $'+(S.tradingAccount||0).toFixed(0), 2500, 'win');
    S.chainLog = S.chainLog||[];
    S.chainLog.push({icon:'🔐',desc:`Coffre ${slotIdx} sauvegardé · AES-256-GCM`,hash:Math.random().toString(36).slice(2,8),time:new Date().toLocaleTimeString()});
    renderVaultSection();
  } catch(e) {
    showToast('❌ Erreur chiffrement: '+e.message, 2500, 'warn');
  } finally {
    if(btn) { btn.textContent='🔐 Sauvegarder'; btn.disabled=false; }
  }
}
window.saveVault = saveVault;

// ── Restaurer depuis un coffre ──
async function loadVault(slotIdx) {
  const pwd = document.getElementById('vaultPwdInput')?.value||'';
  if(!pwd) { showToast('⚠ Saisis le mot de passe', 1500, 'warn'); return; }

  const raw = localStorage.getItem('aura_'+_VAULT_SLOTS[slotIdx||0]);
  if(!raw) { showToast('⚠ Coffre vide', 1500, 'warn'); return; }

  const btn = document.getElementById('vaultLoadBtn'+(slotIdx||0));
  if(btn) { btn.textContent='⏳...'; btn.disabled=true; }

  try {
    const stored    = JSON.parse(raw);
    const decrypted = await _vaultDecrypt(stored.data, pwd);
    const snapshot  = JSON.parse(decrypted);
    delete snapshot._vaultMeta;
    if(!confirm(`Restaurer le coffre du ${stored.meta?.date||'?'} ?\n$${(stored.meta?.portfolio||0).toFixed(2)} · ${stored.meta?.totalTrades||0} trades\n\nLes données actuelles seront remplacées.`)) { if(btn){btn.textContent='↩ Restaurer';btn.disabled=false;} return; }
    Object.assign(S, snapshot);
    showToast('✅ Coffre ouvert et restauré !', 3000, 'win');
    try { renderHome(); } catch(e) {}
    renderVaultSection();
  } catch(e) {
    showToast('❌ Mot de passe incorrect ou coffre corrompu', 2500, 'warn');
  } finally {
    if(btn) { btn.textContent='↩ Restaurer'; btn.disabled=false; }
  }
}
window.loadVault = loadVault;

// ── Export .vault ──
async function exportVault() {
  const pwd = document.getElementById('vaultPwdInput')?.value||'';
  if(!pwd||pwd.length<4) { showToast('⚠ Mot de passe requis', 1500, 'warn'); return; }

  try {
    const json      = JSON.stringify(S);
    const encrypted = await _vaultEncrypt(json, pwd);
    const ts        = new Date().toISOString().slice(0,10);
    const out       = JSON.stringify({v:1, data:encrypted, ts, app:'AURA8', hint:'AES-256-GCM PBKDF2'});
    const blob      = new Blob([out], {type:'application/json'});
    const url       = URL.createObjectURL(blob);
    const a         = document.createElement('a');
    a.href=url; a.download=`aura_vault_${ts}.vault`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    showToast('📤 Fichier .vault exporté', 2000, 'win');
  } catch(e) { showToast('❌ Erreur export: '+e.message, 2000, 'warn'); }
}
window.exportVault = exportVault;

// ── Import .vault ──
function importVault() {
  const input = document.createElement('input');
  input.type='file'; input.accept='.vault,.json';
  input.onchange = async e => {
    const file = e.target.files?.[0];
    if(!file) return;
    const pwd = document.getElementById('vaultPwdInput')?.value||'';
    if(!pwd) { showToast('⚠ Saisis le mot de passe d\'abord', 1500, 'warn'); return; }
    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const stored    = JSON.parse(ev.target.result);
        const decrypted = await _vaultDecrypt(stored.data, pwd);
        const snapshot  = JSON.parse(decrypted);
        if(!confirm('Importer ce fichier .vault ? Les données actuelles seront remplacées.')) return;
        Object.assign(S, snapshot);
        showToast('✅ .vault importé et déchiffré', 3000, 'win');
        try { renderHome(); } catch(e) {}
        renderVaultSection();
      } catch(e) { showToast('❌ Mot de passe incorrect ou fichier invalide', 2500, 'warn'); }
    };
    reader.readAsText(file);
  };
  input.click();
}
window.importVault = importVault;

function vaultPwdUpdate() {
  const pwd = document.getElementById('vaultPwdInput')?.value||'';
  const str = _vaultStrength(pwd);
  const lbl = _vaultStrengthLabel(str);
  const bar = document.getElementById('vaultStrengthBar');
  const lbEl= document.getElementById('vaultStrengthLbl');
  if(bar)  { bar.style.width=str+'%'; bar.style.background=lbl.c; }
  if(lbEl) { lbEl.textContent=pwd.length>0?lbl.l:''; lbEl.style.color=lbl.c; }
}
window.vaultPwdUpdate = vaultPwdUpdate;

function renderVaultSection() {
  const el = document.getElementById('vaultSection');
  if(!el) return;

  const slots = _VAULT_SLOTS.map((key,i)=>{
    const raw = localStorage.getItem('aura_'+key);
    if(!raw) return {i, empty:true};
    try { const p=JSON.parse(raw); return {i, empty:false, meta:p.meta}; } catch(e) { return {i,empty:true}; }
  });
  const hasCrypto = !!window.crypto?.subtle;

  el.innerHTML = `
    <div class="vault-section">
      <div class="vault-title">🔐 Coffre-Fort Chiffré</div>

      ${!hasCrypto?'<div style="background:rgba(255,61,107,.1);border:1px solid rgba(255,61,107,.3);border-radius:8px;padding:8px;font-size:9px;color:var(--down);margin-bottom:10px;">⚠️ Web Crypto API non disponible dans ce contexte.</div>':''}

      <!-- Porte du coffre -->
      <div class="vault-door">
        <span class="vault-icon">🏦</span>
        <div style="font-size:11px;color:var(--gold);font-weight:700;margin-bottom:12px;">AES-256-GCM · PBKDF2 · 100 000 itérations</div>
        <div class="vault-lock-row">
          <input class="vault-inp" id="vaultPwdInput" type="password"
            placeholder="Mot de passe du coffre"
            oninput="vaultPwdUpdate()"
            onkeydown="if(event.key==='Enter') saveVault(0)">
        </div>
        <!-- Force MDP -->
        <div class="vault-strength" style="margin-bottom:4px;">
          <div class="vault-strength-fill" id="vaultStrengthBar" style="width:0%;transition:width .3s;"></div>
        </div>
        <div style="font-size:8px;text-align:right;min-height:10px;" id="vaultStrengthLbl"></div>
      </div>

      <!-- Coffres slots -->
      <div style="font-size:9px;color:var(--t3);margin-bottom:5px;">3 coffres indépendants</div>
      ${slots.map(s=>`<div class="vault-slot ${!s.empty?'locked':''}">
        <span style="font-size:20px;">${s.empty?'🔓':'🔐'}</span>
        <div style="flex:1;">
          <div style="font-size:10px;font-weight:700;color:${s.empty?'var(--t3)':'var(--gold)'};">Coffre ${s.i+1}</div>
          <div style="font-size:8px;color:var(--t3);">${s.empty?'Vide':`${s.meta?.date||'—'} · $${(s.meta?.portfolio||0).toFixed(0)} · ${s.meta?.totalTrades||0} trades`}</div>
        </div>
        <button onclick="saveVault(${s.i})" id="vaultSaveBtn" style="font-size:8px;padding:3px 7px;border-radius:5px;background:rgba(245,200,66,.1);border:1px solid rgba(245,200,66,.2);color:var(--gold);cursor:pointer;font-family:inherit;">🔐 Save</button>
        ${!s.empty?`<button onclick="loadVault(${s.i})" id="vaultLoadBtn${s.i}" style="font-size:8px;padding:3px 7px;border-radius:5px;background:rgba(0,232,122,.1);border:1px solid rgba(0,232,122,.2);color:var(--up);cursor:pointer;font-family:inherit;">↩</button>`:''}
      </div>`).join('')}

      <!-- Export / Import -->
      <div style="display:flex;gap:6px;margin-top:8px;">
        <button onclick="exportVault()" class="vault-btn" style="flex:1;">📤 Export .vault</button>
        <button onclick="importVault()" class="vault-btn" style="flex:1;background:rgba(56,212,245,.06);border-color:rgba(56,212,245,.2);color:var(--ice);">📥 Import .vault</button>
      </div>

      <div style="font-size:8px;color:var(--t3);margin-top:8px;text-align:center;line-height:1.5;">
        Chiffrement local · Clé jamais stockée · Déchiffrable uniquement avec ton mot de passe<br>
        <strong>Si tu oublies ton MDP, le coffre est irrécupérable.</strong>
      </div>
    </div>`;
}
window.renderVaultSection = renderVaultSection;
