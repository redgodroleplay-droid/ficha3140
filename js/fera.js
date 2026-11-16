/* Modo Fera: a ficha inteira muda quando algo desperta o lado selvagem do personagem.
   Gatilhos manuais (state.fera): segunda vida da classe, fúria, Shodhoruan evolui/assume,
   maldição da katana liberada. A maldição também liga sozinha quando uma arma amaldiçoada
   está no estágio Liberada/Fusão ou com a corrupção no máximo. Marcador narrativo:
   não altera atributos. */
(() => {
  const TRIGGERS = [
    { key: 'segundaVida', glyph: '二', title: 'Segunda vida da classe', text: 'A classe desperta a sua segunda vida. O corpo se recusa a cair.' },
    { key: 'furia', glyph: '怒', title: 'Fúria', text: 'A raiva antiga, guardada por anos, finalmente encontra para onde ir.' },
    { key: 'shodhoruan', glyph: '獣', title: 'Shodhoruan evolui ou assume', text: 'A besta do selo cresce, ou toma o controle do corpo.' },
    { key: 'maldicao', glyph: '呪', title: 'Maldição da katana liberada', text: 'A lâmina deixa de obedecer. Quem empunha quem?' }
  ];
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const clean = v => {
    const out = {};
    TRIGGERS.forEach(t => { out[t.key] = v?.[t.key] === true; });
    return out;
  };
  state.fera = clean(state.fera);

  const previousExtend = window.extendBackup;
  window.extendBackup = (data, cleanData) => {
    previousExtend?.(data, cleanData);
    cleanData.fera = clean(data.fera);
  };

  /* arma amaldiçoada que liga a maldição sozinha */
  const autoCurse = () => (state.cursedWeapons || []).find(w =>
    /^(Liberada|Fusão)$/.test(w.stage || '') || (w.corruptionMax > 0 && w.corruption >= w.corruptionMax));

  function activeTriggers() {
    const weapon = autoCurse();
    return TRIGGERS.filter(t => state.fera[t.key] || (t.key === 'maldicao' && weapon)).map(t => ({ ...t, weapon: t.key === 'maldicao' ? weapon : null }));
  }

  /* ---------- camadas visuais ---------- */
  const layer = el('div', undefined, 'fera-layer');
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = '<i class="fera-claw a"></i><i class="fera-claw b"></i><div class="fera-eyes"><b></b><b></b></div>';
  const flash = el('div', undefined, 'fera-flash');
  flash.setAttribute('aria-hidden', 'true');

  /* ---------- botão rápido ---------- */
  const fab = el('button', undefined, 'fera-fab');
  fab.type = 'button';
  fab.append(el('b', '獣'), el('span', 'Modo Fera'));
  document.body.append(layer, flash, fab);

  /* ---------- painel dos gatilhos ---------- */
  const dialog = el('dialog', undefined, 'fera-dialog');
  dialog.id = 'fera-dialog';
  dialog.setAttribute('aria-labelledby', 'fera-dialog-title');
  const head = el('div', undefined, 'dialog-heading');
  const h = el('h2', 'Modo Fera');
  h.id = 'fera-dialog-title';
  const close = el('button', '×');
  close.type = 'button'; close.setAttribute('aria-label', 'Fechar'); close.onclick = () => dialog.close();
  head.append(h, close);
  const intro = el('p', 'Qualquer gatilho ativo desperta a fera. Quanto mais gatilhos, mais forte o efeito. Marcador narrativo, sem efeitos automáticos nos atributos.', 'fera-intro');
  const list = el('div', undefined, 'fera-list');
  const off = el('button', 'Acalmar a fera (desligar tudo)', 'fera-off');
  off.type = 'button';
  off.onclick = () => { TRIGGERS.forEach(t => { state.fera[t.key] = false; }); save(); };
  dialog.append(head, intro, list, off);
  dialog.onclick = e => { if (e.target === dialog) dialog.close(); };
  document.body.append(dialog);

  function drawList() {
    const weapon = autoCurse();
    list.replaceChildren();
    TRIGGERS.forEach(t => {
      const row = el('label', undefined, 'fera-row');
      const box = el('input');
      box.type = 'checkbox';
      const auto = t.key === 'maldicao' && weapon;
      box.checked = state.fera[t.key] || Boolean(auto);
      box.disabled = Boolean(auto) && !state.fera[t.key];
      box.onchange = () => { state.fera[t.key] = box.checked; save(); };
      const txt = el('span', undefined, 'fera-row-text');
      txt.append(el('b', t.title), el('small', auto ? (weapon.name || 'A arma') + ' está ' + (weapon.stage === 'Fusão' ? 'em fusão' : weapon.stage === 'Liberada' ? 'liberada' : 'com a corrupção no máximo') + '. Ligado pelo Arsenal.' : t.text));
      row.append(el('i', t.glyph, 'fera-glyph'), txt, box);
      row.classList.toggle('on', box.checked);
      list.append(row);
    });
    off.disabled = !TRIGGERS.some(t => state.fera[t.key]);
  }
  fab.onclick = () => { drawList(); dialog.showModal(); };

  /* atalho também no painel de Shodhoruan */
  const sealBtn = $('#seal-toggle');
  if (sealBtn) {
    const open = el('button', '獣 Modo Fera…', 'fera-open');
    open.type = 'button';
    open.onclick = fab.onclick;
    sealBtn.after(open);
  }

  /* ---------- aplicar ---------- */
  let wasActive = null;
  function applyFera() {
    const active = activeTriggers();
    const on = active.length > 0;
    document.body.classList.toggle('mood-fera', on);
    document.body.style.setProperty('--fera-level', String(active.length));
    fab.classList.toggle('on', on);
    fab.querySelector('span').textContent = on ? 'Fera · ' + active.length : 'Modo Fera';
    fab.title = on ? 'Modo Fera: ' + active.map(t => t.title).join(', ') : 'Modo Fera';
    fab.setAttribute('aria-label', fab.title);
    if (dialog.open) drawList();
    if (wasActive === false && on) awaken(active);
    wasActive = on;
  }

  function awaken(active) {
    flash.replaceChildren(el('b', active.length > 1 ? '獣' : active[0].glyph), el('span', active.map(t => t.title).join(' · ')));
    flash.classList.remove('go'); void flash.offsetWidth;
    flash.classList.add('go');
    if (!calm) {
      document.body.classList.remove('fera-roar'); void document.body.offsetWidth;
      document.body.classList.add('fera-roar');
      setTimeout(() => document.body.classList.remove('fera-roar'), 650);
    }
  }

  const baseSave = save;
  save = function (...args) { const result = baseSave(...args); applyFera(); return result; };

  applyFera();
})();
