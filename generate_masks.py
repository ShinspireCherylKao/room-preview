# -*- coding: utf-8 -*-
"""
使用 SAM (Segment Anything Model) 自動產生各區域遮罩 PNG
並提取光影圖層，供前端 Canvas 即時合成使用
"""
import os
import numpy as np
import cv2
from PIL import Image
import torch
from segment_anything import sam_model_registry, SamPredictor

# === 路徑設定 ===
BASE = r"c:\Users\C1-0074\Desktop\AIPT\客變選樣套圖"
IMG_DIR = os.path.join(BASE, "Sample", "客變選樣", "image", "原圖")
OUT_BASE = os.path.join(BASE, "Sample", "客變選樣", "image", "masks")
MODEL_PATH = os.path.join(BASE, "models", "sam_vit_b.pth")

# === 載入 SAM 模型 ===
print("載入 SAM 模型...")
sam = sam_model_registry["vit_b"](checkpoint=MODEL_PATH)
sam.to(device="cpu")
predictor = SamPredictor(sam)
print("SAM 模型已載入")


def load_image(path):
    """讀取圖片為 RGB numpy array（支援中文路徑）"""
    pil_img = Image.open(path).convert("RGB")
    return np.array(pil_img)


def predict_mask(predictor, points_fg, points_bg=None, multi_output=False):
    """
    使用 SAM 預測遮罩
    points_fg: 前景提示點 [(x,y), ...]
    points_bg: 背景提示點（排除用）[(x,y), ...]
    """
    all_points = list(points_fg)
    labels = [1] * len(points_fg)

    if points_bg:
        all_points.extend(points_bg)
        labels.extend([0] * len(points_bg))

    point_coords = np.array(all_points)
    point_labels = np.array(labels)

    masks, scores, logits = predictor.predict(
        point_coords=point_coords,
        point_labels=point_labels,
        multimask_output=multi_output,
    )

    if multi_output:
        # 選擇分數最高的遮罩
        best_idx = np.argmax(scores)
        return masks[best_idx], scores[best_idx]
    else:
        return masks[0], scores[0]


