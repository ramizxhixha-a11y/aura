#!/usr/bin/env python3
# Génère banc-fixtures/fiscal-scenarios.json pour le registre fiscal (spec : rejeu/fiscal_spec.md).
# a) scénarios écrits à la main, une règle chacun ; b) scénarios aléatoires à graine fixe.
# Usage : python3 -I rejeu/fiscal_scenarios_gen.py [sortie.json]
import json
import os
import random
import sys
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "banc-fixtures", "fiscal-scenarios.json")


def ts(iso):
    """ISO avec décalage explicite -> ms epoch."""
    return int(round(datetime.fromisoformat(iso).timestamp() * 1000))


def pos(side="long", auto=False, stake=1000.0, lev_b=0.0, expo=None, fx_in=None, pair="BTC/USDT", entry=60000.0):
    p = {"pair": pair, "side": side, "auto": auto, "stakeUsdt": stake, "levBorrowed": lev_b,
         "totalExposure": stake + lev_b if expo is None else expo, "entryPrice": entry}
    if fx_in is not None:
        p["_fxIn"] = fx_in
    return p


def close(t, fx, pnl, p, fee=0.0, slip=0.0):
    return {"type": "close", "t": ts(t), "fx": fx, "pnlUsd": pnl, "tradingFee": fee, "slipFee": slip, "pos": p}


def adjust(t, fx):
    return {"type": "adjust", "t": ts(t), "fx": fx}


def cfg(t, fx, commune=None, ext=None):
    e = {"type": "cfg", "t": ts(t), "fx": fx}
    if commune is not None:
        e["commune"] = commune
    if ext is not None:
        e["ext"] = ext
    return e


def sc(name, mode, events, trading=1000.0, fiscal=0.0, commune=0, ext=None):
    return {"name": name, "mode": mode, "start": {"trading": trading, "fiscal": fiscal},
            "cfg": {"commune": commune, "ext": ext if ext is not None else {"2026": 0}}, "events": events}


