/**
 * room-preview.js — 舒適套房 照片套圖互動
 *
 * 核心邏輯：
 * 1. 區塊 Tab 切換（廚房/客餐廳 ↔ 主浴）
 * 2. 選材 radio → SVG zone fill 即時更新
 * 3. 近景/遠景自動切換（依據 mat-cat 的 data-view）
 * 4. 摘要同步
 */
document.addEventListener('DOMContentLoaded', () => {

    /* ===== 1. Section Tab 切換 ===== */
    const sectionTabs = document.querySelectorAll('.section-tab');
    const tabPanels   = document.querySelectorAll('.tab-panel');

    sectionTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;                     // "kitchen" | "bath"
            sectionTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            tabPanels.forEach(p => p.classList.remove('active'));
            document.getElementById('tab-' + target)?.classList.add('active');
        });
    });


    /* ===== 2. 近景 / 遠景切換 ===== */
    const viewNear = document.getElementById('view-near');
    const viewFar  = document.getElementById('view-far');
    const viewBtns = document.querySelectorAll('.view-indicator__btn');
    let currentView = 'near';

    function switchView(view) {
        if (view === currentView) return;
        currentView = view;

        if (view === 'near') {
            viewNear?.classList.add('active');
            viewFar?.classList.remove('active');
        } else {
            viewFar?.classList.add('active');
            viewNear?.classList.remove('active');
        }

        // 更新按鈕狀態
        viewBtns.forEach(b => {
            b.classList.toggle('active', b.dataset.view === view);
        });
    }

    // 手動切換按鈕
    viewBtns.forEach(btn => {
        btn.addEventListener('click', () => switchView(btn.dataset.view));
    });


    /* ===== 3. 選材 → 套色 + 自動切景 ===== */
    document.querySelectorAll('.mat-cat').forEach(cat => {
        const radios = cat.querySelectorAll('input[type="radio"]');

        radios.forEach(radio => {
            radio.addEventListener('change', () => {
                const zoneName = cat.dataset.zone;
                const viewType = cat.dataset.view;              // "near" | "far" | undefined
                const color    = radio.dataset.color;
                const label    = radio.dataset.label;

                // 自動切換近景/遠景（僅廚房 tab 有 data-view）
                if (viewType) {
                    switchView(viewType);
                }

                // 更新 SVG zone fill
                if (zoneName) {
                    const zone = document.querySelector(`[data-zone="${zoneName}"]`);
                    if (zone) {
                        zone.setAttribute('fill', color);
                        // 閃爍提示
                        zone.classList.remove('flash');
                        void zone.offsetWidth;
                        zone.classList.add('flash');
                    }
                }

                // 高亮目前操作的 mat-cat
                document.querySelectorAll('.mat-cat').forEach(c => c.classList.remove('is-active'));
                cat.classList.add('is-active');

                // 更新摘要
                const sumEl = document.querySelector(`.sum-val[data-sum="${radio.name}"]`);
                if (sumEl) {
                    sumEl.textContent = label;
                    sumEl.classList.add('just-changed');
                    setTimeout(() => sumEl.classList.remove('just-changed'), 800);
                }
            });
        });
    });


    /* ===== 4. 點擊 SVG zone → 高亮對應選材組 ===== */
    document.querySelectorAll('.zone').forEach(zone => {
        zone.addEventListener('click', () => {
            const name = zone.dataset.zone;
            const cat = document.querySelector(`.mat-cat[data-zone="${name}"]`);
            if (cat) {
                cat.scrollIntoView({ behavior: 'smooth', block: 'center' });
                document.querySelectorAll('.mat-cat').forEach(c => c.classList.remove('is-active'));
                cat.classList.add('is-active');
                setTimeout(() => cat.classList.remove('is-active'), 2000);
            }
        });
    });


    /* ===== 5. 送出 ===== */
    document.getElementById('btn-submit')?.addEventListener('click', () => {
        const selections = {};
        document.querySelectorAll('input[type="radio"]:checked').forEach(r => {
            selections[r.name] = r.dataset.label;
        });
        console.log('客變選樣結果：', selections);
        alert('已記錄您的選材配置！\n（此為測試版本）');
    });


    /* ===== 6. 初始化：同步預設值到 SVG zone ===== */
    document.querySelectorAll('input[type="radio"]:checked').forEach(radio => {
        const cat = radio.closest('.mat-cat');
        if (!cat) return;
        const zoneName = cat.dataset.zone;
        const color = radio.dataset.color;
        if (zoneName && color) {
            const zone = document.querySelector(`[data-zone="${zoneName}"]`);
            if (zone) zone.setAttribute('fill', color);
        }
    });
});
