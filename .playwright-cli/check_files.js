async page => {
  await page.evaluate(async () => {
    const out = [];
    for (let f = 1; f <= 3; f++) {
      for (let d = 1; d <= 3; d++) {
        const fn = `t${f}-${d}.jpg`;
        const url = '/image/bath-renders/' + fn;
        try {
          const r = await fetch(url, { method: 'HEAD' });
          out.push({ fn, status: r.status, ok: r.ok, size: r.headers.get('content-length') });
        } catch (e) {
          out.push({ fn, error: String(e) });
        }
      }
    }
    window.__file_check = out;
  });
}