def hand():
    S = []
    # 1
    S.append(sc("MANU LONG : un gain sous l'exonération, 0 € dû (réajustement/réglage/payé avant le 1er trade : rien)", "real", [
        adjust("2026-02-01T10:00:00+01:00", 0.9),
        cfg("2026-02-02T10:00:00+01:00", 0.9, commune=7),
        {"type": "pay", "t": ts("2026-02-03T10:00:00+01:00"), "year": 2026},
        close("2026-03-10T12:00:00+01:00", 0.9, 100.0, pos(stake=1000, fx_in=0.9), fee=1.0, slip=0.5),
    ]))
    # 2
    big = lambda fx_in: pos(stake=20000, fx_in=fx_in)
    S.append(sc("Gains normaux qui franchissent 10 000 € (10 % au-delà)", "sim", [
        close("2026-03-01T12:00:00+01:00", 0.9, 6000.0, big(0.9), fee=20, slip=0),
        close("2026-04-01T12:00:00+02:00", 0.9, 6000.0, big(0.9), fee=20, slip=0),
        close("2026-05-01T12:00:00+02:00", 0.85, 6000.0, big(0.9), fee=20, slip=0),
    ], trading=50000))
    # 3
    S.append(sc("Perte normale après des gains : provision rendue au trading", "sim", [
        close("2026-03-01T12:00:00+01:00", 0.9, 6000.0, big(0.9)),
        close("2026-04-01T12:00:00+02:00", 0.9, 7333.3333, big(0.9)),
        close("2026-05-01T12:00:00+02:00", 0.9, -1666.6667, big(0.9)),
    ], trading=50000))
    # 4
    S.append(sc("AUTO : gain spéculatif à 33 %", "sim", [
        close("2026-03-01T12:00:00+01:00", 0.9, 100.0, pos(auto=True, stake=1000, fx_in=0.88), fee=2.0, slip=1.0),
    ]))
    # 5
    S.append(sc("Spéculatif : gain puis perte, provision libérée", "sim", [
        close("2026-03-01T12:00:00+01:00", 0.9, 100.0, pos(auto=True, stake=1000, fx_in=0.9), fee=1.0, slip=0.0),
        close("2026-03-05T12:00:00+01:00", 0.9, -150.0, pos(auto=True, stake=1000, fx_in=0.9), fee=1.0, slip=0.0),
    ]))
    # 6
    S.append(sc("Frais déduits seulement en spéculatif", "sim", [
        close("2026-03-01T12:00:00+01:00", 0.9, 12000.0, pos(stake=30000, fx_in=0.9), fee=50.0, slip=0.0),
        close("2026-03-02T12:00:00+01:00", 0.9, 200.0, pos(auto=True, stake=2000, fx_in=0.9), fee=20.0, slip=0.0),
    ], trading=5000))
    # 7
    S.append(sc("SHORT manuel = spéculatif", "sim", [
        close("2026-03-01T12:00:00+01:00", 0.9, 50.0, pos(side="short", stake=1000, fx_in=0.92), fee=1.0, slip=0.5),
    ]))
    # 8
    S.append(sc("LONG manuel avec levBorrowed > 0 = spéculatif", "sim", [
        close("2026-03-01T12:00:00+01:00", 0.9, 80.0, pos(stake=500, lev_b=500, fx_in=0.9), fee=1.0, slip=0.0),
    ]))
    # 9
    S.append(sc("Additionnels communaux 7,5 % via un événement cfg", "sim", [
        close("2026-03-01T12:00:00+01:00", 0.9, 100.0, pos(auto=True, stake=1000, fx_in=0.9), fee=0.0, slip=0.0),
        cfg("2026-03-02T12:00:00+01:00", 0.9, commune=7.5),
    ]))
    # 10 / 11 : mêmes événements, real vs paperReal
    ev_ext = lambda: [
        close("2026-03-01T12:00:00+01:00", 0.9, 1000.0, pos(stake=10000, fx_in=0.9)),
        cfg("2026-03-02T12:00:00+01:00", 0.9, ext={"2026": 9000}),
        cfg("2026-03-03T12:00:00+01:00", 0.9, ext={"2026": 12000}),
        close("2026-03-04T12:00:00+01:00", 0.9, -2000.0, pos(stake=10000, fx_in=0.9)),
    ]
    S.append(sc("Gains hors AURA (ext) en mode real : pris en compte", "real", ev_ext(), trading=5000))
    S.append(sc("Gains hors AURA (ext) en mode paperReal : sans effet", "paperReal", ev_ext(), trading=5000))
    # 12
    S.append(sc("Passage 2026 -> 2028 avec 2027 vide : complément accumulé et perte spéculative reportée", "sim", [
        close("2026-06-01T12:00:00+02:00", 0.9, 7000 / 0.9, pos(stake=20000, fx_in=0.9)),
        close("2026-06-02T12:00:00+02:00", 0.9, -2000 / 0.9, pos(auto=True, stake=10000, fx_in=0.9), fee=10 / 0.9),
        close("2028-02-01T12:00:00+01:00", 0.8, 12500 / 0.8, pos(stake=40000, fx_in=0.8)),
        close("2028-02-02T12:00:00+01:00", 0.8, 2500 / 0.8, pos(auto=True, stake=10000, fx_in=0.8)),
        close("2029-01-15T12:00:00+01:00", 0.8, 1000 / 0.8, pos(auto=True, stake=10000, fx_in=0.8)),
    ], trading=20000))
    # 13
    S.append(sc("Horizon 2026 -> 2033 : complément plafonné à 5 000 € et perte spéculative expirée après 5 ans", "sim", [
        close("2026-06-01T12:00:00+02:00", 0.9, -1000 / 0.9, pos(auto=True, stake=10000, fx_in=0.9)),
        close("2031-06-01T12:00:00+02:00", 0.9, 300 / 0.9, pos(auto=True, stake=10000, fx_in=0.9)),
        close("2032-03-01T12:00:00+01:00", 0.9, 400 / 0.9, pos(auto=True, stake=10000, fx_in=0.9)),
        close("2032-03-02T12:00:00+01:00", 0.9, 16000 / 0.9, pos(stake=50000, fx_in=0.9)),
        adjust("2033-01-10T12:00:00+01:00", 0.9),
    ], trading=20000))
    # 14
    S.append(sc("Manque quand le trading est à 0, récupéré par un réajustement après recharge", "sim", [
        {"type": "trading", "set": 0},
        close("2026-03-01T12:00:00+01:00", 0.9, 100.0, pos(auto=True, stake=1000, fx_in=0.9)),
        {"type": "trading", "set": 10.0},
        adjust("2026-03-02T12:00:00+01:00", 0.9),
        {"type": "trading", "set": 0},
        close("2026-11-01T12:00:00+01:00", 0.9, 100.0, pos(auto=True, stake=1000, fx_in=0.9)),
        adjust("2027-01-05T12:00:00+01:00", 0.9),
        {"type": "trading", "set": 500.0},
        adjust("2027-01-06T12:00:00+01:00", 0.9),
    ]))
    # 15
    S.append(sc("Dépôt remis à 0 (fiscal set 0) puis rapprochement", "sim", [
        close("2026-03-01T12:00:00+01:00", 0.9, 300.0, pos(auto=True, stake=3000, fx_in=0.9)),
        {"type": "fiscal", "set": 0},
        adjust("2026-03-02T12:00:00+01:00", 0.9),
        {"type": "fiscal", "set": 30.0},
        adjust("2026-03-03T12:00:00+01:00", 0.9),
    ]))
    # 16
    S.append(sc("Payé d'une année close (payé d'une année ouverte : sans effet)", "sim", [
        close("2026-05-01T12:00:00+02:00", 0.9, 100.0, pos(auto=True, stake=1000, fx_in=0.9)),
        {"type": "pay", "t": ts("2026-06-01T12:00:00+02:00"), "year": 2026},
        adjust("2027-02-01T12:00:00+01:00", 0.88),
        {"type": "pay", "t": ts("2027-03-01T12:00:00+01:00"), "year": 2026},
        close("2027-04-01T12:00:00+02:00", 0.88, 50.0, pos(auto=True, stake=1000, fx_in=0.9)),
        {"type": "pay", "t": ts("2027-04-02T12:00:00+02:00"), "year": 2027},
        {"type": "pay", "t": ts("2027-04-03T12:00:00+02:00"), "year": 2026},
    ]))
    # 17
    S.append(sc("Frontière d'année en heure de Bruxelles (31/12 23:30 et 01/01 00:30)", "sim", [
        close("2026-12-31T23:30:00+01:00", 0.9, 100.0, pos(auto=True, stake=1000, fx_in=0.9)),
        close("2027-01-01T00:30:00+01:00", 0.9, 100.0, pos(auto=True, stake=1000, fx_in=0.9)),
    ]))
    # 18
    S.append(sc("Pertes spéculatives de 2 années consommées des plus anciennes aux plus récentes", "sim", [
        close("2026-04-01T12:00:00+02:00", 0.9, -500 / 0.9, pos(auto=True, stake=5000, fx_in=0.9)),
        close("2027-04-01T12:00:00+02:00", 0.9, -800 / 0.9, pos(auto=True, stake=5000, fx_in=0.9)),
        close("2028-04-01T12:00:00+02:00", 0.9, 1000 / 0.9, pos(auto=True, stake=5000, fx_in=0.9)),
        adjust("2029-01-02T12:00:00+01:00", 0.9),
    ]))
    # 19
    S.append(sc("Dépôt remis à 0 après clôture : le rapprochement vide la provision d'une année close", "sim", [
        close("2026-05-01T12:00:00+02:00", 0.9, 100.0, pos(auto=True, stake=1000, fx_in=0.9)),
        adjust("2027-01-10T12:00:00+01:00", 0.9),
        {"type": "fiscal", "set": 0},
        adjust("2027-01-11T12:00:00+01:00", 0.9),
        close("2027-02-01T12:00:00+01:00", 0.9, 10.0, pos(auto=True, stake=1000, fx_in=0.9)),
    ]))
    return S


