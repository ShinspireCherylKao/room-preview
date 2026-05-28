"""
重畫電器櫃 mask：原 cab.png 對到冰箱（y=301-731），改成對到冰箱上方的電器櫃面板
電器櫃位置（依 廚房.jpg 觀察）：
  x: 50-195   (左column 寬度)
  y: 35-290   (冰箱頂端往上到天花板下緣)
"""
from PIL import Image, ImageDraw
from pathlib import Path

MASKS = Path(__file__).resolve().parent.parent / "image" / "masks" / "廚房"

# 備份原 cab.png 為 fridge.png（其實是冰箱位置，保留以備之後若要加冰箱 zone）
orig_path = MASKS / "cab.png"
backup_path = MASKS / "fridge.png"
if orig_path.exists() and not backup_path.exists():
    Image.open(orig_path).save(backup_path)
    print(f"原 cab.png 備份為 fridge.png")

# 取原圖尺寸
base = Image.open(MASKS / "base.jpg")
W, H = base.size

# 畫新的電器櫃 mask（黑底白形狀 = 不行；CSS mask 用 alpha→ 黑色 painted on transparent）
# 用 RGBA：RGB 全黑、alpha 在電器櫃區域為 255、其餘為 0
new_mask = Image.new("RGBA", (W, H), (0, 0, 0, 0))
draw = ImageDraw.Draw(new_mask)

# 電器櫃矩形（圓角小一點，模擬實物）
ELE_BOX = (50, 35, 195, 290)
draw.rounded_rectangle(ELE_BOX, radius=6, fill=(0, 0, 0, 255))

new_mask.save(orig_path)
print(f"新電器櫃 mask 已寫入 cab.png")
print(f"涵蓋區域: x={ELE_BOX[0]}-{ELE_BOX[2]}  y={ELE_BOX[1]}-{ELE_BOX[3]}")
