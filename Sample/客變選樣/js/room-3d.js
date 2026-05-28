/**
 * room-3d.js — 3D 選材頁面 UI 互動腳本（非 ES Module）
 * 處理：Zone tabs, Swatch 選擇 → 呼叫 Three.js 材質更新, Summary 更新, Camera 切換, Submit
 */
document.addEventListener('DOMContentLoaded', () => {

    // ===== Zone Tabs =====
    const zoneTabs = document.querySelectorAll('.zone-tab');
    const zonePanels = document.querySelectorAll('.zone-panel');

    zoneTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const zone = tab.dataset.zone;
            zoneTabs.forEach(t => t.classList.remove('active'));
            zonePanels.forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            const panel = document.getElementById('zone-' + zone);
            if (panel) panel.classList.add('active');

            // Move camera to corresponding view
            if (typeof window.moveCamera === 'function') {
                window.moveCamera(zone === 'other' ? 'default' : zone);
            }
        });
    });

    // ===== Swatch Selection → 3D Material + Summary Update =====
    document.querySelectorAll('.swatch input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', function () {
            const swatch = this.closest('.swatch');
            const meshName = swatch.dataset.mesh;
            const color = swatch.dataset.color;
            const texture = swatch.dataset.texture;
            const label = this.dataset.label || this.value;
            const key = this.name;

            // Update 3D scene
            if (typeof window.updateMeshMaterial === 'function') {
                window.updateMeshMaterial(meshName, color, texture);
            }

            // Update summary
            const sumEl = document.querySelector(`.sum-val[data-key="${key}"]`);
            if (sumEl) {
                sumEl.textContent = label;
                sumEl.classList.add('changed');
                setTimeout(() => sumEl.classList.remove('changed'), 500);
            }
        });
    });

    // ===== Camera View Buttons =====
    const viewButtons = {
        'btn-view-kitchen': 'kitchen',
        'btn-view-bedroom': 'bedroom',
        'btn-view-bathroom': 'bathroom',
        'btn-view-top': 'top',
        'btn-reset': 'default',
    };

    Object.entries(viewButtons).forEach(([id, preset]) => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', () => {
                if (typeof window.moveCamera === 'function') {
                    window.moveCamera(preset);
                }
            });
        }
    });

    // ===== Submit =====
    const submitBtn = document.getElementById('btn-submit');
    if (submitBtn) {
        submitBtn.addEventListener('click', () => {
            const selections = {};
            document.querySelectorAll('.swatch input[type="radio"]:checked').forEach(r => {
                selections[r.name] = r.dataset.label || r.value;
            });
            console.log('客變選樣結果：', selections);
            alert('已記錄您的選材配置！\n（此為 3D 即時預覽測試版本）');
        });
    }

    // ===== Initialize summary from defaults =====
    document.querySelectorAll('.swatch input[type="radio"]:checked').forEach(radio => {
        const key = radio.name;
        const label = radio.dataset.label || radio.value;
        const sumEl = document.querySelector(`.sum-val[data-key="${key}"]`);
        if (sumEl) sumEl.textContent = label;
    });
});
