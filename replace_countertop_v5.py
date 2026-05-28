# -*- coding: utf-8 -*-
"""
廚房檯面花色替換 v5 - 大幅提亮，讓白色 EG-1001 花色明顯可見
"""
import cv2
import numpy as np
from PIL import Image
import os

BASE = r"c:\Users\C1-0074\Desktop\AIPT\客變選樣套圖\Sample\客變選樣\image"
OUT_DIR = os.path.join(BASE, "生成圖")

def load_image(path):
    return cv2.cvtColor(np.array(Image.open(path).convert("RGB")), cv2.COLOR_RGB2BGR)

def save_image(cv_img, path):
    Image.fromarray(cv2.cvtColor(cv_img, cv2.COLOR_BGR2RGB)).save(path, quality=95)

img1 = load_image(os.path.join(BASE, "原圖", "廚房.jpg"))
img2 = load_image(os.path.join(BASE, "原圖", "客餐廳.jpg"))
texture = load_image(os.path.join(BASE, "素材照", "EG-1001.jpg"))


def replace_countertop(img, polygon_pts, texture,
                        target_brightness=0.45,  # 目標檯面亮度（0-1）
                        feather_px=4):
    """
    直接將多邊形區域替換為花色，不做色彩過濾。
    用較高亮度顯示白色花色。
    保留檯面上明亮物件（透過 alpha masking）。
    """
    h, w = img.shape[:2]
    result = img.copy()
    
    # 建立多邊形遮罩
    pts = polygon_pts.reshape(-1, 1, 2).astype(np.int32)
    poly_mask = np.zeros((h, w), dtype=np.uint8)
    cv2.fillPoly(poly_mask, [pts], 255)
    
    # 灰度分析
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # 排除明亮物件：水龍頭、花瓶玻璃反射等
    # 使用 adaptive 方式：在 ROI 內，計算平均亮度，排除顯著偏亮的像素
    roi_pixels = gray[poly_mask > 0]
    if len(roi_pixels) == 0:
        return result, poly_mask
    
    mean_val = roi_pixels.mean()
    std_val = roi_pixels.std()
    # 排除亮度 > mean + 1.5*std 的像素（物件/高光）
    bright_thresh = min(mean_val + 1.5 * std_val, 180)
    print(f"  ROI 灰度 mean={mean_val:.1f}, std={std_val:.1f}, 物件閾值={bright_thresh:.0f}")
    
    # 物件遮罩
    bright_mask = (gray > bright_thresh).astype(np.uint8) * 255
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    bright_mask = cv2.dilate(bright_mask, k, iterations=1)
    
    # 最終遮罩 = 多邊形 - 物件
    final_mask = cv2.bitwise_and(poly_mask, cv2.bitwise_not(bright_mask))
    
    # 形態學清理
    k2 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    final_mask = cv2.morphologyEx(final_mask, cv2.MORPH_CLOSE, k2, iterations=2)
    
    # 羽化
    soft = cv2.GaussianBlur(final_mask, (feather_px*2+1, feather_px*2+1), feather_px)
    alpha = soft.astype(np.float64) / 255.0
    
    count = np.count_nonzero(final_mask)
    print(f"  遮罩像素: {count}")
    
    ys, xs = np.where(soft > 0)
    if len(ys) == 0:
        return result, final_mask
    
    y1, y2 = ys.min(), ys.max()
    x1, x2 = xs.min(), xs.max()
    rh, rw = y2-y1+1, x2-x1+1
    print(f"  區域: ({x1},{y1})->({x2},{y2}), {rw}x{rh}")
    
    # 鋪設花色
    th, tw = texture.shape[:2]
    tiled = np.tile(texture, ((rh//th)+1, (rw//tw)+1, 1))[:rh, :rw]
    tex_f = tiled.astype(np.float64)
    
    # 目標：讓花色在場景中呈現 target_brightness 的亮度
    # EG-1001 平均亮度約 230，target_brightness * 255 ≈ 115
    tex_mean = tex_f.mean()
    scale = (target_brightness * 255.0) / max(tex_mean, 1.0)
    tex_scaled = (tex_f * scale).clip(0, 255)
    
    # 取出原始光影作為調制圖
    gray_region = gray[y1:y2+1, x1:x2+1].astype(np.float64)
    mask_region = final_mask[y1:y2+1, x1:x2+1]
    
    # 計算遮罩區域的灰度統計
    masked_gray = gray_region[mask_region > 0]
    if len(masked_gray) > 0:
        g_mean = masked_gray.mean()
        g_min = masked_gray.min()
        g_max = masked_gray.max()
        # 正規化光照：將原始灰度範圍映射到 0.6~1.2
        if g_max > g_min:
            light_norm = (gray_region - g_min) / (g_max - g_min)  # 0~1
            light_map = 0.6 + light_norm * 0.6  # 0.6~1.2
        else:
            light_map = np.ones_like(gray_region)
    else:
        light_map = np.ones_like(gray_region)
    
    light_3ch = np.stack([light_map]*3, axis=-1)
    
    # 花色 × 光照
    tex_lit = tex_scaled * light_3ch
    
    # 混合少量原始色增加深度（10%）
    orig_region = result[y1:y2+1, x1:x2+1].astype(np.float64)
    blended = tex_lit * 0.88 + orig_region * 0.12
    blended = blended.clip(0, 255)
    
    # Alpha 合成
    a3 = np.stack([alpha[y1:y2+1, x1:x2+1]]*3, axis=-1)
    final = (blended * a3 + orig_region * (1 - a3)).clip(0, 255).astype(np.uint8)
    result[y1:y2+1, x1:x2+1] = final
    
    return result, final_mask


# === 廚房.jpg ===
print("\n=== 處理廚房.jpg ===")
poly1 = np.array([
    [268, 385], [340, 381], [470, 374], [538, 370],
    [540, 410], [268, 415],
], dtype=np.int32)

result1, mask1 = replace_countertop(img1, poly1, texture,
                                     target_brightness=0.45, feather_px=4)
save_image(result1, os.path.join(OUT_DIR, "廚房_EG-1001.jpg"))
save_image(cv2.cvtColor(mask1, cv2.COLOR_GRAY2BGR), os.path.join(OUT_DIR, "廚房_mask_debug.jpg"))
print("  已儲存")


# === 客餐廳.jpg ===
print("\n=== 處理客餐廳.jpg ===")
poly2 = np.array([
    [118, 400], [200, 393], [350, 385], [490, 375],
    [495, 418], [118, 435],
], dtype=np.int32)

result2, mask2 = replace_countertop(img2, poly2, texture,
                                     target_brightness=0.45, feather_px=4)
save_image(result2, os.path.join(OUT_DIR, "客餐廳_EG-1001.jpg"))
save_image(cv2.cvtColor(mask2, cv2.COLOR_GRAY2BGR), os.path.join(OUT_DIR, "客餐廳_mask_debug.jpg"))
print("  已儲存")

print("\n=== 完成 ===")
