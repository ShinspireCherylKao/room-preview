"""
廚房 / 客餐廳 — 每個 (zone, option) 預合成一張透明 PNG overlay
參考 honor-dreamhouse.com 的做法：每張 PNG = base × tint，alpha = mask
切換 swatch 時只要改 layer 的 background-image，效果立刻夠戲劇性
"""
from PIL import Image, ImageChops
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ORIG = ROOT / "image" / "原圖"
MASKS_KIT = ROOT / "image" / "masks" / "廚房"
MASKS_DIN = ROOT / "image" / "masks" / "客餐廳"
OUT = ROOT / "image" / "kitchen-overlays"
OUT.mkdir(exist_ok=True)

def hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def load_mask(path: Path, target_size) -> Image.Image:
    """讀 mask → L 模式（白=zone）"""
    img = Image.open(path)
    if img.mode in ("RGBA", "P", "PA", "LA"):
        # 有 alpha → 用 alpha
        rgba = img.convert("RGBA")
        m = rgba.split()[-1]
    else:
        m = img.convert("L")
    if m.size != target_size:
        m = m.resize(target_size, Image.LANCZOS)
    return m

def composite(base: Image.Image, mask: Image.Image, color: tuple) -> Image.Image:
    """產出 RGBA overlay：base × color (multiply) 在 mask 內、其餘透明"""
    color_layer = Image.new("RGB", base.size, color)
    tinted = ImageChops.multiply(base, color_layer)
    # RGBA: tinted 作 RGB、mask 作 alpha
    rgba = tinted.convert("RGBA")
    rgba.putalpha(mask)
    return rgba

# === 廚房（近景） ===
print("=== 近景 (廚房.jpg) ===")
kit_base = Image.open(ORIG / "廚房.jpg").convert("RGB")
KW, KH = kit_base.size
print(f"base: {KW}x{KH}")

near_jobs = [
    # (zone-key in HTML data-overlay-zone, mask filename, options [(value, color_hex)])
    ("appliance-cab", "cab_safe.png", [
        ("tropical-walnut", "#6b4c3b"),
        ("oak-white",       "#d4c5a9"),
        ("gray-oak",        "#9e9589"),
    ]),
    ("countertop", "countertop_safe.png", [
        ("gray-pheasant", "#8a8078"),
        ("snow-white",    "#e8e0d6"),
    ]),
    ("upper-cab", "upper_cabinet_safe.png", [
        ("tropical-walnut", "#6b4c3b"),
        ("oak-white",       "#d4c5a9"),
        ("gray-oak",        "#9e9589"),
    ]),
    ("lower-cab", "lower_cabinet_safe.png", [
        ("tropical-walnut", "#6b4c3b"),
        ("oak-white",       "#d4c5a9"),
        ("gray-oak",        "#9e9589"),
    ]),
    ("wall", "wall_safe.png", [
        ("white",       "#ffffff"),
        ("fog-country", "#d5cfc5"),
    ]),
]

for zone, mask_file, options in near_jobs:
    mask = load_mask(MASKS_KIT / mask_file, (KW, KH))
    for value, color_hex in options:
        rgb = hex_to_rgb(color_hex)
        rgba = composite(kit_base, mask, rgb)
        out = OUT / f"near-{zone}-{value}.png"
        rgba.save(out, "PNG", optimize=True)
        print(f"  [OK] near-{zone}-{value}.png  color={color_hex}")

# === 客餐廳（遠景） ===
print("\n=== 遠景 (客餐廳.jpg) ===")
din_base = Image.open(ORIG / "客餐廳.jpg").convert("RGB")
DW, DH = din_base.size
print(f"base: {DW}x{DH}")

far_jobs = [
    ("floor", "floor.png", [
        ("gray-oak",    "#9e9590"),
        ("white-pine",  "#d6cfc5"),
        ("cream-maple", "#ddd5c4"),
    ]),
]

for zone, mask_file, options in far_jobs:
    mask = load_mask(MASKS_DIN / mask_file, (DW, DH))
    for value, color_hex in options:
        rgb = hex_to_rgb(color_hex)
        rgba = composite(din_base, mask, rgb)
        out = OUT / f"far-{zone}-{value}.png"
        rgba.save(out, "PNG", optimize=True)
        print(f"  [OK] far-{zone}-{value}.png  color={color_hex}")

print(f"\nDone -> {OUT}")
