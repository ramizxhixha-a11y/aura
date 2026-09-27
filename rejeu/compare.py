# compare.py VARIANTE[,VARIANTE...] — bilan des rejeux par fenêtre et au total (frais compris), et par auteur (bot / cerveau)
import json, glob, os, sys, collections
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
for V in sys.argv[1].split(','):
    tot = collections.Counter(); auth = collections.defaultdict(lambda: collections.Counter())
    print('\n== ' + V)
    for fp in sorted(glob.glob(os.path.join(OUT, V + '_w*.json')), key=lambda f: int(f.rsplit('_w', 1)[1].split('.')[0])):
        d = json.load(open(fp)); s = d['setup']['start']; e = d['result']['end']; r = d['result']
        n = e['count'] - s['count']; g = e['pnlGross'] - s['pnlGross']; fe = (e['tradingFees'] - s['tradingFees']) + (e['slip'] - s['slip']); net = e['pnlNet'] - s['pnlNet']
        acc = s['trading'] or 1
        opens = {}
        for t in r['trades']:
            if t.get('type') == 'open': opens.setdefault(t['pair'], []).append(t)
        stake = 0.0
        for t in r['trades']:
            if t.get('type') != 'position': continue
            who = 'cerveau'
            for o in opens.get(t['pair'], []):
                if abs((o['ts']) - (t.get('entryTs') or 0)) < 3000: who = o.get('bot') or 'cerveau'; break
            a = auth[who]; a['n'] += 1; a['gross'] += t.get('pnlUsdt') or 0; a['stake'] += t.get('stakeUsdt') or 0
            stake += t.get('stakeUsdt') or 0
        opn = sum(q['stake'] * q['pct'] / 100 for q in r['open'])
        print('w%s %s %4.1f h | fermés %3d | brut %+6.2f | frais %5.2f | net %+6.2f $ (%+.2f %% du compte) | net/mise %+.3f %% | ouvertes %d (latent %+.2f)' % (fp.rsplit('_w', 1)[1].split('.')[0], d['cur'][19:32], d['hours'], n, g, fe, net, net / acc * 100, (net / stake * 100) if stake else 0, len(r['open']), opn))
        tot['n'] += n; tot['g'] += g; tot['fe'] += fe; tot['net'] += net; tot['h'] += d['hours']; tot['stake'] += stake; tot['pct'] += net / acc * 100
    print('TOTAL %.0f h | fermés %d | brut %+.2f | frais %.2f | net %+.2f $ | somme %% compte %+.2f %% | net/mise %+.3f %%' % (tot['h'], tot['n'], tot['g'], tot['fe'], tot['net'], tot['pct'], tot['net'] / tot['stake'] * 100 if tot['stake'] else 0))
    for w, a in sorted(auth.items(), key=lambda x: -x[1]['n']):
        print('   %-16s fermés %4d | brut %+7.2f $ | mise moyenne %.1f $' % (w, a['n'], a['gross'], a['stake'] / max(1, a['n'])))