MODES = ["real", "paperReal", "sim"]
PAIRS = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "XRP/USDT", "BNB/USDT", "ADA/USDT"]


def random_scenarios(n=30, seed=20261007):
    R = random.Random(seed)
    out = []
    t_lo = ts("2026-01-01T00:00:00+01:00")
    t_hi = ts("2033-12-31T20:00:00+01:00")
    for i in range(n):
        mode = MODES[i % 3]
        n_ev = R.randint(20, 80)
        y0 = R.randint(2026, 2030)
        y1 = R.randint(y0, 2033)
        lo = max(t_lo, ts("%d-01-01T00:00:00+01:00" % y0))
        hi = min(t_hi, ts("%d-12-31T20:00:00+01:00" % y1))
        times = set()
        # instants piégés autour de minuit du 31/12 -> 01/01 (heure de Bruxelles)
        for y in range(y0, y1):
            if R.random() < 0.6:
                times.add(ts("%d-12-31T23:30:00+01:00" % y))
                times.add(ts("%d-01-01T00:30:00+01:00" % (y + 1)))
        if i == 0 or i == 1:
            times.add(ts("2026-12-31T23:30:00+01:00"))
            times.add(ts("2027-01-01T00:30:00+01:00"))
        while len(times) < n_ev:
            times.add(R.randint(lo, hi))
        times = sorted(times)
        big = R.random() < 0.5  # gros comptes : franchissent l'exonération
        ext = {str(y): round(R.uniform(-5000, 15000), 2) for y in range(y0, y1 + 1) if R.random() < 0.4}
        events = []
        if R.random() < 0.25:  # événements avant le premier trade : sans effet sur le registre
            events.append({"type": "adjust", "t": times[0] - 3600000, "fx": round(R.uniform(0.80, 0.98), 4)})
        cur_years = []
        for t in times:
            fx = round(R.uniform(0.80, 0.98), 4)
            y = datetime.fromtimestamp(t / 1000, timezone.utc).year  # approximatif (UTC), sert seulement à choisir l'année à payer
            cur_years.append(y)
            u = R.random()
            if u < 0.74 or not events:
                auto = R.random() < 0.45
                side = "long" if R.random() < 0.7 else "short"
                stake = round(R.uniform(2000, 30000) if big else R.uniform(50, 3000), 2)
                lev = 1 if R.random() < 0.55 else R.choice([2, 3, 5, 10])
                lev_b = round(stake * (lev - 1), 2)
                expo = round(stake + lev_b, 2)
                pnl = round(expo * R.uniform(-0.30, 0.40), 2)
                fee = round(expo * R.uniform(0.0002, 0.0012), 4)
                slip = round(expo * R.uniform(0.0, 0.0006), 4)
                q = R.random()
                fx_in = None if q < 0.08 else (0 if q < 0.12 else round(R.uniform(0.80, 0.98), 4))
                p = {"pair": R.choice(PAIRS), "side": side, "auto": auto, "stakeUsdt": stake, "levBorrowed": lev_b,
                     "totalExposure": expo, "entryPrice": round(R.uniform(0.3, 90000), 4)}
                if fx_in is not None:
                    p["_fxIn"] = fx_in
                events.append({"type": "close", "t": t, "fx": fx, "pnlUsd": pnl, "tradingFee": fee,
                               "slipFee": slip, "pos": p})
            elif u < 0.83:
                events.append({"type": "adjust", "t": t, "fx": fx})
            elif u < 0.89:
                e = {"type": "cfg", "t": t, "fx": fx}
                if R.random() < 0.6:
                    e["commune"] = R.choice([0, 5, 6, 6.5, 7, 7.5, 8, 8.5, 9])
                if R.random() < 0.6:
                    yy = R.randint(y0, y1)
                    e["ext"] = {str(yy): round(R.uniform(-5000, 15000), 2)}
                events.append(e)
            elif u < 0.93:
                events.append({"type": "trading", "set": 0 if R.random() < 0.5 else round(R.uniform(0, 20000 if big else 2000), 2)})
            elif u < 0.96:
                events.append({"type": "fiscal", "set": 0 if R.random() < 0.5 else round(R.uniform(0, 3000 if big else 200), 2)})
            else:
                py = R.randint(2026, max(2026, y - 1)) if R.random() < 0.85 else y
                events.append({"type": "pay", "t": t, "year": py})
        start = {"trading": round(R.uniform(5000, 60000) if big else R.uniform(0, 3000), 2),
                 "fiscal": round(R.uniform(0, 500), 2) if R.random() < 0.3 else 0}
        out.append({"name": "aléatoire %02d (%s, %d-%d, %s)" % (i + 1, mode, y0, y1, "gros" if big else "petit"),
                    "mode": mode, "start": start,
                    "cfg": {"commune": R.choice([0, 0, 5, 7, 7.5, 8]), "ext": ext}, "events": events})
    return out


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else OUT
    data = hand() + random_scenarios()
    with open(path, "w", encoding="utf-8") as f:
        f.write("[\n")
        f.write(",\n".join(json.dumps(s, ensure_ascii=False, separators=(",", ":")) for s in data))
        f.write("\n]\n")
    sys.stderr.write("%d scénarios (%d événements) -> %s (%d octets)\n" % (
        len(data), sum(len(s["events"]) for s in data), path, os.path.getsize(path)))


if __name__ == "__main__":
    main()
