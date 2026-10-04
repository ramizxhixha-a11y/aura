# [SOURCE · 03/10/2026] Construction des votes des 13 sources de rejeu/source_ana.py (« go source », Rams 03/10 02:06).
# Définitions figées avec les règles de rejeu/source_ana.py (lire son en-tête). Grille : bougies spot Binance 1 h ; décision à la clôture de
# la bougie i (ouverture TS[i] + 1 h). Rien du futur : chaque donnée n'est lue qu'à partir de l'instant où elle était publiée —
#   bougies 1 h (spot, futures, prime, Deribit, Coinbase) : à leur clôture ; métriques 5 min : ligne datée T lue à T + 10 min (photo à
#   T + 5 min, publiée 2 à 3 min plus tard : mesuré en direct par la relecture indépendante du 03/10) ; DefiLlama, S&P 500, VIX : point du jour J lu à J + 1 00:00 UTC.
# Contrôle anti-fuite intégré (--controle) : votes recalculés avec toutes les données coupées à un instant τ (seules celles publiées avant
# τ) ; les votes des décisions ≤ τ doivent être IDENTIQUES à ceux du calcul complet.
# usage : python3 rejeu/source_prep.py <dossier données (source_get.sh)> <dossier sortie> [--controle] [--replique]
# [RÉPLIQUE · 04/10/2026] --replique : grille 05/2021 → 10/2024 (données de « source_get.sh … replique ») ; définitions inchangées.
# [FLUX · 04/10/2026 — RÈGLES FIGÉES AVANT TOUTE DONNÉE] « go flux » (Rams 04/10 22:04) : les deux dernières grosses sources publiques gratuites
#   à la porte SOURCE, rejeu/source_ana.py INCHANGÉ (mêmes décisions 01/10/2024 → 30/09/2026, 11 cryptos, 24 h / 3 j / 7 j, frais 0,26 %, deux
#   sens, deux lectures, mêmes 2 000 placebos et même graine → même seuil z appris, risque 5 %/39 : plus sévère que les 4 × 3 essais d'ici,
#   on ne l'assouplit pas ; test 3 = combinaison des 4). Option --flux : SEULES ces 4 sources, toutes COMMUNES aux 11 paires, en « niveau »
#   (zniv : z-score 2 160 bougies 1 h, vote = clip(z/2, −1, 1)), donnée trop vieille (> 4 jours) → vote 0 :
#    F1 etfbtc5  somme des flux nets (M$) des ETF bitcoin comptant américains (colonne Total de Farside, « all data ») sur les 5 dernières séances
#                publiées ; ligne de la séance US du jour J lue à J+1 14:00 UTC (10:00 New York, avant l'ouverture : tous les émetteurs ont publié)
#    F2 etfeth5  idem ETF ether comptant américains (Farside, depuis le 23/07/2024), même lecture
#    F3 exbtc7   flux net BTC vers les plateformes = FlowInExNtv − FlowOutExNtv (Coin Metrics, API community, en BTC), somme des 7 derniers jours
#                (7 jours consécutifs présents, sinon muet) ; point du jour J (daté J 00:00 UTC) lu à J+1 06:00 UTC (statut « flash » publié
#                vers 02:45 UTC J+1, mesuré le 04/10)
#    F4 exeth7   idem ETH
#   Données : Farside bloque le bac à sable (Cloudflare) → page lue par un service de lecture de pages, table copiée telle quelle dans
#   rejeu/flux_etf_btc.csv et rejeu/flux_etf_eth.csv, recoupée sur ≥ 10 séances avec une 2e publication indépendante ; Coin Metrics : script.
#   Biais connus AVANT les données, tous en faveur des sources : (a) Coin Metrics a recalculé tout son historique d'adresses de plateformes
#   (04/2026) : le passé est « trop bien connu » ; (b) Farside corrige parfois une séance après coup ; aucune des deux n'a d'historique
#   « tel que publié ». Un échec est donc net ; un succès reste suspect.
#   Suite pré-enregistrée : F3/F4 qui entre → réplique sur 10/2021 → 09/2024, sens / seuil figés (règles de replique_ana.py), puis
#   enregistrement en direct des valeurs « flash » avant toute décision ; F1/F2 qui entre → aucune période antérieure (ETF lancés le
#   11/01/2024 et le 23/07/2024) : 6 mois d'enregistrement en direct puis la même porte avant toute décision. Aucune n'entre → fin de la
#   recherche « signal » sur données publiques (proposition du 04/10 acceptée par « go flux »).
# [FLUX · RELECTURE INDÉPENDANTE (agent séparé, 04/10, après le 1er passage — verdict du 1er passage : aucune source n'entre ; règles intactes)]
#   (a) règle de validité ajoutée APRÈS le 1er passage : Farside a des lignes « jour férié » (tous les fonds « - », Total 0,0 : 16 BTC, 10 ETH,
#       jusqu'au 19/06/2025, aucune ensuite) — ce ne sont pas des séances → retirées (2e passage ; les deux passages sont rapportés) ;
#   (b) « 10:00 New York, avant l'ouverture » est inexact : 14:00 UTC = 10:00 l'été (après l'ouverture de 09:30), 09:00 l'hiver ; le calcul
#       est en UTC, rien ne change ; « tous les émetteurs ont publié » est faux certains jours : Farside corrige après J+1 14:00 (vu sur des
#       photos archivées : 15/11/2024 BTC −239,6 → −370,0 M$, 02/10/2024 −64,4 → −91,7, ETH 22/08/2025 337,7 → 341,2) = biais (b) ci-dessus,
#       en faveur des sources ; Coin Metrics : 77 % des décisions BTC et 100 % des ETH lisent une valeur réécrite après coup = biais (a).
import sys, os, glob, zipfile, io, csv, json, datetime
import numpy as np, pandas as pd, warnings
warnings.filterwarnings('ignore', category=RuntimeWarning)

