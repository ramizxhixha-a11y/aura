# [SOURCE · 03/10/2026] Construction des votes des 13 sources de rejeu/source_ana.py (« go source », Rams 03/10 02:06).
# Définitions figées avec les règles de rejeu/source_ana.py (lire son en-tête). Grille : bougies spot Binance 1 h ; décision à la clôture de
# la bougie i (ouverture TS[i] + 1 h). Rien du futur : chaque donnée n'est lue qu'à partir de l'instant où elle était publiée —
#   bougies 1 h (spot, futures, prime, Deribit, Coinbase) : à leur clôture ; métriques 5 min : ligne datée T lue à T + 10 min (photo à
#   T + 5 min, publiée 2 à 3 min plus tard : mesuré en direct par la relecture indépendante du 03/10) ; DefiLlama, S&P 500, VIX : point du jour J lu à J + 1 00:00 UTC.
# Contrôle anti-fuite intégré (--controle) : votes recalculés avec toutes les données coupées à un instant τ (seules celles publiées avant
# τ) ; les votes des décisions ≤ τ doivent être IDENTIQUES à ceux du calcul complet.
# usage : python3 rejeu/source_prep.py <dossier données (source_get.sh)> <dossier sortie> [--controle]
import sys, os, glob, zipfile, io, csv, json, datetime
import numpy as np, pandas as pd, warnings
warnings.filterwarnings('ignore', category=RuntimeWarning)

SRC_DIR, OUT = sys.argv[1], sys.argv[2]
CONTROLE = '--controle' in sys.argv
os.makedirs(OUT, exist_ok=True)
PAIRS = ['BTC', 'ETH', 'XRP', 'SOL', 'DOGE', 'DOT', 'ADA', 'AVAX', 'LINK', 'BNB', 'PEPE']
FSYM = {p: ('1000PEPE' if p == 'PEPE' else p) + 'USDT' for p in PAIRS}
SOURCES = ['basis7', 'oi7', 'smart', 'takerfut', 'futspot', 'dvol', 'cbprem', 'stables', 'spx5', 'vix', 'tsmom28', 'tsmom7', 'xsmom28']
HOUR, DAYMS = 3600000, 86400000
T0 = 1714521600000                                   # 01/05/2024 00:00 UTC
T1 = 1790985600000                                   # 03/10/2026 00:00 UTC (dernière ouverture : 02/10 23:00)
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

raw = load_raw()
close, V, RAW = build(raw)
np.save(os.path.join(OUT, 'ts.npy'), TS); np.save(os.path.join(OUT, 'close.npy'), close)
np.save(os.path.join(OUT, 'votes.npy'), V.astype(np.float32)); np.save(os.path.join(OUT, 'raw.npy'), RAW.astype(np.float32))
json.dump(dict(pairs=[p + '/USDT' for p in PAIRS], sources=SOURCES, grille='1 h', t0=int(TS[0]), n=int(N), token='20261002a'),
          open(os.path.join(OUT, 'meta.json'), 'w'))
D0 = 1727740800000; sel = (TD >= D0) & (TD < 1790812800000)
print('couverture des votes (part des décisions 10/2024 → 09/2026 où la source parle, |vote| ≥ 0,03) :')
print('  ' + ' · '.join(f"{s} {(np.abs(V[sel][:, :, k]) >= 0.03).mean() * 100:.0f} %" for k, s in enumerate(SOURCES)))
print(f"  clôtures spot manquantes : {np.isnan(close[sel]).mean() * 100:.2f} %")
if CONTROLE:
    for tau in (1736899200000, 1759276800000, 1780272000000):     # 15/01/2025 · 01/10/2025 · 01/06/2026 00:00 UTC
        _, Vc, _ = build(cut_raw(raw, tau))
        k = TD <= tau
        diff = np.abs(Vc[k] - V[k]).max()
        bad = [SOURCES[s] for s in range(len(SOURCES)) if np.abs(Vc[k][:, :, s] - V[k][:, :, s]).max() > 1e-9]
        print(f"  contrôle anti-fuite τ = {datetime.datetime.utcfromtimestamp(tau / 1000):%d/%m/%Y} : écart max {diff:.2e} → "
              + ('IDENTIQUE' if not bad else 'FUITE : ' + ', '.join(bad)))
