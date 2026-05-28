# -*- coding: utf-8 -*-
"""
分析地坪的精確 HSV 值，用於後續替換
"""
import cv2
import numpy as np
from PIL import Image
import os

BASE = r"c:\Users\C1-0074\Desktop\AIPT\客變選樣套圖\Sample\客變選樣\image"
OUT_DIR = os.path.join(BASE, "生成圖")

def load_image(path):
    pil_img = Image.open(path)
    arr = np.array(pil_img.convert("RGB"))
    return cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)

img1 = load_image(os.path.join(BASE, "原圖", "廚房.jpg"))
img2 = load_image(os.path.join(BASE, "原圖", "客餐廳.jpg"))

h1, w1 = img1.shape[:2]
h2, w2 = img2.shape[:2]
print(f"廚房: {w1}x{h1}")
print(f"客餐廳: {w2}x{h2}")

hsv1 = cv2.cvtColor(img1, cv2.COLOR_BGR2HSV)
hsv2 = cv2.cvtColor(img2, cv2.COLOR_BGR2HSV)

# === 廚房 - 在已知地板區域取樣 ===
print("\n=== 廚房.jpg 地板取樣 ===")
# 地板大約在圖片下方 1/4，水平全寬
floor_samples_1 = [
    # (x, y) - 確定是地板的位置
    (100, 700), (200, 700), (400, 700), (600, 700),  # 最底部
    (100, 650), (300, 650), (500, 650),  # 稍上方
    (150, 600), (350, 600),  # 再上方
    (100, 580), (250, 580), (400, 570),  # 靠近傢俱底部
]

print("  地板像素 HSV 取樣:")
h_vals, s_vals, v_vals = [], [], []
for (x, y) in floor_samples_1:
    if y < h1 and x < w1:
        h_val, s_val, v_val = hsv1[y, x]
        b, g, r = img1[y, x]
        print(f"    ({x:3d},{y:3d}): HSV=({h_val:3d},{s_val:3d},{v_val:3d}), BGR=({b:3d},{g:3d},{r:3d})")
        h_vals.append(h_val)
        s_vals.append(s_val)
        v_vals.append(v_val)

print(f"\n  HSV 統計: H=[{min(h_vals)}-{max(h_vals)}], S=[{min(s_vals)}-{max(s_vals)}], V=[{min(v_vals)}-{max(v_vals)}]")

# 非地板區域取樣（傢俱、櫃體）
print("\n  非地板區域取樣（用於排除）:")
non_floor_1 = [
    (100, 400), (300, 400), (500, 400),  # 櫃體高度
    (150, 500), (400, 450),  # 櫃體下部
    (700, 500), (750, 550),  # 桌子/椅子
]
for (x, y) in non_floor_1:
    if y < h1 and x < w1:
        h_val, s_val, v_val = hsv1[y, x]
        b, g, r = img1[y, x]
        print(f"    ({x:3d},{y:3d}): HSV=({h_val:3d},{s_val:3d},{v_val:3d}), BGR=({b:3d},{g:3d},{r:3d})")


# === 客餐廳 - 在已知地板區域取樣 ===
print("\n\n=== 客餐廳.jpg 地板取樣 ===")
floor_samples_2 = [
    (100, 780), (300, 780), (500, 780), (700, 780), (900, 780),  # 最底部
    (150, 700), (400, 700), (600, 700), (800, 700),  # 稍上方
    (200, 650), (500, 650), (700, 650),  # 再上方
    (100, 600), (300, 600), (800, 600),  # 靠近傢俱
]

print("  地板像素 HSV 取樣:")
h_vals2, s_vals2, v_vals2 = [], [], []
for (x, y) in floor_samples_2:
    if y < h2 and x < w2:
        h_val, s_val, v_val = hsv2[y, x]
        b, g, r = img2[y, x]
        print(f"    ({x:3d},{y:3d}): HSV=({h_val:3d},{s_val:3d},{v_val:3d}), BGR=({b:3d},{g:3d},{r:3d})")
        h_vals2.append(h_val)
        s_vals2.append(s_val)
        v_vals2.append(v_val)

print(f"\n  HSV 統計: H=[{min(h_vals2)}-{max(h_vals2)}], S=[{min(s_vals2)}-{max(s_vals2)}], V=[{min(v_vals2)}-{max(v_vals2)}]")

# 非地板區域
print("\n  非地板區域取樣:")
non_floor_2 = [
    (200, 400), (400, 350), (600, 400),  # 櫃體
    (500, 500), (600, 500),  # 桌面
    (350, 550),  # 椅子
    (50, 600), (950, 600),  # 邊緣
]
for (x, y) in non_floor_2:
    if y < h2 and x < w2:
        h_val, s_val, v_val = hsv2[y, x]
        b, g, r = img2[y, x]
        print(f"    ({x:3d},{y:3d}): HSV=({h_val:3d},{s_val:3d},{v_val:3d}), BGR=({b:3d},{g:3d},{r:3d})")
