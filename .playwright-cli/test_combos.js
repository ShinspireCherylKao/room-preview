async page => {
  await page.evaluate(async () => {
    const fSel = document.getElementById('bathFloor');
    const dSel = document.getElementById('bathDoor');
    const stage = document.getElementById('bath-stage');
    const out = [];
    for (let f = 1; f <= 3; f++) {
      for (let d = 1; d <= 3; d++) {
        fSel.value = String(f);
        dSel.value = String(d);
        fSel.dispatchEvent(new Event('change'));
        dSel.dispatchEvent(new Event('change'));
        await new Promise(r => setTimeout(r, 350));
        const bg = getComputedStyle(stage).backgroundImage;
        const m = bg.match(/\/([^\/]+\.jpg)/);
        out.push({
          c: 't' + f + '-' + d,
          url: m ? m[1] : 'none',
          ok: bg.indexOf('t' + f + '-' + d + '.jpg') >= 0,
          miss: stage.classList.contains('missing')
        });
      }
    }
    window.__test_results = out;
  });
}
