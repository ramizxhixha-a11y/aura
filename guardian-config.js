/* ============================================================
   GUARDIAN CONFIG · décrit LE système observé.
   Pour adapter Guardian à un autre projet : modifier CE fichier
   uniquement. Le coeur (guardian-core.js) ne change pas.
   ============================================================ */
window.GUARDIAN_CONFIG = {

  /* --- Identité du projet --- */
  project: 'AURA8',
  appUrl: 'AURA8_v118.html',

  /* --- Storage --- */
  storage: {
    saveKey: 'nexus_state_v2',
    dbName: 'NEXUS_DB',
    dbVersion: 3,
    store: 'state',
    extraStores: ['fees', 'trades'],
    // clés candidates pour la récupération
    candidateKeys: [
      'nexus_state_v2','nexus_state','nexusSnap_A','nexusSnap_B','nexusSnap_C',
      'nexusSnap_latest','nexusSnap_current','nexusInternal_1','nexusInternal_2',
      'aura_autobackup_daily_0','aura_autobackup_daily_1','aura_autobackup_daily_2',
      'aura_last_auto_backup_date','aura_backup_manual'
    ],
    // bases IDB d'AUTRES projets à IGNORER dans les scans
    ignoreDatabases: ['journal-travaux-db'],
    obsoleteKeys: ['nexusInternal_1','nexusSnap_A'],
    idbDebugKey: 'aura_idb_debug'
  },

  /* --- Comment accéder à l'état vivant S (quand intégré dans l'app) --- */
  liveState: {
    // plusieurs stratégies tentées dans l'ordre
    getters: [
      function(){ try { return (0,eval)('S'); } catch(e){ return null; } },
      function(){ return window.S || null; },
      function(){ try { return window._auraGetGlobalS ? window._auraGetGlobalS() : null; } catch(e){ return null; } }
    ]
  },

  /* --- Couples UI ↔ état à comparer (le coeur de la détection d'incohérence) ---
     dom: id de l'élément ; read: comment lire l'état "vrai" depuis S ;
     uiActive: comment lire ce que l'UI prétend ; label + fichier de correction --- */
  coherenceChecks: [
    {
      id: 'fullpower',
      label: 'Plein Régime',
      stateRead: s => s ? !!s.fullPowerMode : null,
      uiRead: () => {
        const b = document.getElementById('fpBtn');
        if(!b) return null;
        return b.classList.contains('active') || b.classList.contains('on') || b.getAttribute('data-active')==='true';
      },
      file: '04-v8-0-livraison-35-mode-max-permissif-v.js',
      fix: "Si l'UI dit actif mais S.fullPowerMode=false : enableFullPowerMode ne pose pas le flag (ou le bouton ne lit pas S). Synchroniser le bouton sur S.fullPowerMode au render."
    },
    {
      id: 'automanu',
      label: 'Mode AUTO/MANU',
      stateRead: s => s ? (s.botAutoMode ? 'AUTO' : 'MANU') : null,
      uiRead: () => {
        const t = document.getElementById('modeLabelText');
        return t ? t.textContent.trim().toUpperCase() : null;
      },
      file: '02-state-init.js',
      fix: "Le libellé du bouton AUTO/MANU doit refléter S.botAutoMode. Vérifier toggleMode() et le render du header."
    },
    {
      id: 'trademode',
      label: 'En mode (AA/EV/RE)',
      stateRead: s => { if(!s) return null; return {sim:'AA',paperReal:'EV',real:'RE'}[s.tradingMode] || s.tradingMode; },
      uiRead: () => { const b = document.getElementById('tradeModeBtn'); return b ? b.textContent.trim().toUpperCase() : null; },
      file: '01-chrono-network.js',
      fix: "Le bouton de mode doit refléter S.tradingMode. Vérifier updateButtonVisual() et cycleTradeMode()."
    },
    {
      id: 'positions',
      label: 'Positions ouvertes',
      stateRead: s => s && Array.isArray(s.openPositions) ? s.openPositions.length : null,
      uiRead: () => { const b = document.getElementById('closeAllBadge'); if(!b) return null; const n = parseInt(b.textContent); return isNaN(n)?0:n; },
      file: '02-state-init.js',
      fix: "Le compteur du bouton ⊗ doit égaler S.openPositions.length. Vérifier _updateCloseAllBadge()."
    },
    {
      id: 'portfolio',
      label: 'Portfolio affiché',
      stateRead: s => {
        if(!s) return null;
        // #heroVal affiche S.portfolioTotal (EUR converti), PAS S.portfolio (USD interne)
        const v = (typeof s.portfolioTotal==='number') ? s.portfolioTotal : null;
        return v==null ? null : Math.round(v);
      },
      uiRead: () => {
        const e = document.getElementById('heroVal'); if(!e) return null;
        // prendre le PREMIER nombre décimal de l'affichage (évite de coller les chiffres)
        const m = String(e.textContent).replace(/\s/g,'').match(/-?\d+(?:[.,]\d+)?/);
        if(!m) return null;
        const n = parseFloat(m[0].replace(',','.'));
        return isNaN(n)?null:Math.round(n);
      },
      file: '07-v90-mode-bunker-sos.js',
      tolerance: 2,
      fix: "Le portfolio affiché (#heroVal = S.portfolioTotal en EUR) doit suivre l'état. Vérifier renderHomePrices() / computePortfolioTotal()."
    }
  ],

  /* --- Valeurs aberrantes à surveiller dans S --- */
  sanityChecks: [
    { id:'pf0', label:'Portfolio à 0 alors que comptes pleins',
      test: s => s && s.portfolio===0 && ((s.cashAccount||0)+(s.tradingAccount||0))>0,
      msg: 'portfolio=0 mais cash+trading>0 → recalcul cassé',
      file:'02-state-init.js' },
    { id:'cashNeg', label:'Cash négatif',
      test: s => s && typeof s.cashAccount==='number' && s.cashAccount<0,
      msg: 'cashAccount négatif', file:'02-state-init.js' },
    { id:'nan', label:'Valeur NaN',
      test: s => s && [s.portfolio,s.cashAccount,s.tradingAccount].some(v=>typeof v==='number'&&isNaN(v)),
      msg: 'une valeur monétaire est NaN', file:'02-state-init.js' },
    { id:'startPf', label:'_startPortfolio aberrant (flash boot)',
      test: s => s && typeof s.portfolio==='number' && typeof s._startPortfolio==='number' && Math.abs(s.portfolio-s._startPortfolio)>15,
      msg: 'écart portfolio/_startPortfolio > 15$ → flash gain/perte au démarrage',
      file:'07-v90-mode-bunker-sos.js' }
  ],

  /* --- Seuils --- */
  thresholds: {
    cycleDriftAlert: 20,      // écart LS/IDB
    storageWarnMo: 4.5,       // alerte quota localStorage
    saveStaleMin: 10          // sauvegarde figée (min) alors que cycle avance
  },

  /* --- Fonctions critiques (vérif définie + appelée dans le code chargé) --- */
  criticalFunctions: [
    'loadState','saveState','buildSnapshot','renderAll','renderHomePrices',
    'simTick','openPosition','closePosition','triggerEvolution',
    '_checkAndRotatePeriods','enableFullPowerMode','activateBunker','openDB'
  ],

  /* --- Variables globales connues (pour la détection de "non définie") --- */
  knownGlobals: ['S','PAIRS','RT','window','document','localStorage','indexedDB','Math','JSON','Date','console']
};
