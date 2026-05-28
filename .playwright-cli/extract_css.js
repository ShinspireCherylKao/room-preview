async page => {
  await page.evaluate(() => {
    const bath = [...document.querySelectorAll('h2')].find(h => h.textContent.includes('衛浴'));
    bath.scrollIntoView();
    const section = bath.parentElement;
    const tabpanel = document.querySelector('#restroom0');
    const showWrap = tabpanel.querySelector('.rshow-wrapper');
    const show = tabpanel.querySelector('.restroom-show');
    const selectWrap = tabpanel.querySelector('.rselect-wrapper');
    const h3 = tabpanel.querySelector('h3');
    const select = tabpanel.querySelector('select');
    const selectStyle = getComputedStyle(select);
    const selectWrapStyle = getComputedStyle(tabpanel.querySelector('.select-wrapper'));
    const houseNote = tabpanel.querySelector('.house-note');
    const noteBanner = houseNote?.querySelector('div[style]');

    const probe = (el) => {
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        bg: cs.background.slice(0, 200),
        color: cs.color,
        font: cs.font.slice(0, 150),
        padding: cs.padding,
        margin: cs.margin,
        border: cs.border,
        borderRadius: cs.borderRadius,
      };
    };

    window.__ref_css = {
      body: probe(document.body),
      section: probe(section),
      tabpanel: probe(tabpanel),
      h3_title: probe(h3),
      selectWrap_col_LEFT: probe(selectWrap),
      showWrap_col_RIGHT: probe(showWrap),
      show: probe(show),
      select: probe(select),
      selectWrapper_div: probe(tabpanel.querySelector('.select-wrapper')),
      label: probe(tabpanel.querySelector('label')),
      formGroup: probe(tabpanel.querySelector('.form-group.item')),
      houseNote: probe(houseNote),
      noteBanner: probe(noteBanner),
      tab_active: probe(document.querySelector('.nav-tabs .active, .tabnav-link.active')),
    };
  });
}
