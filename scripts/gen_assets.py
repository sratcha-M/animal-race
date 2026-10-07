#!/usr/bin/env python3
"""
สร้างภาพสัตว์น่ารัก + ฉากหลังด้วย AI ฟรี แล้วใส่เข้าเกมอัตโนมัติ

วิธีใช้ (รันบนเครื่องตัวเอง ที่ต่อเน็ตได้):
    pip install pillow rembg requests
    export POLLINATIONS_KEY=sk_...           # คีย์ฟรีจาก https://enter.pollinations.ai/keys
    python3 scripts/gen_assets.py            # ใช้ Pollinations.ai
    python3 scripts/gen_assets.py --from-folder ~/Downloads/cats   # ใช้ภาพที่โหลดจากเว็บเอง
    python3 scripts/gen_assets.py --only cat,dog   # สร้างเฉพาะบางตัว
    python3 scripts/gen_assets.py --flip     # ถ้า AI วาดหันซ้าย ให้กลับด้านเป็นหันขวา

ถ้ามี Cloudflare account (ฟรี) จะใช้ FLUX schnell แทนได้:
    export CF_ACCOUNT_ID=...  CF_API_TOKEN=...

ผลลัพธ์: src/assets/ai/animals/<สัตว์>.webp และ src/assets/ai/bg.webp
เกมจะใช้ภาพ AI อัตโนมัติเมื่อมีไฟล์ (ถ้าไม่มีจะใช้ภาพวาดด้วยโค้ดแทน)
ตรวจเงื่อนไขการใช้งาน/ลิขสิทธิ์ของผู้ให้บริการก่อนนำไปใช้เชิงพาณิชย์
"""
import argparse, base64, io, os, sys, time, urllib.parse, datetime
import requests
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'src', 'assets', 'ai')
RAW = os.path.join(ROOT, 'assets_raw')

STYLE = ('cute kawaii chibi cartoon sticker, thick clean dark outline, flat pastel colors, '
         'soft shading, big sparkly eyes, rosy cheeks, adorable, high quality game asset')
ANIMAL = ('a cute baby {desc} running happily, side view facing right, full body, small pink collar, {style}, '
          'centered, plain solid white background, no shadow, no text, no watermark, no logo')
BG = ('cute pastel cartoon landscape banner for a kids racing game, soft blue sky with fluffy clouds, '
      'rolling green hills, tiny flowers, wide panoramic, no characters, no animals, no text, no watermark, {style}')

ANIMALS = {
    'cat':     'orange tabby kitten',
    'dog':     'puppy with floppy ears',
    'rabbit':  'white bunny with long ears',
    'pig':     'pink piglet',
    'frog':    'green frog',
    'bear':    'brown bear cub',
    'panda':   'panda cub',
    'fox':     'orange fox kit with fluffy tail',
    'chick':   'yellow baby chick',
    'penguin': 'baby penguin',
}
SEED = 777  # seed เดียวกันทุกตัว ให้สไตล์ใกล้กัน


def gen_pollinations(prompt, w, h, seed):
    # API ใหม่: https://gen.pollinations.ai  (ต้องมีคีย์จาก https://enter.pollinations.ai/keys)
    key = os.environ.get('POLLINATIONS_KEY')
    model = os.environ.get('POLLINATIONS_MODEL', 'flux')
    q = f'?width={w}&height={h}&seed={seed}&model={model}&nologo=true'
    if key:
        r = requests.get('https://gen.pollinations.ai/image/' + urllib.parse.quote(prompt) + q,
                         headers={'Authorization': f'Bearer {key}'}, timeout=180)
    else:  # endpoint เก่า (ไม่ใช้คีย์) อาจถูกปิดหรือจำกัดแล้ว
        r = requests.get('https://image.pollinations.ai/prompt/' + urllib.parse.quote(prompt) + q, timeout=180)
    if r.status_code in (401, 402, 403):
        raise SystemExit(f'Pollinations ตอบ {r.status_code}: ต้องใช้คีย์ หรือเครดิตฟรีหมด '
                         '-> สร้างคีย์ที่ https://enter.pollinations.ai/keys แล้ว export POLLINATIONS_KEY=...')
    r.raise_for_status()
    return r.content


def gen_cloudflare(prompt, w, h, seed):
    acc, tok = os.environ['CF_ACCOUNT_ID'], os.environ['CF_API_TOKEN']
    r = requests.post(
        f'https://api.cloudflare.com/client/v4/accounts/{acc}/ai/run/@cf/black-forest-labs/flux-1-schnell',
        headers={'Authorization': f'Bearer {tok}'}, json={'prompt': prompt, 'seed': seed}, timeout=180)
    r.raise_for_status()
    return base64.b64decode(r.json()['result']['image'])


def generate(prompt, w, h, seed):
    fn = gen_cloudflare if os.environ.get('CF_API_TOKEN') else gen_pollinations
    for attempt in range(5):
        try:
            return fn(prompt, w, h, seed)
        except Exception as e:  # 429 / 5xx / timeout -> รอแล้วลองใหม่
            wait = 5 * (attempt + 1)
            print(f'   ! {e} -> ลองใหม่ใน {wait}s')
            time.sleep(wait)
    raise SystemExit('สร้างภาพไม่สำเร็จ ลองใหม่ภายหลัง หรือเปลี่ยนผู้ให้บริการ')


