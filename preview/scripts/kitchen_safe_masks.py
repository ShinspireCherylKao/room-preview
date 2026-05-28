"""
為廚房所有 zone mask 套上 fixtures.png 設備保護
產出 {zone}_safe.png = zone_mask AND NOT fixtures
支援兩種格式：
  - L 模式 PNG（白=zone、黑=bg）
  - P/RGBA 模式 PNG（透明=bg、不透明=zone，用 alpha 做 mask）
"""
from PIL import Image, ImageChops
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MASKS = ROOT / "image" / "masks" / "廚房"

def load_zone_mask(path: Path) -> Image.Image:
    """讀取 zone mask 並回傳 L mode 白=zone"""
    img = Image.open(path)
    if img.mode in ("RGBA", "P", "PA", "LA"):
        rgba = img.convert("RGBA")
        return rgba.split()[-1]   # alpha as luminance mask (alpha=255 → white)
    return img.convert("L")

# fixtures.png → 取 alpha → invert → 得 safe (白=非設備)
fix_rgba = Image.open(MASKS / "fixtures.png").convert("RGBA")
W, H = fix_rgba.size
fix_alpha = fix_rgba.split()[-1]
safe = ImageChops.invert(fix_alpha)
print(f"fixtures: {W}x{H}")

# subtract_fixtures: zone 與 fixtures 互斥（其它 zone 染色時要避開 fixtures）
# direct: zone 本身就是要染色的目標（cab=冰箱本身就在 fixtures 內，不能扣）
zones_subtract = ["countertop", "upper_cabinet", "lower_cabinet", "wall"]
zones_direct   = ["cab"]

def write_safe(zone: str, mask: Image.Image):
    out = MASKS / f"{zone}_safe.png"
    mask.save(out)
    px = list(mask.getdata())
    white = sum(1 for v in px if v > 200)
    print(f"  [OK] {zone}_safe.png  white={white}")

for zone in zones_subtract:
    src = MASKS / f"{zone}.png"
    if not src.exists():
        print(f"  [SKIP] {zone}.png 不存在")
        continue
    zone_mask = load_zone_mask(src)
    if zone_mask.size != (W, H):
        zone_mask = zone_mask.resize((W, H), Image.LANCZOS)
    combined = ImageChops.multiply(zone_mask, safe)
    write_safe(zone, combined)

for zone in zones_direct:
    src = MASKS / f"{zone}.png"
    if not src.exists():
        print(f"  [SKIP] {zone}.png 不存在")
        continue
    zone_mask = load_zone_mask(src)
    if zone_mask.size != (W, H):
        zone_mask = zone_mask.resize((W, H), Image.LANCZOS)
    write_safe(zone, zone_mask)

print("Done.")
