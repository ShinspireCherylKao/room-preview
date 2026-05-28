/**
 * texture-compositor.js — 材質合成引擎
 *
 * 核心功能：
 * 1. 載入底圖 + 遮罩 PNG + 光影圖層
 * 2. 使用者選材時，即時在 Canvas 上合成材質貼圖
 * 3. 保留原始光影效果
 */

/* ===== 全域變數 ===== */
const TextureCompositor = (() => {
    'use strict';

    /** 圖片快取，避免重複載入 */
    const _imageCache = new Map();

    /**
     * 載入圖片並快取
     * @param {string} src - 圖片路徑
     * @returns {Promise<HTMLImageElement>}
     */
    function loadImage(src) {
        if (_imageCache.has(src)) {
            return Promise.resolve(_imageCache.get(src));
        }
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                _imageCache.set(src, img);
                resolve(img);
            };
            img.onerror = () => reject(new Error(`無法載入圖片: ${src}`));
            img.src = src;
        });
    }

    /**
     * 建立離屏 Canvas
     * @param {number} w - 寬
     * @param {number} h - 高
     * @returns {{ canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D }}
     */
    function createOffscreen(w, h) {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        return { canvas, ctx };
    }

    /**
     * 平鋪材質貼圖到指定大小（帶隨機翻轉，減少重複感）
     * @param {HTMLImageElement} tex - 材質圖
     * @param {number} w - 目標寬
     * @param {number} h - 目標高
     * @param {number} scale - 縮放比例（1.0=原尺寸）
     * @returns {HTMLCanvasElement}
     */
    function tileFill(tex, w, h, scale = 0.5) {
        const { canvas, ctx } = createOffscreen(w, h);
        const tw = Math.round(tex.width * scale);
        const th = Math.round(tex.height * scale);

        if (tw <= 0 || th <= 0) return canvas;

        for (let y = 0; y < h; y += th) {
            const row = Math.floor(y / th);
            for (let x = 0; x < w; x += tw) {
                const col = Math.floor(x / tw);
                ctx.save();
                /* 根據行列決定翻轉方向，打破重複 */
                const flipH = (row + col) % 2 === 1;
                const flipV = row % 3 === 1;

                ctx.translate(x + tw / 2, y + th / 2);
                ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
                ctx.drawImage(tex, -tw / 2, -th / 2, tw, th);
                ctx.restore();
            }
        }
        return canvas;
    }


    /* ===== Compositor 類別 ===== */

    /**
     * @typedef {Object} ZoneConfig
     * @property {string} maskSrc  - 遮罩 PNG 路徑
     * @property {string} [color]  - 預設疊色（十六進位）
     * @property {string} [textureSrc] - 預設材質圖路徑
     */

    /**
     * @typedef {Object} SceneConfig
     * @property {string} baseSrc     - 底圖路徑
     * @property {string} lightingSrc - 光影圖層路徑
     * @property {Object<string, ZoneConfig>} zones - 區域設定
     */

    class Compositor {
        /**
         * @param {HTMLCanvasElement} canvas - 輸出 Canvas
         * @param {SceneConfig} config - 場景設定
         */
        constructor(canvas, config) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.config = config;

            /** @type {HTMLImageElement|null} */
            this.baseImg = null;
            /** @type {HTMLImageElement|null} */
            this.lightImg = null;
            /** @type {Object<string, HTMLImageElement>} */
            this.masks = {};

            /** 各區域當前狀態：{ type: 'color'|'texture', value: string, textureScale?: number } */
            this.zoneStates = {};

            this._ready = false;
        }

        /** 初始化：載入底圖、光影、遮罩 */
        async init() {
            const promises = [];

            /* 底圖 */
            promises.push(
                loadImage(this.config.baseSrc).then(img => { this.baseImg = img; })
            );

            /* 光影 */
            if (this.config.lightingSrc) {
                promises.push(
                    loadImage(this.config.lightingSrc).then(img => { this.lightImg = img; })
                );
            }

            /* 各區域遮罩 */
            for (const [zoneId, zone] of Object.entries(this.config.zones)) {
                promises.push(
                    loadImage(zone.maskSrc).then(img => { this.masks[zoneId] = img; })
                );
                /* 初始狀態 */
                if (zone.textureSrc) {
                    this.zoneStates[zoneId] = { type: 'texture', value: zone.textureSrc, textureScale: 0.5 };
                } else if (zone.color) {
                    this.zoneStates[zoneId] = { type: 'color', value: zone.color };
                } else {
                    this.zoneStates[zoneId] = { type: 'none' };
                }
            }

            await Promise.all(promises);

            /* 設定 Canvas 尺寸 = 底圖尺寸 */
            this.canvas.width = this.baseImg.width;
            this.canvas.height = this.baseImg.height;
            this._ready = true;
        }

        /**
         * 設定區域顏色
         * @param {string} zoneId
         * @param {string} color - 十六進位色碼
         */
        setZoneColor(zoneId, color) {
            this.zoneStates[zoneId] = { type: 'color', value: color };
            this.render();
        }

        /**
         * 設定區域材質
         * @param {string} zoneId
         * @param {string} textureSrc - 材質圖路徑
         * @param {number} [scale=0.5] - 材質縮放
         */
        async setZoneTexture(zoneId, textureSrc, scale = 0.5) {
            /* 預載材質 */
            await loadImage(textureSrc);
            this.zoneStates[zoneId] = { type: 'texture', value: textureSrc, textureScale: scale };
            this.render();
        }

        /** 清除區域（恢復底圖） */
        clearZone(zoneId) {
            this.zoneStates[zoneId] = { type: 'none' };
            this.render();
        }

        /** 渲染合成圖 */
        async render() {
            if (!this._ready) return;

            const { ctx, canvas } = this;
            const w = canvas.width;
            const h = canvas.height;

            /* 步驟 1：畫底圖 */
            ctx.clearRect(0, 0, w, h);
            ctx.drawImage(this.baseImg, 0, 0);

            /* 步驟 2：逐區域疊上材質/顏色 */
            for (const [zoneId, state] of Object.entries(this.zoneStates)) {
                if (state.type === 'none') continue;

                const mask = this.masks[zoneId];
                if (!mask) continue;

                /* 建立遮罩裁切的離屏 Canvas */
                const { canvas: offC, ctx: offCtx } = createOffscreen(w, h);

                if (state.type === 'color') {
                    /* 純色疊加 */
                    offCtx.fillStyle = state.value;
                    offCtx.fillRect(0, 0, w, h);
                } else if (state.type === 'texture') {
                    /* 材質平鋪 */
                    const texImg = _imageCache.get(state.value);
                    if (texImg) {
                        const tiled = tileFill(texImg, w, h, state.textureScale || 0.5);
                        offCtx.drawImage(tiled, 0, 0);
                    }
                }

                /* 用遮罩裁切：只保留遮罩白色區域 */
                offCtx.globalCompositeOperation = 'destination-in';
                offCtx.drawImage(mask, 0, 0, w, h);
                offCtx.globalCompositeOperation = 'source-over';

                /* 疊合到主 Canvas（靠 alpha 混合自然保留原始光影） */
                ctx.globalAlpha = 0.82;
                ctx.drawImage(offC, 0, 0);
                ctx.globalAlpha = 1.0;

                /* 在材質區域上加一層原圖的光影效果 */
                if (this.lightImg) {
                    const { canvas: lightC, ctx: lightCtx } = createOffscreen(w, h);
                    lightCtx.drawImage(this.lightImg, 0, 0, w, h);
                    /* 用遮罩裁切光影 */
                    lightCtx.globalCompositeOperation = 'destination-in';
                    lightCtx.drawImage(mask, 0, 0, w, h);
                    lightCtx.globalCompositeOperation = 'source-over';
                    /* 用 soft-light 模式疊上光影（比 multiply 柔和） */
                    ctx.globalCompositeOperation = 'soft-light';
                    ctx.globalAlpha = 0.4;
                    ctx.drawImage(lightC, 0, 0);
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.globalAlpha = 1.0;
                }
            }
        }
    }

    /* 公開 API */
    return {
        Compositor,
        loadImage,
        tileFill,
    };
})();
