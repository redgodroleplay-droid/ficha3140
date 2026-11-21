/* =========================================================
   Perícias e Habilidades (aba 技能), no mesmo modelo da ficha do Bedivere.
   - Perícias: as 18 da mesa, cada uma com treino (○ sem treino, ● proficiente,
     ◆ especialista), bônus extra, bônus na passiva e anotação; perícias próprias.
   - Valores passivos (10 + bônus + extra da passiva). Observador: +5 em
     Percepção e Investigação passivas.
   - Habilidades: traços em state.traits, editáveis e removíveis, com usos por
     descanso. A árvore (skill-tree.js) lê o ramo Disciplina daqui.
   Carregar depois de codex.js e antes de skill-tree.js.
   ========================================================= */
(() => {
  const SKILLS = [
    ['Acrobacia', 1], ['Arcanismo', 3], ['Atletismo', 0], ['Atuação', 5], ['Enganação', 5], ['Furtividade', 1],
    ['História', 3], ['Intimidação', 5], ['Intuição', 4], ['Investigação', 3], ['Lidar com animais', 4], ['Medicina', 4],
    ['Natureza', 3], ['Percepção', 4], ['Persuasão', 5], ['Prestidigitação', 1], ['Religião', 3], ['Sobrevivência', 4]
  ];
  const ABBR = ['FOR', 'DES', 'CON', 'INT', 'SAB', 'CAR'];
  const MARK = ['○', '●', '◆'], LEVEL = ['Sem treino', 'Proficiente', 'Especialista'];
  const RESET = [['long', 'Descanso longo'], ['short', 'Descanso curto'], ['none', 'Manual']];
  const PASSIVES = ['Percepção', 'Investigação', 'Intuição'];
  const int = (v, d = 0) => { const n = Math.floor(Number(String(v ?? '').replace(',', '.'))); return Number.isFinite(n) ? n : d; };
  const clampN = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const str = (v, max = 20000) => (typeof v === 'string' ? v.slice(0, max) : '');

  /* ---------- Estado inicial (só quando ainda não existe) ---------- */
  if (!state.skillLevels || typeof state.skillLevels !== 'object' || Array.isArray(state.skillLevels)) {
    state.skillLevels = {};
    document.querySelectorAll('.lower-grid [data-skill]').forEach(b => { state.skillLevels[b.dataset.skill] = 1; });
  }
  if (!state.skillInfo || typeof state.skillInfo !== 'object' || Array.isArray(state.skillInfo)) {
    state.skillInfo = {
      'Percepção': { passive: 5, note: 'Observador: +5 na Percepção passiva.' },
      'Investigação': { passive: 5, note: 'Observador: +5 na Investigação passiva.' }
    };
  }
  if (!Array.isArray(state.customSkills)) state.customSkills = [];
  if (typeof state.training !== 'string') {
    state.training = ($('.lower-grid .detail')?.innerText || '').trim();
  }
  if (!Array.isArray(state.traits)) {
    /* os traços que antes ficavam fixos: Segredos da cidade, Observador, Alerta, Paranoico */
    state.traits = [0, 1, 4, 6].map(i => abilities[i]).map(([title, category, text]) => {
      const colored = state.skillNotes.find(n => n.title === title && n.text === text);
      return { title, category, text, ...(colored?.colors ? { colors: colored.colors } : {}), uses: 0, usesMax: 0, reset: 'long' };
    });
  }

  /* ---------- Backup ----------
     arsenal.js (carregado depois) substitui window.extendBackup sem encadear,
     então o gancho daqui só é instalado quando todos os scripts já rodaram. */
  const extend = (data, clean) => {
    if (data.skillLevels && typeof data.skillLevels === 'object') {
      clean.skillLevels = {};
      for (const [k, v] of Object.entries(data.skillLevels)) if ([1, 2].includes(v)) clean.skillLevels[str(k, 80)] = v;
    }
    if (data.skillInfo && typeof data.skillInfo === 'object') {
      clean.skillInfo = {};
      for (const [k, v] of Object.entries(data.skillInfo)) if (v && typeof v === 'object')
        clean.skillInfo[str(k, 80)] = { extra: clampN(int(v.extra), -30, 30), passive: clampN(int(v.passive), -30, 30), note: str(v.note, 2000) };
    }
    if (Array.isArray(data.customSkills)) clean.customSkills = data.customSkills.filter(c => c && typeof c === 'object').map(c => ({
      name: str(c.name, 80), attr: clampN(int(c.attr), 0, 5), level: clampN(int(c.level), 0, 2),
      extra: clampN(int(c.extra), -30, 30), passive: clampN(int(c.passive), -30, 30), note: str(c.note, 2000)
    }));
    if (typeof data.training === 'string') clean.training = str(data.training, 5000);
    if (Array.isArray(data.traits)) clean.traits = data.traits.filter(t => t && typeof t === 'object').map(t => ({
      title: str(t.title, 200), category: str(t.category, 200), text: str(t.text),
      ...(Array.isArray(t.colors) ? { colors: t.colors.filter(m => m && Number.isInteger(m.start) && Number.isInteger(m.end) && m.start >= 0 && m.end > m.start && /^#[0-9a-f]{6}$/i.test(m.color)) } : {}),
      uses: clampN(int(t.uses), 0, 99), usesMax: clampN(int(t.usesMax), 0, 99),
      reset: ['long', 'short', 'none'].includes(t.reset) ? t.reset : 'long'
    }));
  };
  document.addEventListener('DOMContentLoaded', () => {
    const previousExtend = window.extendBackup;
    window.extendBackup = (data, clean) => { previousExtend?.(data, clean); extend(data, clean); };
  });

  /* ---------- Cálculos ---------- */
  function allSkills() {
    return [
      ...SKILLS.map(([name, attr]) => {
        const info = state.skillInfo[name] || {};
        return { key: 'sk-' + name, name, attr, level: state.skillLevels[name] || 0, extra: int(info.extra), passive: int(info.passive), note: info.note || '',
          setLevel: n => { if (n) state.skillLevels[name] = n; else delete state.skillLevels[name]; },
          setInfo: (k, v) => {
            const cur = state.skillInfo[name] || {};
            cur[k] = v;
            if (!cur.note && !int(cur.extra) && !int(cur.passive)) delete state.skillInfo[name]; else state.skillInfo[name] = cur;
          } };
      }),
      ...state.customSkills.map((c, i) => ({ key: 'cs-' + i, name: c.name || 'Perícia sem nome', attr: c.attr, level: c.level, extra: int(c.extra), passive: int(c.passive), note: c.note || '', custom: c, index: i,
        setLevel: n => { c.level = n; }, setInfo: (k, v) => { c[k] = v; } }))
    ];
  }
  const bonusOf = sk => mod(state.attrs[sk.attr]) + Number(state.prof) * sk.level + sk.extra;
  const passiveOf = sk => 10 + bonusOf(sk) + sk.passive;
  const findSkill = name => allSkills().find(s => s.name === name);
  window.rollSkill = name => { const sk = findSkill(name); if (sk) roll(sk.name, bonusOf(sk)); };

  /* ---------- Tela ---------- */
  const archive = $('#skill-archive');
  archive.className = 'skills-hub';
  let tab = 'pericias', openSkill = null;
  const editing = new Set();

  function rerender() { save(); render(); renderOverview(); }

  function skillRow(sk) {
    const bonus = bonusOf(sk), open = openSkill === sk.key;
    const row = el('div', undefined, 'pr-skill' + (sk.custom ? ' custom' : ''));
    row.dataset.level = sk.level;
    const lv = el('button', MARK[sk.level], 'pr-level');
    lv.type = 'button';
    lv.title = LEVEL[sk.level] + ' · clique para mudar';
    lv.setAttribute('aria-label', sk.name + ': ' + LEVEL[sk.level] + '. Mudar treino');
    lv.onclick = () => { sk.setLevel((sk.level + 1) % 3); rerender(); archive.querySelector('[data-key="' + sk.key + '"] .pr-level')?.focus(); };
    const rollBtn = el('button', undefined, 'pr-roll');
    rollBtn.type = 'button';
    rollBtn.setAttribute('aria-label', 'Rolar ' + sk.name + ' ' + signed(bonus));
    rollBtn.append(el('span', sk.name), el('small', ABBR[sk.attr] + (sk.extra ? ' ' + signed(sk.extra) : '')), el('b', signed(bonus)));
    rollBtn.onclick = () => roll(sk.name, bonus);
    const info = el('button', sk.note || sk.extra || sk.passive ? '✎' : 'ⓘ', 'pr-info' + (sk.note || sk.extra || sk.passive ? ' has' : ''));
    info.type = 'button';
    info.title = sk.note || 'Anotações e bônus';
    info.setAttribute('aria-expanded', String(open));
    info.setAttribute('aria-label', 'Detalhes de ' + sk.name);
    info.onclick = () => { openSkill = open ? null : sk.key; render(); archive.querySelector('[data-key="' + sk.key + '"] .pr-info')?.focus(); };
    row.append(lv, rollBtn, info);
    const wrap = el('div', undefined, 'pr-wrap' + (open ? ' open' : ''));
    wrap.dataset.key = sk.key;
    wrap.append(row);
    if (!open) return wrap;

    const editor = el('div', undefined, 'pr-editor');
    if (sk.custom) {
      const line = el('div', undefined, 'pr-line');
      line.append(labeledField('Nome da perícia', sk.custom.name, v => { sk.custom.name = v; save(); }));
      const attrLabel = el('label', 'Atributo', 'editor-label');
      const sel = el('select');
      ABBR.forEach((a, i) => { const o = el('option', a + ' · ' + attrNames[i]); o.value = i; sel.append(o); });
      sel.value = sk.custom.attr;
      sel.onchange = () => { sk.custom.attr = Number(sel.value); rerender(); };
      attrLabel.append(sel);
      line.append(attrLabel);
      editor.append(line);
    }
    const nums = el('div', undefined, 'pr-line');
    for (const [k, label] of [['extra', 'Bônus extra'], ['passive', 'Bônus na passiva']]) {
      const lab = el('label', label, 'editor-label');
      const input = el('input');
      input.type = 'number';
      input.value = sk[k] || '';
      input.placeholder = '0';
      input.onchange = () => { sk.setInfo(k, clampN(int(input.value), -30, 30)); rerender(); };
      lab.append(input);
      nums.append(lab);
    }
    editor.append(nums);
    editor.append(el('p', attrNames[sk.attr] + ' ' + signed(mod(state.attrs[sk.attr])) + (sk.level ? ' · PB ' + signed(Number(state.prof) * sk.level) : '') + (sk.extra ? ' · extra ' + signed(sk.extra) : '') + ' = ' + signed(bonus) + ' · passiva ' + passiveOf(sk), 'footnote'));
    editor.append(labeledField('Anotação', sk.note, v => { sk.setInfo('note', v); save(); }, true));
    if (sk.custom) {
      const del = el('button', '✕ Excluir perícia');
      del.onclick = () => { if (!confirm('Excluir a perícia “' + sk.name + '”?')) return; state.customSkills.splice(sk.index, 1); openSkill = null; rerender(); };
      editor.append(del);
    }
    wrap.append(editor);
    return wrap;
  }

  function periciasView() {
    const grid = el('div', undefined, 'pr-layout');
    const main = el('article', undefined, 'card pr-card');
    const head = el('div', undefined, 'card-label');
    head.append(document.createTextNode('PERÍCIAS '), el('span', '○ ● ◆ treino · ⓘ detalhes', 'pr-legend'));
    const list = el('div', undefined, 'pr-grid');
    allSkills().forEach(sk => list.append(skillRow(sk)));
    const add = el('button', '+ Perícia própria');
    add.onclick = () => {
      state.customSkills.push({ name: '', attr: 1, level: 1, extra: 0, passive: 0, note: '' });
      openSkill = 'cs-' + (state.customSkills.length - 1);
      rerender();
      archive.querySelector('[data-key="' + openSkill + '"] input')?.focus();
    };
    main.append(head, list, el('p', 'Toque no nome para rolar. Em ⓘ você soma bônus extras e anota de onde vem o treino.', 'footnote'), add);

    const side = el('div', undefined, 'pr-side');
    const passive = el('article', undefined, 'card pr-passive');
    passive.append(el('div', 'VALORES PASSIVOS', 'card-label'));
    for (const name of PASSIVES) {
      const sk = findSkill(name);
      const row = el('div', undefined, 'pr-passive-row');
      row.append(el('span', name), el('b', String(passiveOf(sk))));
      if (sk.passive) row.title = 'Inclui ' + signed(sk.passive) + ' de bônus na passiva';
      passive.append(row);
    }
    passive.append(el('p', 'Observador: +5 em Percepção e Investigação passivas (ajuste em ⓘ).', 'footnote'));
    const training = el('article', undefined, 'card');
    training.append(el('div', 'TREINAMENTO', 'card-label'), labeledField('Resistências, armaduras, armas, ferramentas e idiomas', state.training, v => { state.training = v; save(); renderOverview(); }, true));
    side.append(passive, training);
    grid.append(main, side);
    return grid;
  }

  function usesRow(t) {
    const box = el('div', undefined, 'pr-uses');
    const max = el('input'); max.type = 'number'; max.min = 0; max.max = 99; max.value = t.usesMax || '';
    max.placeholder = '0';
    max.setAttribute('aria-label', 'Usos máximos de ' + t.title);
    max.onchange = () => { t.usesMax = clampN(int(max.value), 0, 99); t.uses = Math.min(t.uses, t.usesMax); rerender(); };
    const reset = el('select');
    reset.setAttribute('aria-label', 'Recarga de ' + t.title);
    RESET.forEach(([v, l]) => { const o = el('option', l); o.value = v; reset.append(o); });
    reset.value = t.reset || 'long';
    reset.onchange = () => { t.reset = reset.value; save(); };
    const maxLabel = el('label', 'Usos', 'editor-label'); maxLabel.append(max);
    const resetLabel = el('label', 'Recarga', 'editor-label'); resetLabel.append(reset);
    box.append(maxLabel, resetLabel);
    return box;
  }

  function traitCard(t, i) {
    const card = el('article', undefined, 'card pr-trait');
    card.append(el('span', t.category || 'HABILIDADE', 'badge'), el('h3', t.title || 'Sem nome'));
    if (!editing.has(t)) {
      card.append(el('p', t.text || 'Sem descrição.'));
      if (t.usesMax) {
        const pips = el('div', undefined, 'pr-pips');
        pips.setAttribute('aria-label', (t.usesMax - t.uses) + ' de ' + t.usesMax + ' usos restantes');
        for (let n = 0; n < t.usesMax; n++) pips.append(el('i', undefined, n < t.usesMax - t.uses ? 'on' : ''));
        const use = el('button', t.uses >= t.usesMax ? 'Sem usos' : 'Usar');
        use.disabled = t.uses >= t.usesMax;
        use.onclick = () => { t.uses++; rerender(); };
        const back = el('button', '↺');
        back.title = 'Devolver um uso';
        back.setAttribute('aria-label', 'Devolver um uso de ' + t.title);
        back.disabled = !t.uses;
        back.onclick = () => { t.uses = Math.max(0, t.uses - 1); rerender(); };
        const row = el('div', undefined, 'pr-use-row');
        row.append(pips, el('small', (RESET.find(r => r[0] === t.reset) || RESET[0])[1]), use, back);
        card.append(row);
      }
      const tools = el('div', undefined, 'toolbar');
      const edit = el('button', 'Editar');
      edit.onclick = () => { editing.add(t); render(); archive.querySelectorAll('.pr-trait')[i]?.querySelector('input')?.focus(); };
      const del = el('button', 'Retirar');
      del.onclick = () => {
        if (!confirm('Retirar a habilidade “' + (t.title || 'sem nome') + '”? Ela sai desta aba e da árvore.')) return;
        state.traits.splice(i, 1); editing.delete(t); rerender();
      };
      tools.append(edit, del);
      card.append(tools);
      return card;
    }
    card.querySelector('h3').remove();
    card.append(
      labeledField('Nome', t.title, v => { t.title = v; save(); }),
      labeledField('Categoria (talento, passado, racial…)', t.category, v => { t.category = v; save(); }),
      labeledField('Descrição', t.text, v => { t.text = v; t.colors = []; save(); }, true),
      usesRow(t));
    const tools = el('div', undefined, 'toolbar');
    const done = el('button', 'Concluir edição', 'red');
    done.onclick = () => { editing.delete(t); rerender(); };
    const del = el('button', 'Retirar');
    del.onclick = () => { if (!confirm('Retirar a habilidade “' + (t.title || 'sem nome') + '”?')) return; state.traits.splice(i, 1); editing.delete(t); rerender(); };
    tools.append(done, del);
    card.append(tools);
    return card;
  }

  function habilidadesView() {
    const wrap = el('div');
    const bar = el('div', undefined, 'toolbar');
    bar.append(el('p', 'Talentos, traços e poderes passivos. Retire o que não vale mais.'));
    const add = el('button', '+ Habilidade');
    add.onclick = () => {
      const t = { title: 'Nova habilidade', category: 'TALENTO', text: '', uses: 0, usesMax: 0, reset: 'long' };
      state.traits.push(t); editing.add(t); rerender();
      archive.querySelector('.pr-trait:last-child input')?.select();
    };
    bar.append(add);
    const grid = el('div', undefined, 'ability-grid');
    state.traits.forEach((t, i) => grid.append(traitCard(t, i)));
    if (!state.traits.length) grid.append(el('p', 'Nenhuma habilidade registrada.', 'footnote'));
    wrap.append(bar, grid);
    return wrap;
  }

  function render() {
    const tabs = el('div', undefined, 'pr-tabs');
    tabs.setAttribute('role', 'tablist');
    for (const [k, label, n] of [['pericias', 'Perícias', SKILLS.length + state.customSkills.length], ['habilidades', 'Habilidades', state.traits.length]]) {
      const b = el('button', undefined, 'pr-tab');
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(tab === k));
      b.append(document.createTextNode(label + ' '), el('small', String(n)));
      b.onclick = () => { tab = k; openSkill = null; render(); };
      tabs.append(b);
    }
    archive.replaceChildren(tabs, tab === 'pericias' ? periciasView() : habilidadesView());
  }

  /* ---------- Cartão "Perícias & Treinamento" da Visão geral ---------- */
  const overviewCard = $('.lower-grid article:nth-child(2)');
  function renderOverview() {
    const chips = overviewCard.querySelector('.chips');
    chips.replaceChildren();
    allSkills().filter(sk => sk.level).forEach(sk => {
      const b = el('button', sk.name + ' ' + signed(bonusOf(sk)) + (sk.level === 2 ? ' ◆' : '') + ' ↗');
      b.dataset.skill = sk.name;
      b.onclick = () => window.rollSkill(sk.name);
      chips.append(b);
    });
    if (!chips.children.length) chips.append(el('span', 'Nenhuma perícia treinada.', 'footnote'));
    const detail = overviewCard.querySelector('.detail');
    detail.replaceChildren();
    state.training.split('\n').forEach((line, i) => { if (i) detail.append(el('br')); detail.append(document.createTextNode(line)); });
  }
  /* o atalho "Percepção" da mesa rola a perícia mesmo sem treino */
  document.querySelectorAll('.quick-rolls button').forEach(b => { if (b.textContent === 'Percepção') b.onclick = () => window.rollSkill('Percepção'); });

  /* atributos e proficiência mudam os bônus */
  document.addEventListener('change', e => {
    if (e.target.matches('#attributes input, #prof')) { renderOverview(); if (tab === 'pericias') render(); }
  });
  $('#prof').addEventListener('input', () => { renderOverview(); });

  /* descansos (arsenal.js) recarregam os usos */
  new MutationObserver(() => {
    const text = $('#saved').textContent;
    const short = /Descanso curto concluído/.test(text), long = /Descanso longo concluído/.test(text);
    if (!short && !long) return;
    let changed = false;
    state.traits.forEach(t => { if (t.uses && (t.reset === 'short' || (long && t.reset === 'long'))) { t.uses = 0; changed = true; } });
    /* salvar depois: outros observadores (inventory.js, grimorios.js) ainda vão ler a mensagem */
    if (changed) setTimeout(() => { save(); if (tab === 'habilidades') render(); });
  }).observe($('#saved'), { childList: true, characterData: true, subtree: true });

  render();
  renderOverview();
  save();
})();
