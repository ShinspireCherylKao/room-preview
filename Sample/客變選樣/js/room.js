/**
 * room.js — 房型內頁共用互動腳本
 */
document.addEventListener('DOMContentLoaded', () => {
    // ===== Section Tabs =====
    const sectionTabs = document.querySelectorAll('.section-tab');
    const sectionPanels = document.querySelectorAll('.section-panel');

    sectionTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.section;
            sectionTabs.forEach(t => t.classList.remove('active'));
            sectionPanels.forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            const panel = document.getElementById(target);
            if (panel) panel.classList.add('active');
        });
    });

    // ===== Sub Tabs =====
    document.querySelectorAll('.sub-tabs').forEach(tabGroup => {
        const tabs = tabGroup.querySelectorAll('.sub-tab');
        const parentPanel = tabGroup.closest('.section-panel');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.dataset.subtab;
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                if (parentPanel) {
                    parentPanel.querySelectorAll('.sub-panel').forEach(p => p.classList.remove('active'));
                    const subPanel = parentPanel.querySelector(`#${target}`);
                    if (subPanel) subPanel.classList.add('active');
                }
            });
        });
    });

    // ===== Material Selection → Update Summary =====
    document.querySelectorAll('.material-option input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', () => {
            updateSummary();
        });
    });

    // Initialize summary
    updateSummary();

    function updateSummary() {
        document.querySelectorAll('.material-option input[type="radio"]:checked').forEach(radio => {
            const key = radio.name;
            const value = radio.dataset.label || radio.value;
            const summaryEl = document.querySelector(`.summary-item__value[data-key="${key}"]`);
            if (summaryEl) {
                summaryEl.textContent = value;
                summaryEl.classList.remove('empty');
            }
        });
    }

    // ===== Submit =====
    const submitBtn = document.querySelector('.btn-submit');
    if (submitBtn) {
        submitBtn.addEventListener('click', () => {
            const selections = {};
            document.querySelectorAll('.material-option input[type="radio"]:checked').forEach(r => {
                selections[r.name] = r.dataset.label || r.value;
            });
            console.log('客變選樣結果：', selections);
            alert('已記錄您的選材配置！\n（此為測試版本）');
        });
    }
});
