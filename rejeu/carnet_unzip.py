# [CARNET · 04/10/2026] Décompression rapide d'une archive Binance (zip d'un seul fichier) vers la sortie standard — remplace `unzip -p`
# pour les ~91 Go de trades de rejeu/carnet_get.sh (inflate ISA-L, ~3 × plus rapide que zlib ; repli zlib si le module isal manque).
# Mêmes octets que unzip par construction (deflate sans perte) ; le CRC-32 du zip est vérifié à la fin : un écart arrête tout (code 1).
# usage : python3 rejeu/carnet_unzip.py fichier.zip | …
import sys, zipfile
try:
    from isal import isal_zlib as Z
except ImportError:
    import zlib as Z
zf = zipfile.ZipFile(sys.argv[1]); info = zf.infolist()
if len(info) != 1 or info[0].compress_type != zipfile.ZIP_DEFLATED: sys.exit(f'archive inattendue : {sys.argv[1]}')
info = info[0]
f = open(sys.argv[1], 'rb'); f.seek(info.header_offset)
h = f.read(30)
if h[:4] != b'PK\x03\x04': sys.exit('en-tête local absent')
f.seek(info.header_offset + 30 + int.from_bytes(h[26:28], 'little') + int.from_bytes(h[28:30], 'little'))
d = Z.decompressobj(-15); crc = 0; n = 0; left = info.compress_size; out = sys.stdout.buffer
while left > 0:
    chunk = f.read(min(left, 8 << 20)); left -= len(chunk)
    if not chunk: sys.exit('archive tronquée')
    b = d.decompress(chunk)
    if b: crc = Z.crc32(b, crc); n += len(b); out.write(b)
b = d.flush()
if b: crc = Z.crc32(b, crc); n += len(b); out.write(b)
out.flush()
if crc != info.CRC or n != info.file_size: sys.exit(f'CRC ou taille fausse : {sys.argv[1]}')
