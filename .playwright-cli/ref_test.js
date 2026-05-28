async page => {
  await page.evaluate(async () => {
    const rStyle = document.getElementById('rStyle');
    const rDoor = document.getElementById('rDoor');
    const show = document.querySelector('.restroom-show');
    const out = [];
    const styleVals = ['itemA201', 'itemA202', 'itemA203'];
    const doorVals = ['item35', 'item36', 'item37'];
    for (let si = 0; si < styleVals.length; si++) {
      for (let di = 0; di < doorVals.length; di++) {
        rStyle.value = styleVals[si];
        rDoor.value = doorVals[di];
        rStyle.dispatchEvent(new Event('change', { bubbles: true }));
        rDoor.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise(r => setTimeout(r, 350));
        const bg = getComputedStyle(show).backgroundImage;
        const m = bg.match(/\/([^\/]+\.jpg)/);
        out.push({
          combo: 't' + (si+1) + '-' + (di+1),
          url: m ? m[1] : 'none',
          style_label: rStyle.options[rStyle.selectedIndex].textContent,
          door_label: rDoor.options[rDoor.selectedIndex].textContent
        });
      }
    }
    window.__ref_results = out;
  });
}