SRC_DIR, OUT = sys.argv[1], sys.argv[2]
CONTROLE = '--controle' in sys.argv
REPLIQUE = '--replique' in sys.argv
FLUX = '--flux' in sys.argv
os.makedirs(OUT, exist_ok=True)
PAIRS = ['BTC', 'ETH', 'XRP', 'SOL', 'DOGE', 'DOT', 'ADA', 'AVAX', 'LINK', 'BNB', 'PEPE']
FSYM = {p: ('1000PEPE' if p == 'PEPE' else p) + 'USDT' for p in PAIRS}
SOURCES = ['basis7', 'oi7', 'smart', 'takerfut', 'futspot', 'dvol', 'cbprem', 'stables', 'spx5', 'vix', 'tsmom28', 'tsmom7', 'xsmom28']
if FLUX: SOURCES = ['etfbtc5', 'etfeth5', 'exbtc7', 'exeth7']
HOUR, DAYMS = 3600000, 86400000
T0 = 1714521600000                                   # 01/05/2024 00:00 UTC
T1 = 1790985600000                                   # 03/10/2026 00:00 UTC (dernière ouverture : 02/10 23:00)
if REPLIQUE: T0, T1 = 1619827200000, 1730419200000  # 01/05/2021 → 01/11/2024 00:00 UTC (période de réplique, rejeu/source_fige.json)
TS = np.arange(T0, T1, HOUR, dtype=np.int64); N = len(TS); TD = TS + HOUR   # TD = instant de décision (clôture)
W90, STALE_H, STALE_D = 2160, 6, 4

def ms(v):
    v = int(float(v)); return v // 1000 if v > 10**14 else v   # archives spot depuis 01/2025 : microsecondes

