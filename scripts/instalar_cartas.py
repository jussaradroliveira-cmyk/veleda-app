#!/usr/bin/env python3
"""Recorta as margens das artes das cartas e instala em public/cards/<slug>.jpg."""
import os
import sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

MAPA = {
    'Card_BACK_DESIGN_for_the_202606291712.jpeg': 'verso',
    'Veleda_Tarô_card__I_—_202606300550.jpeg': 'o-mago',
    'Veleda_Tarô_card__II_—_202606300549.jpeg': 'a-sacerdotisa',
    'Veleda_Tarô_card__IV_—_202606300549.jpeg': 'o-imperador',
    'Veleda_Tarô_card__VIII_—_202606300549.jpeg': 'a-forca',
    'Veleda_Tarot_XI_A_JUSTIÇA_202606300548.jpeg': 'a-justica',
    'Veleda_Tarot_O_Enforcado_202606300548.jpeg': 'o-enforcado',
    'Veleda_Tarot_XIII_A_MORTE_202606300548.jpeg': 'a-morte',
    'Veleda_Tarô_card__XV_—_202606300547.jpeg': 'o-diabo',
    'Veleda_Tarot_XVIII_A_LUA_202606300548.jpeg': 'a-lua',
    'Veleda_Tarô_card__XIX_—_202606291726.jpeg': 'o-sol',
    'Veleda_Tarot_O_Julgamento_card_202606300548.jpeg': 'o-julgamento',
    'Veleda_Tarô_card__XXI_—_202606300548.jpeg': 'o-mundo',
}


def detetar_carta(im):
    """Devolve a bounding box da carta: maior zona contígua diferente da cor da margem.

    A cor da margem é estimada pela média dos 4 cantos; linhas/colunas cuja
    diferença média excede o limiar pertencem à carta.
    """
    small = im.convert('RGB')
    px = small.load()
    w, h = small.size

    def cor_media(x0, y0, x1, y1):
        r = g = b = n = 0
        for y in range(y0, y1):
            for x in range(x0, x1):
                p = px[x, y]
                r += p[0]; g += p[1]; b += p[2]; n += 1
        return (r / n, g / n, b / n)

    m = 8
    cantos = [
        cor_media(0, 0, m, m), cor_media(w - m, 0, w, m),
        cor_media(0, h - m, m, h), cor_media(w - m, h - m, w, h),
    ]
    fundo = tuple(sum(c[i] for c in cantos) / 4 for i in range(3))

    LIMIAR = 40  # diferença média por linha/coluna para contar como "carta"
    FRACAO = 0.35  # fração de píxeis da linha que têm de diferir

    def linha_e_carta(y):
        difs = 0
        for x in range(0, w, 4):
            p = px[x, y]
            if sum(abs(p[i] - fundo[i]) for i in range(3)) > LIMIAR:
                difs += 1
        return difs / (w / 4) > FRACAO

    def coluna_e_carta(x):
        difs = 0
        for y in range(0, h, 4):
            p = px[x, y]
            if sum(abs(p[i] - fundo[i]) for i in range(3)) > LIMIAR:
                difs += 1
        return difs / (h / 4) > FRACAO

    top = next((y for y in range(h) if linha_e_carta(y)), 0)
    bottom = next((y for y in range(h - 1, -1, -1) if linha_e_carta(y)), h - 1)
    left = next((x for x in range(w) if coluna_e_carta(x)), 0)
    right = next((x for x in range(w - 1, -1, -1) if coluna_e_carta(x)), w - 1)

    # margem de segurança de 2px para dentro (esconde o anti-alias da borda)
    return (left + 2, top + 2, right - 1, bottom - 1)


def main():
    destino = os.path.join(ROOT, 'public', 'cards')
    os.makedirs(destino, exist_ok=True)
    for nome, slug in MAPA.items():
        caminho = os.path.join(ROOT, nome)
        if not os.path.exists(caminho):
            print(f'⚠️  falta: {nome}')
            continue
        im = Image.open(caminho)
        box = detetar_carta(im)
        recorte = im.crop(box)
        alvo = os.path.join(destino, f'{slug}.jpg')
        recorte.convert('RGB').save(alvo, 'JPEG', quality=88)
        w0, h0 = im.size
        w1, h1 = recorte.size
        print(f'✅ {slug}.jpg  {w0}x{h0} → {w1}x{h1}  (corte {box})')


if __name__ == '__main__':
    sys.exit(main())
