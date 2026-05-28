async page => {
  await page.evaluate(() => {
    const bath = [...document.querySelectorAll('h2')].find(h => h.textContent.includes('衛浴'));
    let cur = bath;
    const ancestors = [];
    while (cur && cur !== document.body) {
      const cs = getComputedStyle(cur);
      ancestors.push({
        tag: cur.tagName,
        cls: cur.className,
        bg: cs.backgroundColor,
        bgImg: cs.backgroundImage.slice(0, 80),
      });
      cur = cur.parentElement;
    }
    window.__ancestors = ancestors;

    // get reference styling tokens for tab nav and h2 heading
    const h2 = bath;
    const tabActive = document.querySelector('.nav-tabs .active');
    const tabInactive = document.querySelector('.nav-tabs li:not(.active) a, .nav-tabs li:not(.active)');

    const probe = (el) => {
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        bg: cs.backgroundColor,
        color: cs.color,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        padding: cs.padding,
        margin: cs.margin,
        border: cs.border,
      };
    };
    window.__tab_styles = {
      h2: probe(h2),
      tabActive: probe(tabActive),
      tabInactive: probe(tabInactive),
    };
  });
}
