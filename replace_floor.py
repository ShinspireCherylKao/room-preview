# -*- coding: utf-8 -*-
"""
將廚房與客餐廳原圖的地坪替換為 wood02.jpg 花色
使用精確的 HSV 色彩偵測搭配多邊形 ROI 限制
"""
import cv2
import numpy as np
from PIL import Image
import os

# === 路徑設定 ===
BASE = r"c:\Users\C1-0074\Desktop\AIPT\客變選樣套圖\Sample\客變選樣\image"
IMG1_PATH = os.path.join(BASE, "原圖", "廚房.jpg")
IMG2_PATH = os.path.join(BASE, "原圖", "客餐廳.jpg")
TEX_PATH  = os.path.join(BASE, "素材照", "wood02.jpg")
OUT_DIR   = os.path.join(BASE, "生成圖")
os.makedirs(OUT_DIR, exist_ok=True)


def pil_to_cv(pil_img):
    arr = np.array(pil_img.convert("RGB"))
    return cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)


def cv_to_pil(cv_img):
    return Image.fromarray(cv2.cvtColor(cv_img, cv2.COLOR_BGR2RGB))


def load_image(path):
    pil_img = Image.open(path)
    return pil_to_cv(pil_img)


# === 讀取圖片 ===
img1 = load_image(IMG1_PATH)
img2 = load_image(IMG2_PATH)
texture = load_image(TEX_PATH)

print(f"廚房.jpg: {img1.shape}")
print(f"客餐廳.jpg: {img2.shape}")
print(f"wood02.jpg: {texture.shape}")


def create_floor_mask_with_polygon(img, floor_polygon, hsv_lower, hsv_upper,
                                    extra_hsv=None, exclude_regions=None,
                                    morph_close_k=11, morph_open_k=5,
                                    min_contour_area=2000, sat_min=None):
    """
    在指定多邊形內偵測地坪，回傳遮罩。
    
    參數:
      img: BGR 圖片
      floor_polygon: 地板可見區域的多邊形頂點 [(x,y), ...]
      hsv_lower/hsv_upper: 主要 HSV 偵測範圍
      extra_hsv: 額外 HSV 範圍列表
      exclude_regions: 要排除的矩形 [(x1,y1,x2,y2), ...]
      sat_min: 額外的飽和度下限（用來排除低飽和的灰色傢俱）
    """
    h, w = img.shape[:2]
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    
    # 建立多邊形 ROI 遮罩
    poly_mask = np.zeros((h, w), dtype=np.uint8)
    pts = np.array(floor_polygon, dtype=np.int32).reshape((-1, 1, 2))
    cv2.fillPoly(poly_mask, [pts], 255)
    
    # HSV 色彩偵測
    mask = cv2.inRange(hsv, np.array(hsv_lower), np.array(hsv_upper))
    
    if extra_hsv:
        for (lo, hi) in extra_hsv:
            m = cv2.inRange(hsv, np.array(lo), np.array(hi))
            mask = cv2.bitwise_or(mask, m)
    
    # 額外的飽和度過濾（地板木紋通常比灰色櫃體飽和度高）
    if sat_min is not None:
        s_channel = hsv[:, :, 1]
        sat_filter = (s_channel >= sat_min).astype(np.uint8) * 255
        mask = cv2.bitwise_and(mask, sat_filter)
    
    # 限制在多邊形 ROI 內
    mask = cv2.bitwise_and(mask, poly_mask)
    
    # 排除指定區域
    if exclude_regions:
        for (x1, y1, x2, y2) in exclude_regions:
            mask[y1:y2, x1:x2] = 0
    
    # 形態學處理
    k_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, 
                                         (morph_close_k, morph_close_k))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, k_close, iterations=3)
    
    k_open = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, 
                                        (morph_open_k, morph_open_k))
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, k_open, iterations=1)
    
    # 過濾小區域
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    filtered = np.zeros_like(mask)
    for cnt in contours:
        if cv2.contourArea(cnt) >= min_contour_area:
            cv2.drawContours(filtered, [cnt], -1, 255, -1)
    
    # 最終再限制一次在多邊形內（避免形態學操作溢出）
    filtered = cv2.bitwise_and(filtered, poly_mask)
    
    # 最後閉合一次讓遮罩更完整
    filtered = cv2.morphologyEx(filtered, cv2.MORPH_CLOSE, k_close, iterations=2)
    filtered = cv2.bitwise_and(filtered, poly_mask)
    
    return filtered


