"""
主浴組合圖批次合成
依據 floor.png / vanity.png mask + fixtures.png 設備保護
使用 image/原圖/主浴.jpg 為底圖（保留鏡子反射、瓶罐、盆栽等細節）
生成 9 張 t{1-3}-{1-3}.jpg 到 ../image/bath-renders/
"""
from PIL import Image, ImageChops
from pathlib import Path

# === 路徑 ===
ROOT = Path(__file__).resolve().parent.parent  # Sample/客變選樣/
IMG = ROOT / "image"
MASKS = IMG / "masks" / "主浴"
ORIG = IMG / "原圖"
TEX = IMG / "素材照"
OUT = IMG / "bath-renders"
OUT.mkdir(exist_ok=True)

# === 載入底圖（用乾淨的原圖，非 base.jpg）===
base = Image.open(ORIG / "主浴.jpg").convert("RGB")
W, H = base.size
print(f"Base: {W}x{H} (from 原圖/主浴.jpg)")

def load_mask(path: Path) -> Image.Image:
    m = Image.open(path).convert("L")
    if m.size != (W, H):
        m = m.resize((W, H), Image.LANCZOS)
    return m

floor_mask    = load_mask(MASKS / "floor.png")
vanity_mask   = load_mask(MASKS / "vanity.png")

# fixtures.png 由 Photopea 匯出，是「透明背景 + 黑色設備」
# 用 alpha 通道判斷：alpha=255 即設備，alpha=0 即安全區
def load_fixtures_safe(path: Path) -> Image.Image:
    img = Image.open(path)
    rgba = img.convert("RGBA")
    if rgba.size != (W, H):
        rgba = rgba.resize((W, H), Image.LANCZOS)
    alpha = rgba.split()[-1]               # 0=transparent, 255=opaque(=fixture)
    return ImageChops.invert(alpha)        # 0=fixture, 255=safe

fixtures_mask = load_fixtures_safe(MASKS / "fixtures.png")  # 白=允許, 黑=保護

# 不再使用 lighting.png 疊加，避免漂白細節（鏡子反射、瓶罐、盆栽）
HAS_LIGHTING = False

# === 與 fixtures 求交集（安全網） ===
# 注意：vanity.png 已經精準標到木櫃，且 fixtures.png 內把整個浴櫃都塗黑了
# 所以 vanity 直接用原始 mask，不再過濾 fixtures
# floor 與 fixtures 重疊極少（<10 像素），加交集當保險
def safe(mask: Image.Image) -> Image.Image:
    return ImageChops.multiply(mask, fixtures_mask)

floor_safe  = safe(floor_mask)
vanity_safe = vanity_mask    # 直接用原 mask，避免被 fixtures 整個吃掉

# === 材質 ===
def load_tex(rel: str) -> Image.Image:
    img = Image.open(TEX / rel).convert("RGB")
    # 縮放/平鋪到底圖大小（保持比例填滿）
    return img.resize((W, H), Image.LANCZOS)

def solid(rgb: tuple) -> Image.Image:
    return Image.new("RGB", (W, H), rgb)

FLOORS = [
    ("米白石英 EG-1001", load_tex("石英磚/EG-1001.jpg")),
    ("灰雲大理石 EG-1002", load_tex("石英磚/EG-1002.jpg")),
    ("深咖啡石 EG-1009", load_tex("石英磚/EG-1009.jpg")),
]
DOORS = [
    ("胡桃木",   load_tex("木材/wood02.jpg")),
    ("星際橡木", load_tex("木材/wood03.jpg")),
    ("淺尤加利", solid((196, 184, 150))),  # #c4b896 暫用純色
]

# === 合成核心：multiply blend，保留底圖光影 ===
def apply_texture(canvas: Image.Image, tex: Image.Image, mask: Image.Image) -> Image.Image:
    """在 mask 範圍內，把 tex 以 multiply 混合到 canvas"""
    multiplied = ImageChops.multiply(canvas, tex)
    return Image.composite(multiplied, canvas, mask)

# === 跑 9 張 ===
for fi, (fname, ftex) in enumerate(FLOORS, start=1):
    for di, (dname, dtex) in enumerate(DOORS, start=1):
        result = base.copy()
        result = apply_texture(result, ftex, floor_safe)
        result = apply_texture(result, dtex, vanity_safe)

        # 套光影（screen blend，僅在 lighting alpha > 0 處）
        if HAS_LIGHTING:
            light_rgb = lighting.convert("RGB")
            light_alpha = lighting.split()[-1]
            screened = ImageChops.screen(result, light_rgb)
            result = Image.composite(screened, result, light_alpha)

        out_path = OUT / f"t{fi}-{di}.jpg"
        result.save(out_path, "JPEG", quality=88, optimize=True)
        print(f"  [OK] t{fi}-{di}.jpg  ({fname} x {dname})")

print(f"\nDone -> {OUT}")
