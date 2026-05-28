/**
 * home.js — 首頁互動腳本
 */
document.addEventListener('DOMContentLoaded', () => {
    // ===== 導覽列捲動效果 =====
    const nav = document.querySelector('.top-nav');
    window.addEventListener('scroll', () => {
        nav.classList.toggle('scrolled', window.scrollY > 40);
    }, { passive: true });

    // ===== Scroll Reveal =====
    const revealElements = document.querySelectorAll('.room-card, .process-step');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    revealElements.forEach(el => observer.observe(el));
});
