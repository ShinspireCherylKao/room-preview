async page => {
  await page.evaluate(() => {
    const setRadio = (name, value) => {
      const r = document.querySelector('input[name="' + name + '"][value="' + value + '"]');
      if (r) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }
    };
    setRadio('appliance_cab', 'gray-oak');
    setRadio('upper_cab', 'gray-oak');
    setRadio('lower_cab', 'gray-oak');
    setRadio('countertop', 'snow-white');
    setRadio('wall_paint', 'fog-country');
  });
}
