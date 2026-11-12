// Entrée de construction du SDK Sentry réduit pour AURA8 (GO SENTRY · 12/11/2026).
// Seules ces pièces du SDK officiel @sentry/browser entrent dans js/00r-sentry-sdk.min.js :
// un client navigateur, l'envoi par fetch, le lecteur de piles Chrome/V8, et quatre intégrations
// (erreurs globales, erreurs liées, doublons, contexte HTTP). AUCUNE intégration par défaut :
// rien n'enveloppe setTimeout / rAF / fetch / console / addEventListener (00 les chronomètre déjà),
// pas de fil d'Ariane, pas de session, pas de traces, pas de replay.
export {
  BrowserClient, makeFetchTransport, defaultStackParser, getCurrentScope, withScope,
  captureException, captureMessage, globalHandlersIntegration, linkedErrorsIntegration,
  dedupeIntegration, httpContextIntegration, SDK_VERSION
} from '@sentry/browser';
