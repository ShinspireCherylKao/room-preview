"""偵錯：印出每個 mask 的像素統計，並把 safe mask 存出來看"""
from PIL import Image, ImageChops
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MASKS = ROOT / "image" / "masks" / "主浴"
OUT = ROOT / "image" / "bath-renders"

def stats(name, img):
    if img.mode != "L":
        img = img.convert("L")
    px = list(img.getdata())
    n = len(px)
    n_white = sum(1 for v in px if v > 200)
    n_black = sum(1 for v in px if v < 50)
    n_mid = n - n_white - n_black
    print(f"{name:20s} {img.size}  white={n_white:>7}  mid={n_mid:>7}  black={n_black:>7}")

base = Image.open(MASKS / "base.jpg")
W, H = base.size

floor = Image.open(MASKS / "floor.png").convert("L")
if floor.size != (W, H): floor = floor.resize((W, H))
vanity = Image.open(MASKS / "vanity.png").convert("L")
if vanity.size != (W, H): vanity = vanity.resize((W, H))
fixtures = Image.open(MASKS / "fixtures.png").convert("L")
if fixtures.size != (W, H): fixtures = fixtures.resize((W, H))

print(f"Base: {W}x{H} (total {W*H} pixels)\n")
stats("floor.png",    floor)
stats("vanity.png",   vanity)
stats("fixtures.png", fixtures)
print()

# 正確處理 fixtures：用 alpha
fix_rgba = Image.open(MASKS / "fixtures.png").convert("RGBA")
if fix_rgba.size != (W, H): fix_rgba = fix_rgba.resize((W, H))
fix_alpha = fix_rgba.split()[-1]
fix_safe = ImageChops.invert(fix_alpha)
stats("fix_safe (NEW)", fix_safe)

floor_safe = ImageChops.multiply(floor, fix_safe)
vanity_safe = ImageChops.multiply(vanity, fix_safe)
stats("floor_safe",  floor_safe)
stats("vanity_safe", vanity_safe)

# 額外：vanity 與 fixtures 的重疊情況
vanity_overlap = ImageChops.multiply(vanity, fix_alpha)
stats("vanity AND fixtures (overlap)", vanity_overlap)

# Save for visual check
floor_safe.save(OUT / "_debug_floor_safe.png")
vanity_safe.save(OUT / "_debug_vanity_safe.png")
print(f"\nSaved -> {OUT}/_debug_*.png")
