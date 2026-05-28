async (page, [f, d]) => {
  await page.evaluate(([f, d]) => {
    const fSel = document.getElementById('bathFloor');
    const dSel = document.getElementById('bathDoor');
    fSel.value = String(f);
    dSel.value = String(d);
    fSel.dispatchEvent(new Event('change'));
    dSel.dispatchEvent(new Event('change'));
  }, [f, d]);
}
