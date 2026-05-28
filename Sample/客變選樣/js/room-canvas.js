/**
 * room-canvas.js — Canvas 材質預覽互動控制
 *
 * 核心邏輯：
 * 1. 定義三個場景（廚房/客餐廳/主浴）的遮罩路徑與選材選項
 * 2. 場景切換時載入對應 compositor
 * 3. 使用者選材時即時更新 Canvas 合成
 */
document.addEventListener('DOMContentLoaded', () => {

    /* ===== 路徑常數 ===== */
    const MASK_BASE = '../image/masks';
    const TEX_BASE  = '../image/素材照';

    /* ===== 材質資料庫 ===== */
    const TEXTURES = {
        /* 地坪木紋 */
        'wood02':   { src: `${TEX_BASE}/wood02.jpg`, label: '白橡木', scale: 0.4 },
        'wood03':   { src: `${TEX_BASE}/wood03.jpg`, label: '深胡桃木', scale: 0.4 },
        /* 檯面石材 */
        'EG-1001':  { src: `${TEX_BASE}/EG-1001.jpg`, label: '雪白石', scale: 0.35 },
        'EG-1009':  { src: `${TEX_BASE}/EG-1009.jpg`, label: '深灰石', scale: 0.35 },
    };

    /* ===== 場景設定 ===== */
    const SCENES = {
        '廚房': {
            baseSrc:     `${MASK_BASE}/廚房/base.jpg`,
            lightingSrc: `${MASK_BASE}/廚房/lighting.png`,
            zones: {
                floor:         { maskSrc: `${MASK_BASE}/廚房/floor.png` },
                countertop:    { maskSrc: `${MASK_BASE}/廚房/countertop.png` },
                upper_cabinet: { maskSrc: `${MASK_BASE}/廚房/upper_cabinet.png` },
                lower_cabinet: { maskSrc: `${MASK_BASE}/廚房/lower_cabinet.png` },
            },
            materials: [
                {
                    zone: 'floor', label: '地坪',
                    options: [
                        { type: 'none', label: '原始', color: null },
                        { type: 'texture', id: 'wood02', label: '白橡木' },
                        { type: 'texture', id: 'wood03', label: '深胡桃木' },
                        { type: 'color', label: '蝴蝶灰杉', color: '#9e9590' },
                        { type: 'color', label: '加州金木', color: '#c4a872' },
                        { type: 'color', label: '國王雪杉', color: '#d6cfc5' },
                    ]
                },
                {
                    zone: 'countertop', label: '廚具檯面',
                    options: [
                        { type: 'none', label: '原始', color: null },
                        { type: 'texture', id: 'EG-1001', label: '雪白石' },
                        { type: 'texture', id: 'EG-1009', label: '深灰石' },
                        { type: 'color', label: '灰點帝雉石', color: '#8a8078' },
                    ]
                },
                {
                    zone: 'upper_cabinet', label: '上櫃面板',
                    options: [
                        { type: 'none', label: '原始', color: null },
                        { type: 'color', label: '熱帶核桃木', color: '#6b4c3b' },
                        { type: 'color', label: '白橡木', color: '#d4c5a9' },
                        { type: 'color', label: '灰橡木', color: '#9e9589' },
                    ]
                },
                {
                    zone: 'lower_cabinet', label: '下櫃面板',
                    options: [
                        { type: 'none', label: '原始', color: null },
                        { type: 'color', label: '熱帶核桃木', color: '#6b4c3b' },
                        { type: 'color', label: '白橡木', color: '#d4c5a9' },
                        { type: 'color', label: '灰橡木', color: '#9e9589' },
                    ]
                },
            ]
        },
        '客餐廳': {
            baseSrc:     `${MASK_BASE}/客餐廳/base.jpg`,
            lightingSrc: `${MASK_BASE}/客餐廳/lighting.png`,
            zones: {
                floor:         { maskSrc: `${MASK_BASE}/客餐廳/floor.png` },
                countertop:    { maskSrc: `${MASK_BASE}/客餐廳/countertop.png` },
                upper_cabinet: { maskSrc: `${MASK_BASE}/客餐廳/upper_cabinet.png` },
                lower_cabinet: { maskSrc: `${MASK_BASE}/客餐廳/lower_cabinet.png` },
            },
            materials: [
                {
                    zone: 'floor', label: '地坪',
                    options: [
                        { type: 'none', label: '原始', color: null },
                        { type: 'texture', id: 'wood02', label: '白橡木' },
                        { type: 'texture', id: 'wood03', label: '深胡桃木' },
                        { type: 'color', label: '蝴蝶灰杉', color: '#9e9590' },
                        { type: 'color', label: '加州金木', color: '#c4a872' },
                        { type: 'color', label: '國王雪杉', color: '#d6cfc5' },
                    ]
                },
                {
                    zone: 'countertop', label: '廚具檯面',
                    options: [
                        { type: 'none', label: '原始', color: null },
                        { type: 'texture', id: 'EG-1001', label: '雪白石' },
                        { type: 'texture', id: 'EG-1009', label: '深灰石' },
                        { type: 'color', label: '灰點帝雉石', color: '#8a8078' },
                    ]
                },
                {
                    zone: 'upper_cabinet', label: '上櫃面板',
                    options: [
                        { type: 'none', label: '原始', color: null },
                        { type: 'color', label: '熱帶核桃木', color: '#6b4c3b' },
                        { type: 'color', label: '白橡木', color: '#d4c5a9' },
                        { type: 'color', label: '灰橡木', color: '#9e9589' },
                    ]
                },
                {
                    zone: 'lower_cabinet', label: '下櫃面板',
                    options: [
                        { type: 'none', label: '原始', color: null },
                        { type: 'color', label: '熱帶核桃木', color: '#6b4c3b' },
                        { type: 'color', label: '白橡木', color: '#d4c5a9' },
                        { type: 'color', label: '灰橡木', color: '#9e9589' },
                    ]
                },
            ]
        },
        '主浴': {
            baseSrc:     `${MASK_BASE}/主浴/base.jpg`,
            lightingSrc: `${MASK_BASE}/主浴/lighting.png`,
            zones: {
                floor:       { maskSrc: `${MASK_BASE}/主浴/floor.png` },
                wall_white:  { maskSrc: `${MASK_BASE}/主浴/wall_white.png` },
                wall_accent: { maskSrc: `${MASK_BASE}/主浴/wall_accent.png` },
                vanity:      { maskSrc: `${MASK_BASE}/主浴/vanity.png` },
            },
            materials: [
                {
                    zone: 'floor', label: '主浴地磚',
                    options: [
                        { type: 'none', label: '原始', color: null },
                        { type: 'color', label: '奶油白', color: '#f0ede8' },
                        { type: 'color', label: '淺灰', color: '#ccc8c0' },
                        { type: 'color', label: '暖灰', color: '#a89880' },
                    ]
                },
                {
                    zone: 'wall_white', label: '白色壁磚',
                    options: [
                        { type: 'none', label: '原始', color: null },
                        { type: 'color', label: '純白', color: '#f5f5f5' },
                        { type: 'color', label: '米白', color: '#f0ede8' },
                        { type: 'color', label: '淺灰', color: '#d5d0ca' },
                    ]
                },
                {
                    zone: 'wall_accent', label: '特色牆',
                    options: [
                        { type: 'none', label: '原始', color: null },
                        { type: 'color', label: '深藍', color: '#3d5a80' },
                        { type: 'color', label: '墨綠', color: '#4a6741' },
                        { type: 'color', label: '莫蘭迪灰', color: '#8b8580' },
                        { type: 'color', label: '奶茶色', color: '#c4a882' },
                    ]
                },
                {
                    zone: 'vanity', label: '浴櫃',
                    options: [
                        { type: 'none', label: '原始', color: null },
                        { type: 'color', label: '胡桃木', color: '#5c3d2e' },
                        { type: 'color', label: '白橡木', color: '#d4c5a9' },
                        { type: 'color', label: '灰橡木', color: '#9e9589' },
                    ]
                },
            ]
        },
    };


    /* ===== DOM 參考 ===== */
    const canvas      = document.getElementById('preview-canvas');
    const selectPanel  = document.getElementById('select-panel');
    const summaryGrid  = document.getElementById('summary-grid');
    const loadingOverlay = document.getElementById('loading-overlay');
    const sceneTabs    = document.querySelectorAll('.section-tab');

    /** @type {TextureCompositor.Compositor|null} */
    let compositor = null;
    let currentScene = '廚房';

    /* 各場景的選擇狀態（記住切換回來時的選擇） */
    const sceneSelections = {};


    /* ===== 場景切換 ===== */
    async function loadScene(sceneName) {
        currentScene = sceneName;
        loadingOverlay.style.display = 'flex';

        /* 更新 Tab 按鈕狀態 */
        sceneTabs.forEach(t => {
            t.classList.toggle('active', t.dataset.scene === sceneName);
        });

        const config = SCENES[sceneName];

        /* 建立新 compositor */
        compositor = new TextureCompositor.Compositor(canvas, config);
        await compositor.init();

        /* 恢復之前的選擇或使用預設 */
        if (sceneSelections[sceneName]) {
            for (const [zoneId, state] of Object.entries(sceneSelections[sceneName])) {
                compositor.zoneStates[zoneId] = { ...state };
            }
        }

        await compositor.render();

        /* 產生選材面板 */
        buildSelectPanel(sceneName, config);

        /* 產生摘要 */
        buildSummary(sceneName, config);

        loadingOverlay.style.display = 'none';
    }


    /* ===== 產生選材面板 ===== */
    function buildSelectPanel(sceneName, config) {
        selectPanel.innerHTML = '';

        config.materials.forEach(mat => {
            const cat = document.createElement('div');
            cat.className = 'mat-cat';

            /* 標題 */
            const head = document.createElement('div');
            head.className = 'mat-cat__head';
            head.textContent = mat.label;
            cat.appendChild(head);

            /* 選項 */
            const swatches = document.createElement('div');
            swatches.className = 'mat-cat__swatches';

            mat.options.forEach((opt, idx) => {
                const label = document.createElement('label');
                label.className = 'swatch';

                const radio = document.createElement('input');
                radio.type = 'radio';
                radio.name = `${sceneName}_${mat.zone}`;
                radio.value = opt.label;

                /* 恢復之前的選擇 */
                const saved = sceneSelections[sceneName]?.[mat.zone];
                if (saved) {
                    if (opt.type === 'none' && saved.type === 'none') radio.checked = true;
                    else if (opt.type === 'color' && saved.type === 'color' && saved.value === opt.color) radio.checked = true;
                    else if (opt.type === 'texture' && saved.type === 'texture' && saved.value === TEXTURES[opt.id]?.src) radio.checked = true;
                } else if (idx === 0) {
                    radio.checked = true;
                }

                const chip = document.createElement('span');
                chip.className = 'swatch__chip';
                if (opt.type === 'none') {
                    chip.innerHTML = '<i class="fa-solid fa-ban" style="color:#999;font-size:14px"></i>';
                    chip.style.background = '#f5f0eb';
                    chip.style.border = '1px solid #ddd';
                } else if (opt.type === 'texture' && TEXTURES[opt.id]) {
                    chip.style.backgroundImage = `url(${TEXTURES[opt.id].src})`;
                    chip.style.backgroundSize = 'cover';
                    chip.style.backgroundPosition = 'center';
                } else {
                    chip.style.background = opt.color || '#ccc';
                }

                const lbl = document.createElement('span');
                lbl.className = 'swatch__label';
                lbl.textContent = opt.label;

                label.appendChild(radio);
                label.appendChild(chip);
                label.appendChild(lbl);
                swatches.appendChild(label);

                /* 事件：選擇材質 */
                radio.addEventListener('change', async () => {
                    cat.classList.add('is-active');
                    setTimeout(() => cat.classList.remove('is-active'), 600);

                    if (opt.type === 'none') {
                        compositor.clearZone(mat.zone);
                    } else if (opt.type === 'color') {
                        compositor.setZoneColor(mat.zone, opt.color);
                    } else if (opt.type === 'texture' && TEXTURES[opt.id]) {
                        const tex = TEXTURES[opt.id];
                        await compositor.setZoneTexture(mat.zone, tex.src, tex.scale);
                    }

                    /* 儲存選擇狀態 */
                    if (!sceneSelections[sceneName]) sceneSelections[sceneName] = {};
                    sceneSelections[sceneName][mat.zone] = { ...compositor.zoneStates[mat.zone] };

                    /* 更新摘要 */
                    updateSummary(mat.zone, opt.label);
                });
            });

            cat.appendChild(swatches);
            selectPanel.appendChild(cat);
        });
    }


    /* ===== 摘要 ===== */
    function buildSummary(sceneName, config) {
        summaryGrid.innerHTML = '';
        config.materials.forEach(mat => {
            const item = document.createElement('div');
            item.className = 'sum-item';

            const key = document.createElement('span');
            key.className = 'sum-key';
            key.textContent = mat.label;

            const val = document.createElement('span');
            val.className = 'sum-val';
            val.dataset.zone = mat.zone;

            /* 找到目前 checked 的 radio */
            const checked = selectPanel.querySelector(`input[name="${sceneName}_${mat.zone}"]:checked`);
            val.textContent = checked ? checked.value : '原始';

            item.appendChild(key);
            item.appendChild(val);
            summaryGrid.appendChild(item);
        });
    }

    function updateSummary(zoneId, label) {
        const el = summaryGrid.querySelector(`.sum-val[data-zone="${zoneId}"]`);
        if (el) {
            el.textContent = label;
            el.classList.add('just-changed');
            setTimeout(() => el.classList.remove('just-changed'), 800);
        }
    }


    /* ===== Tab 切換事件 ===== */
    sceneTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            loadScene(tab.dataset.scene);
        });
    });


    /* ===== 初始載入 ===== */
    loadScene('廚房');

});
