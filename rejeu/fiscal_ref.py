#!/usr/bin/env python3
# Référence indépendante de rejeu/fiscal_spec.md (registre fiscal belge d'AURA, plus-values 2026+).
# Écrite à partir de la seule spécification, SANS lire js/16-fiscal.js ni aucun banc-*.js,
# pour qu'un bug du JavaScript ne puisse pas être recopié ici.
# Usage : python3 -I rejeu/fiscal_ref.py <scenarios.json> <out.json>
# Bibliothèque standard uniquement. Les montants restent des float Python (aucun arrondi en sortie).
#
# Choix pris là où la spec laisse une marge (voir aussi le rapport) :
#  - rapprochement : fait au début de close/adjust/cfg (avant l'étape 2), pas sur "fiscal set" ni sur "pay" ;
#    chaque montant retiré de P_y s'ajoute à M_y (spec §6 révisée), puis l'étape 2 le recomplète ;
#  - "pay" ne clôt pas d'année (il n'agit que sur une année déjà close et non payée) ;
#  - un "cfg" avant le registre enregistre quand même les réglages (seul le réajustement est sans effet) ;
#  - "ext" d'un cfg est fusionné année par année dans les réglages existants ;
#  - une perte spéculative entièrement consommée (reste <= 1e-9) disparaît de la liste reportée ;
#  - part normale d'AURA plancher 0 (spec §4 révisée) : Dû n'est jamais négatif ; l'« économie » n'est
#    qu'affichée et ne fait pas partie de la sortie ;
#  - fermeture en 4 étapes (spec §6 révisée) : l'étape 3 (réévaluation de l'année y au cours r, avant le
#    trade) s'applique aussi au tout premier trade (année vide : Dû = 0, sans effet) ; "moved" = étape 4.

import json
import sys
from datetime import datetime, timedelta, timezone

B = 10000.0          # exonération de base (montants 2026 reconduits)
COMP_STEP = 1000.0   # complément ajouté par année close
COMP_CAP = 5000.0    # complément utilisable la même année
RATE_N = 0.10
RATE_S = 0.33
LOSS_YEARS = 5
EPS = 1e-9

_EPOCH = datetime(1970, 1, 1, tzinfo=timezone.utc)
try:
    from zoneinfo import ZoneInfo
    _BXL = ZoneInfo("Europe/Brussels")
except Exception:  # tzdata absent : règle UE codée à la main plus bas
    _BXL = None


def _last_sunday_0100_utc(year, month):
    nxt = datetime(year + (month == 12), month % 12 + 1, 1, tzinfo=timezone.utc)
    d = nxt - timedelta(days=1)
    d -= timedelta(days=(d.weekday() - 6) % 7)
    return d.replace(hour=1, minute=0, second=0, microsecond=0)


def year_of(t_ms):
    """Année civile de l'instant t (ms) en heure de Bruxelles."""
    u = _EPOCH + timedelta(milliseconds=t_ms)
    if _BXL is not None:
        return u.astimezone(_BXL).year
    off = 2 if _last_sunday_0100_utc(u.year, 3) <= u < _last_sunday_0100_utc(u.year, 10) else 1
    return (u + timedelta(hours=off)).year


def num(v):
    try:
        return float(v) if v is not None else 0.0
    except (TypeError, ValueError):
        return 0.0


class Year:
    def __init__(self, y, comp_open, losses_open):
        self.y = y
        self.nG = 0.0   # plus-values normales (€)
        self.nL = 0.0   # moins-values normales (€, valeur absolue)
        self.sG = 0.0   # plus-values spéculatives
        self.sL = 0.0   # moins-values spéculatives
        self.sF = 0.0   # frais de courtage spéculatifs (€)
        self.prov = 0.0
        self.short = 0.0
        self.closed = False
        self.paid = False
        self.frozen = None
        self.comp_open = comp_open                        # report complémentaire au 1er janvier
        self.losses_open = [list(l) for l in losses_open]  # pertes spéculatives reçues à l'ouverture


