async page => {
  await page.evaluate(async () => {
    const stage = document.getElementById('bath-stage');
    const out = [];
    for (let f = 1; f <= 3; f++) {
      for (let d = 1; d <= 3; d++) {
        const rf = document.querySelector(`input[name="bathFloor"][value="${f}"]`);
        const rd = document.querySelector(`input[name="bathDoor"][value="${d}"]`);
        rf.checked = true; rf.dispatchEvent(new Event('change', { bubbles: true }));
        rd.checked = true; rd.dispatchEvent(new Event('change', { bubbles: true }));
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