def remove_bg(img, use_rembg=False):
    """ลบพื้นหลังสีอ่อนที่ต่อกับขอบภาพ (ปลอดภัยกับสัตว์สีขาวที่มีเส้นขอบ เช่น กระต่าย แพนด้า)"""
    if use_rembg:
        try:
            from rembg import remove
            return remove(img)
        except Exception as e:
            print('   rembg ใช้ไม่ได้ -> ใช้วิธี flood fill แทน', e)
    import numpy as np
    from scipy import ndimage
    rgba = np.array(img.convert('RGBA')).astype(np.int16)
    rgb = rgba[..., :3]
    light = (rgb.min(axis=2) > 225) & ((rgb.max(axis=2) - rgb.min(axis=2)) < 22)  # ขาว/เทาอ่อน
    labels, _ = ndimage.label(light)
    edge = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    bg = np.isin(labels, edge[edge > 0])
    bg = ndimage.binary_dilation(bg, iterations=1)  # กินขอบฟุ้งเล็กน้อย
    alpha = np.where(bg, 0, 255).astype(np.float32)
    alpha = ndimage.gaussian_filter(alpha, 0.8)      # ขอบนุ่ม
    out = rgba.astype(np.uint8)
    out[..., 3] = np.minimum(out[..., 3], alpha.clip(0, 255).astype(np.uint8))
    return Image.fromarray(out, 'RGBA')


def from_folder(folder, flip, use_rembg=False):
    os.makedirs(os.path.join(OUT, 'animals'), exist_ok=True)
    for f in sorted(os.listdir(folder)):
        name, ext = os.path.splitext(f)
        if ext.lower() not in ('.png', '.jpg', '.jpeg', '.webp'):
            continue
        img = Image.open(os.path.join(folder, f))
        if name == 'bg':
            img.convert('RGB').save(os.path.join(OUT, 'bg.webp'), 'WEBP', quality=80)
            print('-> ฉากหลัง bg.webp'); continue
        if name not in ANIMALS:
            print(f'   ข้าม {f} (ชื่อไฟล์ต้องเป็นชื่อสัตว์: {", ".join(ANIMALS)})'); continue
        img = remove_bg(img.convert('RGBA'), use_rembg)
        img = img.crop(img.getbbox())
        if flip:
            img = img.transpose(Image.FLIP_LEFT_RIGHT)
        img.thumbnail((360, 360), Image.LANCZOS)
        img.save(os.path.join(OUT, 'animals', f'{name}.webp'), 'WEBP', quality=82)
        print(f'-> {name}')
    print('เสร็จแล้ว! รัน npm run dev เพื่อดูภาพ AI ในเกม')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', help='สร้างเฉพาะบางตัว เช่น cat,dog (หรือ bg)')
    ap.add_argument('--flip', action='store_true', help='กลับด้านภาพให้หันขวา')
    ap.add_argument('--seed', type=int, default=SEED)
    ap.add_argument('--rembg', action='store_true', help='ใช้ rembg ลบพื้นหลัง (ค่าเริ่มต้นใช้ flood fill)')
    ap.add_argument('--from-folder', help='ใช้ภาพที่โหลดมาเอง: โฟลเดอร์ที่มีไฟล์ชื่อ cat.png, dog.png, ..., bg.png')
    a = ap.parse_args()
    if a.from_folder:
        return from_folder(a.from_folder, a.flip, a.rembg)
    only = set(a.only.split(',')) if a.only else None
    os.makedirs(os.path.join(OUT, 'animals'), exist_ok=True)
    os.makedirs(RAW, exist_ok=True)
    credits = []

    for cid, desc in ANIMALS.items():
        if only and cid not in only:
            continue
        prompt = ANIMAL.format(desc=desc, style=STYLE)
        print(f'-> {cid}')
        raw = generate(prompt, 768, 768, a.seed)
        open(os.path.join(RAW, f'animal_{cid}.png'), 'wb').write(raw)
        img = remove_bg(Image.open(io.BytesIO(raw)).convert('RGBA'), a.rembg)
        img = img.crop(img.getbbox())
        if a.flip:
            img = img.transpose(Image.FLIP_LEFT_RIGHT)
        img.thumbnail((360, 360), Image.LANCZOS)
        img.save(os.path.join(OUT, 'animals', f'{cid}.webp'), 'WEBP', quality=82)
        credits.append((f'animals/{cid}.webp', prompt))
        time.sleep(3)

    if not only or 'bg' in only:
        prompt = BG.format(style=STYLE)
        print('-> ฉากหลัง')
        raw = generate(prompt, 1536, 384, a.seed)
        img = Image.open(io.BytesIO(raw)).convert('RGB')
        img.save(os.path.join(OUT, 'bg.webp'), 'WEBP', quality=80)
        credits.append(('bg.webp', prompt))

    provider = 'Cloudflare Workers AI (flux-1-schnell)' if os.environ.get('CF_API_TOKEN') else 'Pollinations.ai (flux)'
    with open(os.path.join(OUT, 'CREDITS.md'), 'a', encoding='utf-8') as f:
        for name, prompt in credits:
            f.write(f'- {name} | {provider} | seed {a.seed} | {datetime.date.today()} | {prompt}\n')
    print('เสร็จแล้ว! รัน npm run dev เพื่อดูภาพ AI ในเกม')


if __name__ == '__main__':
    main()