def clean_mask(mask, min_area=1000, close_k=15, open_k=7):
    """形態學清理遮罩"""
    mask_uint8 = (mask * 255).astype(np.uint8)

    # 閉合填補空隙
    kernel_c = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (close_k, close_k))
    mask_uint8 = cv2.morphologyEx(mask_uint8, cv2.MORPH_CLOSE, kernel_c, iterations=2)

    # 開啟去除雜訊
    kernel_o = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (open_k, open_k))
    mask_uint8 = cv2.morphologyEx(mask_uint8, cv2.MORPH_OPEN, kernel_o, iterations=1)

    # 移除小區域
    contours, _ = cv2.findContours(mask_uint8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cleaned = np.zeros_like(mask_uint8)
    for cnt in contours:
        if cv2.contourArea(cnt) >= min_area:
            cv2.drawContours(cleaned, [cnt], -1, 255, -1)

    return cleaned


def extract_lighting(img_rgb, blur_size=51):
    """
    從原圖提取光影圖層
    輸出：光影比例圖（float，1.0 為平均亮度）
    """
    gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY).astype(np.float64)
    # 大半徑高斯模糊取低頻光影
    smooth = cv2.GaussianBlur(gray, (blur_size, blur_size), blur_size // 3)
    avg = smooth.mean()
    if avg > 0:
        light_map = smooth / avg
    else:
        light_map = np.ones_like(smooth)
    # 限制範圍並轉為 8-bit 灰階（128 = 1.0）
    light_map = np.clip(light_map * 128, 0, 255).astype(np.uint8)
    return light_map


def save_mask(mask, path):
    """儲存遮罩為 PNG"""
    Image.fromarray(mask).save(path)
    print(f"  ✓ 已儲存: {os.path.basename(path)} ({np.count_nonzero(mask > 0)} pixels)")


def save_debug(img_rgb, mask, path):
    """儲存偵錯圖（遮罩區域以綠色標記）"""
    debug = img_rgb.copy()
    overlay = debug.copy()
    overlay[mask > 0] = [0, 200, 0]
    debug = cv2.addWeighted(debug, 0.6, overlay, 0.4, 0)
    Image.fromarray(debug).save(path, quality=90)


# ==============================================================================
# 定義各場景的分割區域和提示點
# ==============================================================================
SCENES = {
    "廚房": {
        "file": "廚房.jpg",
        "zones": {
            "floor": {
                "name": "地坪",
                "fg": [(100, 700), (300, 680), (500, 660), (150, 620), (400, 610)],
                "bg": [(300, 400), (400, 350), (700, 450), (750, 500)],
            },
            "countertop": {
                "name": "檯面",
                "fg": [(300, 395), (400, 390), (480, 392)],
                "bg": [(300, 350), (400, 450), (300, 500), (100, 400)],
            },
            "upper_cabinet": {
                "name": "上櫃",
                "fg": [(280, 280), (380, 260), (480, 300)],
                "bg": [(300, 400), (200, 400), (550, 400), (100, 300)],
            },
            "lower_cabinet": {
                "name": "下櫃",
                "fg": [(300, 470), (400, 480), (480, 470)],
                "bg": [(300, 400), (300, 600), (100, 500), (550, 500)],
            },
        },
    },
    "客餐廳": {
        "file": "客餐廳.jpg",
        "zones": {
            "floor": {
                "name": "地坪",
                "fg": [(150, 750), (400, 720), (700, 700), (900, 680), (300, 650)],
                "bg": [(300, 400), (500, 450), (600, 350), (800, 400)],
            },
            "countertop": {
                "name": "檯面",
                "fg": [(250, 425), (350, 420), (430, 422)],
                "bg": [(250, 350), (350, 480), (100, 420), (500, 420)],
            },
            "upper_cabinet": {
                "name": "上櫃",
                "fg": [(250, 290), (350, 280), (430, 310)],
                "bg": [(250, 400), (500, 300), (100, 300)],
            },
            "lower_cabinet": {
                "name": "下櫃",
                "fg": [(250, 480), (350, 490), (430, 485)],
                "bg": [(250, 400), (250, 600), (500, 490)],
            },
        },
    },
    "主浴": {
        "file": "主浴.jpg",
        "zones": {
            "floor": {
                "name": "地磚",
                "fg": [(200, 620), (400, 640), (550, 600), (700, 620)],
                "bg": [(200, 400), (400, 300), (700, 400)],
            },
            "wall_white": {
                "name": "白色壁磚",
                "fg": [(350, 300), (450, 250), (300, 200), (500, 350)],
                "bg": [(200, 620), (750, 350), (300, 480), (100, 200)],
            },
            "wall_accent": {
                "name": "特色牆",
                "fg": [(800, 300), (850, 200), (780, 400), (820, 500)],
                "bg": [(600, 300), (500, 400), (700, 600)],
            },
            "vanity": {
                "name": "浴櫃",
                "fg": [(250, 470), (300, 480), (200, 460)],
                "bg": [(250, 350), (250, 600), (400, 470), (100, 470)],
            },
        },
    },
}


# ==============================================================================
# 執行分割
# ==============================================================================
for scene_name, scene_cfg in SCENES.items():
    print(f"\n{'='*60}")
    print(f"處理場景：{scene_name}")
    print(f"{'='*60}")

    # 載入圖片
    img_path = os.path.join(IMG_DIR, scene_cfg["file"])
    img_rgb = load_image(img_path)
    h, w = img_rgb.shape[:2]
    print(f"  圖片尺寸: {w}x{h}")

    # 設定圖片給 SAM
    predictor.set_image(img_rgb)

    # 建立輸出資料夾
    scene_out = os.path.join(OUT_BASE, scene_name)
    os.makedirs(scene_out, exist_ok=True)

    # 複製原圖作為 base
    base_path = os.path.join(scene_out, "base.jpg")
    Image.fromarray(img_rgb).save(base_path, quality=95)
    print(f"  ✓ 底圖已儲存: base.jpg")

    # 提取光影圖層
    light_map = extract_lighting(img_rgb)
    light_path = os.path.join(scene_out, "lighting.png")
    save_mask(light_map, light_path)

    # 對每個區域產生遮罩
    for zone_id, zone_cfg in scene_cfg["zones"].items():
        print(f"\n  --- {zone_cfg['name']} ({zone_id}) ---")

        mask, score = predict_mask(
            predictor,
            points_fg=zone_cfg["fg"],
            points_bg=zone_cfg.get("bg"),
            multi_output=True,
        )
        print(f"  SAM 分數: {score:.3f}")

        # 清理遮罩
        cleaned = clean_mask(mask, min_area=800)

        # 儲存遮罩
        mask_path = os.path.join(scene_out, f"{zone_id}.png")
        save_mask(cleaned, mask_path)

        # 儲存偵錯圖
        debug_path = os.path.join(scene_out, f"{zone_id}_debug.jpg")
        save_debug(img_rgb, cleaned, debug_path)

    print(f"\n  場景 {scene_name} 完成！")

print(f"\n{'='*60}")
print("全部遮罩產生完成！")
print(f"輸出資料夾: {OUT_BASE}")
print(f"{'='*60}")