class Ledger:
    def __init__(self, sc):
        self.mode = sc.get("mode", "sim")
        st = sc.get("start") or {}
        self.T = num(st.get("trading"))
        self.D = num(st.get("fiscal"))
        cfg = sc.get("cfg") or {}
        self.commune = num(cfg.get("commune"))
        self.ext = {str(k): num(v) for k, v in (cfg.get("ext") or {}).items()}
        self.years = {}
        self.cur = None       # année ouverte (None tant que le registre n'existe pas)
        self.comp = 0.0       # report complémentaire accumulé
        self.losses = []      # pertes spéculatives reportées [[année, €], ...], plus anciennes d'abord

    # ---------- §4 : impôt dû d'une année ----------
    def _G(self, y):
        return self.ext.get(str(y), 0.0) if self.mode == "real" else 0.0

    def normal_parts(self, Y):
        N = Y.nG - Y.nL
        G = self._G(Y.y)
        comp = min(COMP_CAP, Y.comp_open)
        E = B + comp
        taxable = max(0.0, max(0.0, N + G - E) - max(0.0, G - E))
        base_used = min(B, max(0.0, N + G))
        comp_used = min(comp, max(0.0, N + G - B))
        return taxable, base_used, comp_used

    def spec_parts(self, Y):
        S = Y.sG - Y.sL - Y.sF
        avail = sum(a for (yy, a) in Y.losses_open if Y.y - LOSS_YEARS <= yy <= Y.y - 1)
        used = min(avail, S) if S > 0 else 0.0
        taxable = max(0.0, S - used)
        return S, used, taxable

    def due(self, Y):
        tN = self.normal_parts(Y)[0]
        tS = self.spec_parts(Y)[2]
        return RATE_N * tN + RATE_S * (1 + self.commune / 100) * tS

    # ---------- §5 : ouverture / clôture ----------
    def open_year(self, y):
        Y = Year(y, self.comp, [l for l in self.losses if l[0] >= y - LOSS_YEARS])
        self.years[y] = Y
        self.cur = y
        return Y

    def close_year(self, Y):
        Y.frozen = self.due(Y)
        _, base_used, comp_used = self.normal_parts(Y)
        S, used, _ = self.spec_parts(Y)
        self.comp = max(0.0, Y.comp_open - comp_used) + min(COMP_STEP, max(0.0, B - base_used))
        rest = used
        kept = []
        for yy, a in self.losses:          # plus anciennes d'abord
            take = min(rest, a)
            rest -= take
            kept.append([yy, a - take])
        if S < 0:
            kept.append([Y.y, -S])
        self.losses = [[yy, a] for yy, a in kept if yy >= Y.y + 1 - LOSS_YEARS and a > EPS]
        Y.closed = True

    def roll(self, y):
        """Étape 1 : clore toutes les années < y (années vides comprises)."""
        if y < self.cur:
            raise ValueError("événement antérieur à l'année ouverte %d (t non croissant ?)" % self.cur)
        just = []
        while self.cur < y:
            self.close_year(self.years[self.cur])
            just.append(self.cur)
            self.open_year(self.cur + 1)
        return just

    # ---------- §6 : dépôt fiscal ----------
    def reconcile(self):
        unpaid = sorted(y for y, Y in self.years.items() if not Y.paid)
        excess = sum(self.years[y].prov for y in unpaid) - self.D
        if excess > 0:
            for y in reversed(unpaid):     # plus récente -> plus ancienne
                Y = self.years[y]
                cut = min(excess, Y.prov)
                Y.prov -= cut
                Y.short += cut
                excess -= cut
                if excess <= 0:
                    break

    def remise(self, Y, due, r):
        cible = due / r
        d = cible - Y.prov
        mv = 0.0
        if d > EPS:
            take = min(d, max(0.0, self.T))
            self.T -= take
            self.D += take
            Y.prov += take
            mv = take
        elif d < -EPS:
            give = min(-d, Y.prov, max(0.0, self.D))
            self.D -= give
            self.T += give
            Y.prov -= give
            mv = 0.0 - give
        Y.short = max(0.0, cible - Y.prov)
        return mv

    def step2(self, just, r):
        mv = 0.0
        for y in sorted(self.years):
            Y = self.years[y]
            if Y.closed and not Y.paid and (y in just or Y.short > EPS):
                mv += self.remise(Y, Y.frozen, r)
        return mv

    # ---------- §3 : gain légal ----------
    def add_trade(self, Y, e):
        p = e.get("pos") or {}
        stake = num(p.get("stakeUsdt"))
        exp_raw = num(p.get("totalExposure"))
        N = exp_raw if exp_raw else stake
        P = num(e.get("pnlUsd"))
        s = num(e.get("slipFee"))
        f = num(e.get("tradingFee"))
        r_out = num(e.get("fx"))
        fxin = num(p.get("_fxIn"))
        r_in = fxin if fxin > 0 else r_out
        g = P - s
        is_long = p.get("side") == "long"
        if is_long:
            gain = (N + g) * r_out - N * r_in
        else:
            gain = N * r_in - (N - g) * r_out
        normal = (p.get("auto") is not True) and is_long and num(p.get("levBorrowed")) <= 0 and N <= stake
        if normal:
            if gain >= 0:
                Y.nG += gain
            else:
                Y.nL += -gain
        else:
            if gain >= 0:
                Y.sG += gain
            else:
                Y.sL += -gain
            Y.sF += f * r_out

    # ---------- événements ----------
    def ev_close(self, e):
        y = year_of(e["t"])
        r = num(e["fx"])
        if self.cur is None:
            self.open_year(y)          # création du registre : report 0, aucune perte
        self.reconcile()
        just = self.roll(y)
        self.step2(just, r)            # non compté dans "moved" pour un close
        Y = self.years[self.cur]
        self.remise(Y, self.due(Y), r)  # étape 3 : réévaluation au cours r, avant le trade (non imputée)
        self.add_trade(Y, e)           # étape 4 : le trade
        return self.remise(Y, self.due(Y), r)

    def ev_adjust(self, e):
        if self.cur is None:
            return 0.0
        y = year_of(e["t"])
        r = num(e["fx"])
        self.reconcile()
        just = self.roll(y)
        mv = self.step2(just, r)
        Y = self.years[self.cur]
        return mv + self.remise(Y, self.due(Y), r)

    def ev_cfg(self, e):
        if "commune" in e and e["commune"] is not None:
            self.commune = num(e["commune"])
        if isinstance(e.get("ext"), dict):
            for k, v in e["ext"].items():
                self.ext[str(k)] = num(v)
        return self.ev_adjust(e)

    def ev_pay(self, e):
        if self.cur is None:
            return 0.0
        Y = self.years.get(int(e["year"]))
        if Y is not None and Y.closed and not Y.paid:
            out = min(Y.prov, max(0.0, self.D))
            self.D -= out
            Y.prov = 0.0
            Y.short = 0.0
            Y.paid = True
        return 0.0

    def apply(self, e):
        t = e.get("type")
        if t == "close":
            return self.ev_close(e)
        if t == "adjust":
            return self.ev_adjust(e)
        if t == "cfg":
            return self.ev_cfg(e)
        if t == "trading":
            self.T = num(e.get("set"))
            return 0.0
        if t == "fiscal":
            self.D = num(e.get("set"))
            return 0.0
        if t == "pay":
            return self.ev_pay(e)
        raise ValueError("type d'événement inconnu : %r" % t)

    def snapshot(self, moved):
        years = {}
        for y in sorted(self.years):
            Y = self.years[y]
            years[str(y)] = {
                "prov": Y.prov,
                "due": Y.frozen if Y.closed else self.due(Y),
                "short": Y.short,
                "closed": Y.closed,
                "paid": Y.paid,
            }
        return {
            "moved": moved,
            "trading": self.T,
            "fiscal": self.D,
            "years": years,
            "carry": {"comp": self.comp, "specLoss": [[yy, a] for yy, a in self.losses]},
        }


def run_scenario(sc):
    L = Ledger(sc)
    steps = []
    for e in sc.get("events") or []:
        mv = L.apply(e)
        steps.append(L.snapshot(mv))
    return {"name": sc.get("name"), "steps": steps}


def main(argv):
    if len(argv) != 3:
        sys.stderr.write("usage : python3 -I rejeu/fiscal_ref.py <scenarios.json> <out.json>\n")
        return 2
    with open(argv[1], encoding="utf-8") as f:
        scenarios = json.load(f)
    out = [run_scenario(sc) for sc in scenarios]
    with open(argv[2], "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")
    sys.stderr.write("%d scénarios, %d événements -> %s\n" % (len(out), sum(len(o["steps"]) for o in out), argv[2]))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