def apply_floor_texture(img, mask, texture, blend_alpha=0.88):
    """
    將花色貼圖平鋪套用至地坪區域，並配合原始光影。
    """
    h, w = img.shape[:2]
    result = img.copy()
    
    ys, xs = np.where(mask > 0)
    if len(ys) == 0:
        print("  警告：未偵測到地坪區域")
        return result
    
    y_min, y_max = ys.min(), ys.max()
    x_min, x_max = xs.min(), xs.max()
    region_h = y_max - y_min + 1
    region_w = x_max - x_min + 1
    
    print(f"  地坪區域: ({x_min},{y_min}) -> ({x_max},{y_max}), 大小: {region_w}x{region_h}")
    
    tex_h, tex_w = texture.shape[:2]
    
    # 將貼圖旋轉 90 度讓木紋水平（模擬真實地板鋪設方向）
    tex_rot = cv2.rotate(texture, cv2.ROTATE_90_CLOCKWISE)
    tex_h, tex_w = tex_rot.shape[:2]
    
    # 放大貼圖以減少重複次數
    target_tile_h = int(region_h * 0.7)  # 每塊大約佔地板高度 70%
    scale = target_tile_h / tex_h
    new_tex_w = max(1, int(tex_w * scale))
    new_tex_h = max(1, int(tex_h * scale))
    tex_scaled = cv2.resize(tex_rot, (new_tex_w, new_tex_h), interpolation=cv2.INTER_AREA)
    
    # 邊緣交叉淡入的重疊寬度（加大重疊量）
    overlap_x = max(1, new_tex_w // 4)
    overlap_y = max(1, new_tex_h // 4)
    
    # 建立無縫平鋪畫布
    canvas_h = region_h + new_tex_h * 2
    canvas_w = region_w + new_tex_w * 2
    tiled = np.zeros((canvas_h, canvas_w, 3), dtype=np.float64)
    weight = np.zeros((canvas_h, canvas_w), dtype=np.float64)
    
    np.random.seed(42)
    
    y_pos = 0
    row_idx = 0
    while y_pos < canvas_h:
        x_offset = int(new_tex_w * (0.2 + 0.6 * np.random.random())) if row_idx > 0 else 0
        col_idx = 0
        x_pos = -x_offset
        
        while x_pos < canvas_w:
            # 根據行列決定是否翻轉貼圖，打破重複感
            flip_h = ((row_idx + col_idx) % 2 == 1)
            flip_v = (row_idx % 3 == 1)
            
            tile = tex_scaled.copy()
            if flip_h:
                tile = cv2.flip(tile, 1)
            if flip_v:
                tile = cv2.flip(tile, 0)
            
            # 計算有效複製範圍
            dst_y1 = max(0, y_pos)
            dst_x1 = max(0, x_pos)
            src_y1 = max(0, -y_pos)
            src_x1 = max(0, -x_pos)
            
            copy_h = min(new_tex_h - src_y1, canvas_h - dst_y1)
            copy_w = min(new_tex_w - src_x1, canvas_w - dst_x1)
            
            if copy_w > 0 and copy_h > 0:
                tile_piece = tile[src_y1:src_y1+copy_h, src_x1:src_x1+copy_w].astype(np.float64)
                
                # 邊緣漸淡權重
                w_mask = np.ones((copy_h, copy_w), dtype=np.float64)
                
                fade_left = min(overlap_x, copy_w)
                fade_right = min(overlap_x, copy_w)
                for i in range(fade_left):
                    w_mask[:, i] *= i / fade_left
                for i in range(fade_right):
                    w_mask[:, copy_w - 1 - i] *= i / fade_right
                
                fade_top = min(overlap_y, copy_h)
                fade_bottom = min(overlap_y, copy_h)
                for j in range(fade_top):
                    w_mask[j, :] *= j / fade_top
                for j in range(fade_bottom):
                    w_mask[copy_h - 1 - j, :] *= j / fade_bottom
                
                w_mask_3ch = np.stack([w_mask]*3, axis=-1)
                
                tiled[dst_y1:dst_y1+copy_h, dst_x1:dst_x1+copy_w] += tile_piece * w_mask_3ch
                weight[dst_y1:dst_y1+copy_h, dst_x1:dst_x1+copy_w] += w_mask
            
            x_pos += new_tex_w - overlap_x
            col_idx += 1
        
        y_pos += new_tex_h - overlap_y
        row_idx += 1
    
    # 正規化
    weight = np.maximum(weight, 1e-6)
    weight_3ch = np.stack([weight]*3, axis=-1)
    tiled = (tiled / weight_3ch).clip(0, 255).astype(np.uint8)
    tiled = tiled[:region_h, :region_w]
    
    # 擷取原圖區域
    orig_region = img[y_min:y_max+1, x_min:x_max+1]
    region_mask = mask[y_min:y_max+1, x_min:x_max+1]
    mask_bool = region_mask > 0
    
    # === 亮度與色調匹配 ===
    orig_lab = cv2.cvtColor(orig_region, cv2.COLOR_BGR2LAB).astype(np.float64)
    tex_lab = cv2.cvtColor(tiled, cv2.COLOR_BGR2LAB).astype(np.float64)
    
    # 只在遮罩範圍計算
    for ch in range(3):
        orig_mean = orig_lab[:, :, ch][mask_bool].mean()
        orig_std = max(orig_lab[:, :, ch][mask_bool].std(), 1.0)
        tex_mean = tex_lab[:, :, ch].mean()
        tex_std = max(tex_lab[:, :, ch].std(), 1.0)
        
        if ch == 0:  # L 通道
            print(f"  原始地板 L: mean={orig_mean:.1f}, std={orig_std:.1f}")
            print(f"  新貼圖 L: mean={tex_mean:.1f}, std={tex_std:.1f}")
        
        tex_lab[:, :, ch] = (tex_lab[:, :, ch] - tex_mean) * (orig_std / tex_std) + orig_mean
    
    tex_lab = np.clip(tex_lab, 0, 255)
    tiled_matched = cv2.cvtColor(tex_lab.astype(np.uint8), cv2.COLOR_LAB2BGR)
    
    # === 保留原始光影 ===
    orig_gray = cv2.cvtColor(orig_region, cv2.COLOR_BGR2GRAY).astype(np.float64)
    # 使用大半徑模糊取得低頻光影（避免把木紋也當光影）
    light_smooth = cv2.GaussianBlur(orig_gray, (61, 61), 30)
    avg_brightness = light_smooth[mask_bool].mean() if mask_bool.any() else 128.0
    if avg_brightness > 0:
        light_map = light_smooth / avg_brightness
    else:
        light_map = np.ones_like(light_smooth)
    
    light_map = np.clip(light_map, 0.5, 1.5)
    light_map_3ch = np.stack([light_map]*3, axis=-1)
    
    tiled_lit = (tiled_matched.astype(np.float64) * light_map_3ch).clip(0, 255).astype(np.uint8)
    
    # === 柔邊混合 ===
    soft_mask = cv2.GaussianBlur(region_mask, (15, 15), 7)
    soft_mask_3ch = np.stack([soft_mask]*3, axis=-1).astype(np.float64) / 255.0
    
    orig_float = orig_region.astype(np.float64)
    tex_float = tiled_lit.astype(np.float64)
    
    blended = tex_float * blend_alpha + orig_float * (1 - blend_alpha)
    final_region = (blended * soft_mask_3ch + orig_float * (1 - soft_mask_3ch)).clip(0, 255).astype(np.uint8)
    
    result[y_min:y_max+1, x_min:x_max+1] = final_region
    
    return result


# ==============================================================================
# 處理廚房.jpg (822 x 732)
# ==============================================================================
print("\n=== 處理廚房.jpg ===")
h1, w1 = img1.shape[:2]
print(f"  圖片尺寸: {w1}x{h1}")

# 地板多邊形：從櫃體底部向下到圖片底部
# 參考圖片：地板從 y≈560 開始到底部，左邊 x=0，右邊延伸到 x=822
# 但右半部分被傢俱（桌子、椅子）擋住，地板仍在傢俱下方
kitchen_floor_poly = [
    (0, 575),      # 左上角（冰箱底部旁）
    (170, 565),    # 冰箱右側底部
    (175, 545),    # 廚具櫃底部
    (555, 545),    # 廚具櫃右側底部
    (560, 565),    # 右側櫃體底部
    (620, 565),    # 桌子左側
    (660, 545),    # 桌下方
    (822, 500),    # 右邊緣上方（桌面下方）
    (822, 732),    # 右下角
    (0, 732),      # 左下角
]

mask1 = create_floor_mask_with_polygon(
    img1,
    floor_polygon=kitchen_floor_poly,
    hsv_lower=(8, 90, 60),
    hsv_upper=(22, 200, 200),
    extra_hsv=[
        ((8, 60, 80), (20, 140, 180)),  # 稍淺色的地板
    ],
    sat_min=85,  # 排除低飽和的灰色傢俱
    min_contour_area=2000,
    morph_close_k=15,
    morph_open_k=5
)

mask1_count = np.count_nonzero(mask1)
print(f"  遮罩像素數: {mask1_count}")

# 儲存遮罩偵錯圖
debug1 = img1.copy()
overlay = debug1.copy()
overlay[mask1 > 0] = [0, 200, 0]
debug1 = cv2.addWeighted(debug1, 0.6, overlay, 0.4, 0)
cv_to_pil(debug1).save(os.path.join(OUT_DIR, "廚房_floor_mask_debug.jpg"), quality=95)

# 套用花色
result1 = apply_floor_texture(img1, mask1, texture, blend_alpha=0.90)

out1_path = os.path.join(OUT_DIR, "廚房_wood02.jpg")
cv_to_pil(result1).save(out1_path, quality=95)
print(f"  已儲存: {out1_path}")


# ==============================================================================
# 處理客餐廳.jpg (998 x 812)
# ==============================================================================
print("\n=== 處理客餐廳.jpg ===")
h2, w2 = img2.shape[:2]
print(f"  圖片尺寸: {w2}x{h2}")

# 客餐廳地板多邊形：地板面積較大
living_floor_poly = [
    (0, 580),      # 左上角（冰箱/櫃體底部）
    (150, 540),    # 冰箱右側底部
    (150, 500),    # 廚具櫃底部
    (530, 500),    # 廚具櫃右側底部
    (530, 530),    # 右側面板底部
    (580, 530),    # 到中央區域
    (998, 470),    # 右邊緣（窗台下方、地板可見處）
    (998, 812),    # 右下角
    (0, 812),      # 左下角
]

mask2 = create_floor_mask_with_polygon(
    img2,
    floor_polygon=living_floor_poly,
    hsv_lower=(8, 20, 40),
    hsv_upper=(25, 200, 240),
    extra_hsv=[
        ((8, 10, 100), (22, 80, 245)),    # 受光區域（飽和度很低但仍是地板）
        ((5, 5, 140), (20, 40, 250)),      # 窗邊高亮度地板
    ],
    sat_min=None,  # 客餐廳不做額外飽和度過濾（光線較複雜）
    exclude_regions=[],
    min_contour_area=3000,
    morph_close_k=21,
    morph_open_k=7
)

mask2_count = np.count_nonzero(mask2)
print(f"  遮罩像素數: {mask2_count}")

# 儲存遮罩偵錯圖
debug2 = img2.copy()
overlay2 = debug2.copy()
overlay2[mask2 > 0] = [0, 200, 0]
debug2 = cv2.addWeighted(debug2, 0.6, overlay2, 0.4, 0)
cv_to_pil(debug2).save(os.path.join(OUT_DIR, "客餐廳_floor_mask_debug.jpg"), quality=95)

# 套用花色
result2 = apply_floor_texture(img2, mask2, texture, blend_alpha=0.90)

out2_path = os.path.join(OUT_DIR, "客餐廳_wood02.jpg")
cv_to_pil(result2).save(out2_path, quality=95)
print(f"  已儲存: {out2_path}")


print("\n=== 全部完成 ===")
