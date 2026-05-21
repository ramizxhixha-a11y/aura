// ════════════════════════════════════════════════════════════════════════
// ▓▓▓ AURA8 — 09h-exports.js ▓▓▓
// ════════════════════════════════════════════════════════════════════════
// Exports — exportFeesCSV, exportSummaryCSV, exportFullJSON.
//
// Dépend de 09a-runtime-state.js (accès via window.RT).
// ════════════════════════════════════════════════════════════════════════


// ════════════════════════════════════════════════════════════════════════
// SECTION Exports
// Quatre exports vers fichiers téléchargeables :
//  - exportFeesCSV       : log des frais par trade (CSV)
//  - exportTradesCSV     : tous les trades clôturés + frais (CSV, async)
//  - exportSummaryCSV    : résumé fiscal par paire (CSV)
//  - exportFullJSON      : backup fiscal complet (JSON)
//
// Note : exportFullJSON est un export à finalité FISCALE, distinct de
// exportState() (section persistance) qui produit le snapshot complet.
// ════════════════════════════════════════════════════════════════════════


// ──────────────────────────────────────────────────────────────────────
// Export des frais en CSV
// ──────────────────────────────────────────────────────────────────────
function exportFeesCSV() {
  downloadFile(
    buildFeeLogCSV(),
    `nexus_fees_${new Date().toISOString().slice(0, 10)}.csv`,
    'text/csv'
  );
  showToast('📥 Frais exportés', 2800, 'user');
}
window.exportFeesCSV = exportFeesCSV;


// ──────────────────────────────────────────────────────────────────────
// Export complet des trades : combine ce qui est en IndexedDB
// (loadAllTrades) avec le feeLog en mémoire
// ──────────────────────────────────────────────────────────────────────
async function exportTradesCSV() {
  const trades = await loadAllTrades();
  const all    = [...trades, ...S.fees.feeLog.map(e => ({ ...e }))];
  downloadFile(
    buildTradeCSV(all),
    `nexus_trades_${new Date().toISOString().slice(0, 10)}.csv`,
    'text/csv'
  );
  showToast('📥 Trades exportés — ' + all.length + ' lignes', 2800, 'user');
}
window.exportTradesCSV = exportTradesCSV;


// ──────────────────────────────────────────────────────────────────────
// Export du résumé fiscal en CSV
// ──────────────────────────────────────────────────────────────────────
function exportSummaryCSV() {
  downloadFile(
    buildSummaryCSV(),
    `nexus_resume_fiscal_${new Date().toISOString().slice(0, 10)}.csv`,
    'text/csv'
  );
  showToast('📥 Résumé fiscal exporté', 2800, 'user');
}
window.exportSummaryCSV = exportSummaryCSV;


// ──────────────────────────────────────────────────────────────────────
// Export backup JSON à finalité fiscale
// Contient : frais, config frais, config taxe, trades, portefeuille.
// Distinct de exportState() qui produit le snapshot complet de l'app.
// ──────────────────────────────────────────────────────────────────────
function exportFullJSON() {
  const data = {
    exportDate:  new Date().toISOString(),
    region:      S.taxConfig.region,
    regionLabel: S.taxConfig.regions[S.taxConfig.region]?.label,
    fees:        S.fees,
    feeConfig:   S.feeConfig,
    taxConfig:   S.taxConfig,
    trades:      S.fees.feeLog,
    portfolio: {
      total:   S.portfolio,
      cash:    S.cashAccount,
      trading: S.tradingAccount,
      cycle:   S.cycle
    }
  };

  downloadFile(
    JSON.stringify(data, null, 2),
    `nexus_backup_${new Date().toISOString().slice(0, 10)}.json`,
    'application/json'
  );
  showToast('📥 Backup JSON exporté');
}
window.exportFullJSON = exportFullJSON;
