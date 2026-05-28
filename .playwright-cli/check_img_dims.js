async page => {
  await page.evaluate(async () => {
    const img = new Image();
    await new Promise(r => { img.onload = r; img.src = '/images/restroom-new/t1-1.jpg'; });
    window.__img_dims = { w: img.naturalWidth, h: img.naturalHeight, ratio: img.naturalWidth / img.naturalHeight };
  });
}