def zrows(path):
    with zipfile.ZipFile(path) as z:
        for name in z.namelist():
            for r in csv.reader(io.TextIOWrapper(z.open(name), 'utf-8')):
                if r and r[0][:1].isdigit(): yield r     # saute l'en-tête éventuel

def klines(folder, sym):
    """bougies 1 h → {ouverture: (clôture, volume en USDT)} (mensuelles + quotidiennes)."""
    d = {}
    for f in sorted(glob.glob(os.path.join(SRC_DIR, folder, f'{sym}-1h-*.zip'))):
        for r in zrows(f): d[ms(r[0])] = (float(r[4]), float(r[7]))
    return d

def on_grid(d, k):
    a = np.full(N, np.nan); idx = (np.array(list(d.keys()), dtype=np.int64) - T0) // HOUR
    vals = np.array([v[k] if isinstance(v, tuple) else v for v in d.values()], dtype=np.float64)
    ok = (idx >= 0) & (idx < N); a[idx[ok]] = vals[ok]; return a

def ffill(a, lim):
    s = pd.Series(a); return s.ffill(limit=lim).to_numpy() if lim else s.ffill().to_numpy()

def zniv(x):
    """« niveau » : z-score sur les 2 160 dernières bougies 1 h (l'instant compris), vote = clip(z/2, −1, 1)."""
    s = pd.Series(x); m = s.rolling(W90, min_periods=W90 // 2).mean(); sd = s.rolling(W90, min_periods=W90 // 2).std(ddof=0)
    z = ((s - m) / sd.where(sd > 0)).to_numpy(); return np.clip(z / 2, -1, 1)

def rend(logc, w_h, w_d):
    """« rendement » : r_w / (σ × √w), σ = écart-type des rendements 24 h (pris toutes les heures) des 90 jours précédents."""
    s = pd.Series(logc); r = s - s.shift(w_h); d24 = s - s.shift(24)
    sd = d24.rolling(W90, min_periods=W90 // 2).std(ddof=0)
    return np.clip((r / (sd.where(sd > 0) * np.sqrt(w_d))).to_numpy() / 2, -1, 1)

def load_raw():
    raw = {'spot': {}, 'fut': {}, 'prem': {}, 'met': {}}
    for p in PAIRS:
        raw['spot'][p] = klines('spot', p + 'USDT'); raw['fut'][p] = klines('fut', FSYM[p]); raw['prem'][p] = klines('prem', FSYM[p])
        rows = []
        for f in sorted(glob.glob(os.path.join(SRC_DIR, 'metrics', f'{FSYM[p]}-metrics-*.zip'))):
            for r in zrows(f):
                ct = int(datetime.datetime.strptime(r[0], '%Y-%m-%d %H:%M:%S').replace(tzinfo=datetime.timezone.utc).timestamp() * 1000)
                def fl(x):
                    try: return float(x)
                    except ValueError: return np.nan
                rows.append((ct, fl(r[2]), fl(r[5]), fl(r[6]), fl(r[7])))
        raw['met'][p] = np.array(sorted(set(rows)), dtype=np.float64) if rows else np.zeros((0, 5))
    e = os.path.join(SRC_DIR, 'ext')
    raw['dvol'] = {int(k): float(v) for k, v in json.load(open(os.path.join(e, 'dvol_btc.json')))}
    raw['cb_btc'] = {int(k): float(v) for k, v in json.load(open(os.path.join(e, 'cb_BTC-USD.json')))}
    raw['cb_usdt'] = {int(k): float(v) for k, v in json.load(open(os.path.join(e, 'cb_USDT-USD.json')))}
    raw['stables'] = [(int(a), float(b)) for a, b in json.load(open(os.path.join(e, 'stables.json')))]
    for nm, fn in (('spx', 'sp500.csv'), ('vix', 'vix.csv')):
        pts = []
        for r in csv.reader(open(os.path.join(e, fn))):
            if r and r[0][:1].isdigit() and r[1] not in ('', '.'):
                d = int(datetime.datetime.strptime(r[0], '%Y-%m-%d').replace(tzinfo=datetime.timezone.utc).timestamp() * 1000)
                pts.append((d, float(r[1])))
        raw[nm] = pts
    return raw

def cut_raw(raw, tau):
    """ne garde que ce qui était publié à l'instant tau (mêmes règles de publication que le calcul)."""
    k = lambda d: {t: v for t, v in d.items() if t + HOUR <= tau}
    c = {'spot': {p: k(raw['spot'][p]) for p in PAIRS}, 'fut': {p: k(raw['fut'][p]) for p in PAIRS},
         'prem': {p: k(raw['prem'][p]) for p in PAIRS}, 'met': {p: raw['met'][p][raw['met'][p][:, 0] + 600000 <= tau] for p in PAIRS},
         'dvol': k(raw['dvol']), 'cb_btc': k(raw['cb_btc']), 'cb_usdt': k(raw['cb_usdt'])}
    for nm in ('stables', 'spx', 'vix'): c[nm] = [(d, v) for d, v in raw[nm] if d + DAYMS <= tau]
    return c

def daily_on_grid(pts):
    """point du jour J (daté J 00:00 UTC) lu à J+1 00:00 → valeur et date du dernier point publié, à chaque décision ; trop vieux → NaN."""
    pts = sorted(pts); dts = np.array([d for d, _ in pts], dtype=np.int64); vals = np.array([v for _, v in pts])
    j = np.searchsorted(dts + DAYMS, TD, side='right') - 1          # dernier J avec J + 1 jour ≤ décision
    ok = j >= 0; jj = np.where(ok, j, 0)
    age_ok = ok & (TD - (dts[jj] + DAYMS) <= STALE_D * DAYMS)
    return jj, age_ok, dts, vals

def build(raw):
    P = len(PAIRS); V = np.zeros((N, P, len(SOURCES)), dtype=np.float64); RAW = np.full((N, P, len(SOURCES)), np.nan)
    close = np.stack([on_grid(raw['spot'][p], 0) for p in PAIRS], 1)
    cf = np.stack([ffill(close[:, j], STALE_H) for j in range(P)], 1); lc = np.log(cf)
    for j, p in enumerate(PAIRS):
        # 1 basis7 : moyenne des 168 dernières primes closes
        pr = ffill(on_grid(raw['prem'][p], 0), STALE_H)
        x = pd.Series(pr).rolling(168, min_periods=160).mean().to_numpy(); RAW[:, j, 0] = x; V[:, j, 0] = zniv(x)
        # métriques 5 min : ligne datée T lue à T + 10 min → décision ceil((T + 10 min) / 1 h)
        m = raw['met'][p]
        if len(m):
            dec = -(-(m[:, 0].astype(np.int64) + 600000) // HOUR) * HOUR; i = (dec - TD[0]) // HOUR
            okk = (i >= 0) & (i < N); m, i = m[okk], i[okk]
            oi = np.full(N, np.nan); good = np.isfinite(m[:, 1]) & (m[:, 1] > 0)
            order = np.argsort(m[:, 0]); last = {}
            for ii, v, g in zip(i[order], m[order, 1], good[order]):
                if g: last[ii] = v                                       # dernière ligne publiée de l'heure
            oi[list(last.keys())] = list(last.values()); oi = ffill(oi, STALE_H)
            x = np.log(oi) - np.log(pd.Series(oi).shift(168).to_numpy()); RAW[:, j, 1] = x; V[:, j, 1] = zniv(x)     # 2 oi7
            for col, k, fn in ((2, 2, lambda a: np.log(a[:, 2]) - np.log(a[:, 3])), (4, 3, lambda a: np.log(a[:, 4]))):
                with np.errstate(divide='ignore', invalid='ignore'): val = fn(m)
                g = np.isfinite(val); sm = np.bincount(i[g], weights=val[g], minlength=N); ct = np.bincount(i[g], minlength=N)
                S = pd.Series(sm).rolling(72, min_periods=1).sum().to_numpy(); Cn = pd.Series(ct).rolling(72, min_periods=1).sum().to_numpy()
                x = np.where(Cn >= 600, S / np.maximum(Cn, 1), np.nan)    # ≥ 600 lignes sur 864 en 72 h
                RAW[:, j, k] = x; V[:, j, k] = zniv(x)                    # 3 smart · 4 takerfut
        # 5 futspot : log(Σ volume futures / Σ volume spot) sur 168 bougies
        fv = pd.Series(on_grid(raw['fut'][p], 1)); sv = pd.Series(on_grid(raw['spot'][p], 1))
        x = np.log(fv.rolling(168, min_periods=160).sum() / sv.rolling(168, min_periods=160).sum()).to_numpy(); RAW[:, j, 4] = x; V[:, j, 4] = zniv(x)
        # 11 tsmom28 · 12 tsmom7
        V[:, j, 10] = rend(lc[:, j], 672, 28); RAW[:, j, 10] = lc[:, j] - pd.Series(lc[:, j]).shift(672).to_numpy()
        V[:, j, 11] = rend(lc[:, j], 168, 7); RAW[:, j, 11] = lc[:, j] - pd.Series(lc[:, j]).shift(168).to_numpy()
    # 13 xsmom28
    r28 = RAW[:, :, 10]; cnt = np.isfinite(r28).sum(1)
    mu = np.nanmean(np.where(cnt[:, None] >= 8, r28, np.nan), 1); sd = np.nanstd(np.where(cnt[:, None] >= 8, r28, np.nan), 1)
    x = (r28 - mu[:, None]) / np.where(sd > 0, sd, np.nan)[:, None]; RAW[:, :, 12] = x; V[:, :, 12] = np.clip(x / 2, -1, 1)
    # 6 dvol : DVOL BTC − volatilité réalisée BTC 30 j (720 rendements 1 h, annualisée, en %)
    dv = ffill(on_grid(raw['dvol'], 0), STALE_H); rb = pd.Series(lc[:, 0]).diff()
    rv = (rb.rolling(720, min_periods=700).std(ddof=0) * np.sqrt(24 * 365) * 100).to_numpy()
    x = dv - rv; z = zniv(x); RAW[:, :, 5] = x[:, None]; V[:, :, 5] = z[:, None]
    # 7 cbprem : BTC-USD Coinbase / (BTCUSDT Binance × USDT-USD Coinbase) − 1, moyenne 24 h
    cb = on_grid(raw['cb_btc'], 0); cu = on_grid(raw['cb_usdt'], 0)
    pr = cb / (close[:, 0] * cu) - 1
    x = pd.Series(pr).rolling(24, min_periods=20).mean().to_numpy(); z = zniv(x); RAW[:, :, 6] = x[:, None]; V[:, :, 6] = z[:, None]
    # 8 stables : log-variation sur 7 jours du dernier point publié
    jj, ok, dts, vals = daily_on_grid(raw['stables'])
    by = dict(zip(dts.tolist(), vals.tolist()))
    prev = np.array([by.get(int(dts[k] - 7 * DAYMS), np.nan) for k in jj])
    x = np.where(ok, np.log(vals[jj]) - np.log(prev), np.nan); z = zniv(x); RAW[:, :, 7] = x[:, None]; V[:, :, 7] = z[:, None]
    # 9 spx5 : rendement sur 5 séances / (σ des séances des 90 jours précédents × √5) ; 10 vix : log(VIX) en niveau
    jj, ok, dts, vals = daily_on_grid(raw['spx'])
    lv = np.log(vals); r1 = np.concatenate([[np.nan], np.diff(lv)])
    sig = np.array([np.nanstd(r1[(dts > dts[k] - 90 * DAYMS) & (dts <= dts[k])]) if k > 0 else np.nan for k in range(len(dts))])
    r5 = np.array([lv[k] - lv[k - 5] if k >= 5 else np.nan for k in range(len(dts))])
    x = np.where(ok, r5[jj] / (sig[jj] * np.sqrt(5)), np.nan); RAW[:, :, 8] = x[:, None]; V[:, :, 8] = np.clip(x / 2, -1, 1)[:, None]
    jj, ok, dts, vals = daily_on_grid(raw['vix'])
    x = np.where(ok, np.log(vals[jj]), np.nan); z = zniv(x); RAW[:, :, 9] = x[:, None]; V[:, :, 9] = z[:, None]
    return close, np.nan_to_num(V), RAW

# [FLUX · 04/10/2026] les 4 sources de « go flux » (règles figées en tête de ce fichier, lignes 10-30) — rien de ce qui précède n'est changé.
ETF_PUB, CM_PUB = DAYMS + 14 * HOUR, DAYMS + 6 * HOUR     # séance US du jour J lue à J+1 14:00 UTC · jour J de Coin Metrics lu à J+1 06:00 UTC

def load_raw_flux():
    e = os.path.join(SRC_DIR, 'ext'); raw = {'spot': {p: klines('spot', p + 'USDT') for p in PAIRS}}
    def num(x):
        x = x.replace(',', '')
        if x in ('-', ''): return None
        neg = x.startswith('(') and x.endswith(')'); x = x.strip('()'); return -float(x) if neg else float(x)
    for a in ('btc', 'eth'):
        pts = []
        for r in csv.DictReader(open(os.path.join(e, f'flux_etf_{a}.csv'))):
            v = num(r['Total'])
            if all(r[k] == '-' for k in r if k not in ('date', 'Total')): continue   # ligne « jour férié » (relecture (a))
            if v is not None:
                pts.append((int(datetime.datetime.strptime(r['date'], '%Y-%m-%d').replace(tzinfo=datetime.timezone.utc).timestamp() * 1000), v))
        raw['etf_' + a] = sorted(pts)
    cm = json.load(open(os.path.join(e, 'coinmetrics_flux.json')))
    for a in ('btc', 'eth'):
        raw['ex_' + a] = sorted((int(datetime.datetime.strptime(x['time'][:10], '%Y-%m-%d').replace(tzinfo=datetime.timezone.utc).timestamp() * 1000),
                                 float(x['FlowInExNtv']) - float(x['FlowOutExNtv'])) for x in cm if x['asset'] == a
                                and x.get('FlowInExNtv') is not None and x.get('FlowOutExNtv') is not None)
    return raw

def cut_raw_flux(raw, tau):
    c = {'spot': {p: {t: v for t, v in raw['spot'][p].items() if t + HOUR <= tau} for p in PAIRS}}
    for a in ('btc', 'eth'):
        c['etf_' + a] = [(d, v) for d, v in raw['etf_' + a] if d + ETF_PUB <= tau]
        c['ex_' + a] = [(d, v) for d, v in raw['ex_' + a] if d + CM_PUB <= tau]
    return c

def pub_on_grid(x_dates, x_vals, pub):
    """valeur x[k] (datée x_dates[k]) visible à partir de x_dates[k] + pub ; à chaque décision, la dernière visible ; > 4 jours → NaN."""
    out = np.full(N, np.nan)
    if len(x_dates) == 0: return out
    pt = np.asarray(x_dates, dtype=np.int64) + pub
    j = np.searchsorted(pt, TD, side='right') - 1; ok = j >= 0; jj = np.where(ok, j, 0)
    ok &= TD - pt[jj] <= STALE_D * DAYMS
    xv = np.asarray(x_vals, dtype=np.float64)
    out[ok] = xv[jj[ok]]; return out

def build_flux(raw):
    P = len(PAIRS); V = np.zeros((N, P, len(SOURCES)), dtype=np.float64); RAW = np.full((N, P, len(SOURCES)), np.nan)
    close = np.stack([on_grid(raw['spot'][p], 0) for p in PAIRS], 1)
    for k, a in enumerate(('btc', 'eth')):
        # F1 etfbtc5 · F2 etfeth5 : somme des 5 dernières séances publiées
        d = [t for t, _ in raw['etf_' + a]]; v = np.array([x for _, x in raw['etf_' + a]], dtype=np.float64)
        s5 = np.array([v[i - 4:i + 1].sum() if i >= 4 else np.nan for i in range(len(v))])
        x = pub_on_grid(d, s5, ETF_PUB); z = zniv(x); RAW[:, :, k] = x[:, None]; V[:, :, k] = z[:, None]
        # F3 exbtc7 · F4 exeth7 : flux net vers les plateformes, somme de 7 jours consécutifs
        d = np.array([t for t, _ in raw['ex_' + a]], dtype=np.int64); v = np.array([x for _, x in raw['ex_' + a]], dtype=np.float64)
        s7 = np.array([v[i - 6:i + 1].sum() if i >= 6 and d[i] - d[i - 6] == 6 * DAYMS else np.nan for i in range(len(v))])
        x = pub_on_grid(d, s7, CM_PUB); z = zniv(x); RAW[:, :, 2 + k] = x[:, None]; V[:, :, 2 + k] = z[:, None]
    return close, np.nan_to_num(V), RAW

if FLUX: load_raw, cut_raw, build = load_raw_flux, cut_raw_flux, build_flux
raw = load_raw()
close, V, RAW = build(raw)
np.save(os.path.join(OUT, 'ts.npy'), TS); np.save(os.path.join(OUT, 'close.npy'), close)
np.save(os.path.join(OUT, 'votes.npy'), V.astype(np.float32)); np.save(os.path.join(OUT, 'raw.npy'), RAW.astype(np.float32))
json.dump(dict(pairs=[p + '/USDT' for p in PAIRS], sources=SOURCES, grille='1 h', t0=int(TS[0]), n=int(N), token='20261004a' if FLUX else '20261002a',
               periode='replique' if REPLIQUE else 'flux' if FLUX else 'decouverte'),
          open(os.path.join(OUT, 'meta.json'), 'w'))
D0, D1 = (1633046400000, 1727740800000) if REPLIQUE else (1727740800000, 1790812800000); sel = (TD >= D0) & (TD < D1)
print(f"couverture des votes (part des décisions {'10/2021 → 09/2024' if REPLIQUE else '10/2024 → 09/2026'} où la source parle, |vote| ≥ 0,03) :")
print('  ' + ' · '.join(f"{s} {(np.abs(V[sel][:, :, k]) >= 0.03).mean() * 100:.0f} %" for k, s in enumerate(SOURCES)))
print(f"  clôtures spot manquantes : {np.isnan(close[sel]).mean() * 100:.2f} %")
if CONTROLE:
    for tau in ((1642204800000, 1672531200000, 1709251200000) if REPLIQUE else   # 15/01/2022 · 01/01/2023 · 01/03/2024
                (1736899200000, 1759276800000, 1780272000000)):     # 15/01/2025 · 01/10/2025 · 01/06/2026 00:00 UTC
        _, Vc, _ = build(cut_raw(raw, tau))
        k = TD <= tau
        diff = np.abs(Vc[k] - V[k]).max()
        bad = [SOURCES[s] for s in range(len(SOURCES)) if np.abs(Vc[k][:, :, s] - V[k][:, :, s]).max() > 1e-9]
        print(f"  contrôle anti-fuite τ = {datetime.datetime.utcfromtimestamp(tau / 1000):%d/%m/%Y} : écart max {diff:.2e} → "
              + ('IDENTIQUE' if not bad else 'FUITE : ' + ', '.join(bad)))
