/* Temas por estado: a ficha muda de clima conforme a situação do personagem.
   - Selo aberto (Shodhoruan manifestado): magma, brasas e bordas incandescentes.
   - PV crítico (≤ 30%): vinheta vermelha pulsando.
   - PV 0: página dessaturada, "Inconsciente".
   - Arma amaldiçoada com corrupção máxima: a aura dela tinge a página. */
(() => {
  const layer = el('div', undefined, 'mood-layer');
  const vignette = el('div', undefined, 'mood-vignette');
  const embers = el('div', undefined, 'mood-embers');
  [layer, vignette, embers].forEach(n => n.setAttribute('aria-hidden', 'true'));
  for (let i = 0; i < 28; i++) {
    const e = el('i');
    e.style.setProperty('--x', Math.random() * 100 + '%');
    e.style.setProperty('--size', 2 + Math.random() * 4 + 'px');
    e.style.setProperty('--time', 6 + Math.random() * 8 + 's');
    e.style.setProperty('--delay', -Math.random() * 14 + 's');
    e.style.setProperty('--drift', (Math.random() * 120 - 60) + 'px');
    embers.append(e);
  }
  const banner = el('div', undefined, 'mood-banner');
  banner.setAttribute('role', 'status');
  document.body.append(layer, vignette, embers, banner);

  const previousExtend = window.extendBackup;
  window.extendBackup = (data, clean) => {
    previousExtend?.(data, clean);
    if (typeof data.theme?.moods === 'boolean' && clean.theme) clean.theme.moods = data.theme.moods;
  };

  function chip(glyph, text, cls, tab) {
    const b = el('button', undefined, 'mood-chip ' + cls);
    b.type = 'button';
    b.title = text;
    b.setAttribute('aria-label', text);
    b.append(el('b', glyph), el('span', text));
    if (tab) b.onclick = () => { openTab(tab); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    return b;
  }

  let lastKey = '';
  function applyMood() {
    const enabled = state.theme?.moods !== false;
    const body = document.body;
    const ratio = state.maxhp ? state.hp / state.maxhp : 1;
    const sealOpen = enabled && state.sealed === false;
    const downed = enabled && state.hp <= 0;
    const critical = enabled && !downed && ratio <= 0.3;
    const cursed = enabled ? (state.cursedWeapons || []).find(w => w.corruptionMax > 0 && w.corruption >= w.corruptionMax) : null;

    body.classList.toggle('mood-seal', sealOpen);
    body.classList.toggle('mood-critical', critical);
    body.classList.toggle('mood-downed', downed);
    body.classList.toggle('mood-cursed', Boolean(cursed));
    if (cursed) body.style.setProperty('--mood-aura', /^#[0-9a-f]{6}$/i.test(cursed.aura) ? cursed.aura : '#b43cff');
    else body.style.removeProperty('--mood-aura');

    const key = [sealOpen, critical, downed, cursed?.name].join('|');
    if (key === lastKey) return;
    lastKey = key;
    banner.replaceChildren();
    if (sealOpen) banner.append(chip('封', 'Selo aberto · Shodhoruan manifestado', 'seal', 'besta'));
    if (downed) banner.append(chip('死', 'Inconsciente · 0 PV', 'downed'));
    else if (critical) banner.append(chip('血', 'Ferimento crítico', 'critical'));
    if (cursed) banner.append(chip('呪', (cursed.name || 'Arma') + ' domina o portador', 'cursed', 'arsenal'));
    banner.hidden = !banner.childElementCount;
  }

  /* Reage a qualquer mudança salva (vida, selo, corrupção…). */
  const baseSave = save;
  save = function (...args) { const result = baseSave(...args); applyMood(); return result; };

  /* Botão do selo também atualiza o texto do painel da besta. */
  const sealButton = $('#seal-toggle');
  sealButton.addEventListener('click', applyMood);

  /* Preferência na personalização. */
  const pref = el('label', undefined, 'preference');
  const box = el('input');
  box.type = 'checkbox';
  box.checked = state.theme?.moods !== false;
  box.onchange = () => { state.theme.moods = box.checked; save(); };
  pref.append(box, document.createTextNode('Temas por estado (selo, PV crítico, maldição)'));
  $('.customize')?.append(pref);

  applyMood();
})();
