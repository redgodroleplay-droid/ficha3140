/* =========================================================
   Seletor de temática: "Laca e kintsugi" (padrão) ou
   "Lua crescente" (roxo, estilo Kokushibo; css/lua.css).
   Guarda a escolha em state.theme.palette e vai no backup.
   ========================================================= */
(() => {
  const PALETTES = [
    ['', 'Laca e kintsugi · vermelho e ouro'],
    ['lua', 'Lua crescente · roxo (estilo Kokushibo)']
  ];
  const valid = v => PALETTES.some(([k]) => k && k === v);

  /* céu com a lua e as lâminas em meia-lua */
  const sky = el('div', undefined, 'lua-sky');
  sky.setAttribute('aria-hidden', 'true');
  const blades = el('div', undefined, 'lua-blades');
  for (let i = 0; i < 16; i++) {
    const b = el('i');
    const size = 8 + Math.random() * 22;
    b.style.setProperty('--x', Math.random() * 100 + '%');
    b.style.setProperty('--y', Math.random() * 100 + '%');
    b.style.setProperty('--size', size + 'px');
    b.style.setProperty('--rot', Math.random() * 360 + 'deg');
    b.style.setProperty('--o', (0.18 + Math.random() * 0.35).toFixed(2));
    b.style.setProperty('--time', 9 + Math.random() * 10 + 's');
    b.style.setProperty('--delay', -Math.random() * 18 + 's');
    b.style.setProperty('--dx', (Math.random() * 80 - 40) + 'px');
    b.style.setProperty('--dy', (Math.random() * 60 - 30) + 'px');
    blades.append(b);
  }
  sky.append(el('div', undefined, 'lua-halo'), el('div', undefined, 'lua-moon'), blades);
  document.body.prepend(sky);

  function applyPalette() {
    const p = state.theme?.palette;
    document.body.classList.toggle('theme-lua', p === 'lua');
  }

  const previousExtend = window.extendBackup;
  window.extendBackup = (data, clean) => {
    previousExtend?.(data, clean);
    if (clean.theme && valid(data.theme?.palette)) clean.theme.palette = data.theme.palette;
  };

  /* reaplica depois de importar um backup (save é chamado ao carregar) */
  const baseSave = save;
  save = function (...args) { const r = baseSave(...args); applyPalette(); return r; };

  const wrap = el('label', 'Temática', 'editor-label');
  const sel = el('select');
  for (const [v, label] of PALETTES) { const o = el('option', label); o.value = v; sel.append(o); }
  sel.value = valid(state.theme?.palette) ? state.theme.palette : '';
  sel.onchange = () => {
    if (sel.value) state.theme.palette = sel.value; else delete state.theme.palette;
    applyPalette(); save();
  };
  wrap.append(sel);
  const legend = document.querySelector('.customize legend');
  if (legend) legend.after(wrap); else document.querySelector('.customize')?.prepend(wrap);

  applyPalette();
})();
