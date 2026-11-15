/* Títulos: conquistas nomeadas com raridade, benefícios e juramento.
   Títulos marcados como ativos aparecem na identidade e no estandarte. */
(() => {
  const RARITIES = [
    ['Comum', '#a39684'], ['Incomum', '#6fbf73'], ['Raro', '#5b9cff'],
    ['Épico', '#b45cff'], ['Lendário', '#e8a23c'], ['Mítico', '#ff4d6d']
  ];
  const rarityColor = r => (RARITIES.find(([name]) => name === r) || RARITIES[0])[1];
  const STR_KEYS = ['name', 'rarity', 'type', 'duration', 'category', 'origin', 'benefits', 'oath', 'notes'];
  const blank = () => ({ name: 'Novo título', rarity: 'Raro', type: 'Título de Conquista', duration: 'Permanente', category: '', origin: '', benefits: '', oath: '', notes: '', active: false });

  /* Semente: aproveita o tópico "Cavaleiro da Távola Redonda", se existir (o tópico continua lá). */
  function seed() {
    const topic = state.topics.find(t => /cavaleiro da t[aá]vola redonda/i.test(t.title));
    if (!topic) return [];
    const text = topic.text;
    const pick = re => (text.match(re) || [])[1]?.trim() || '';
    const oathStart = text.search(/JURAMENTO DA T[AÁ]VOLA/i);
    const infoEnd = text.search(/^I\. /m);
    return [{
      name: 'Cavaleiro da Távola Redonda',
      rarity: pick(/Raridade:\s*(.+)/i) || 'Lendário',
      type: pick(/Tipo:\s*(.+)/i) || 'Título de Conquista',
      duration: pick(/Dura[cç][aã]o:\s*(.+)/i) || 'Permanente',
      category: pick(/Categoria:\s*(.+)/i),
      origin: '',
      benefits: (infoEnd >= 0 ? text.slice(infoEnd, oathStart >= 0 ? oathStart : undefined) : text).trim(),
      oath: oathStart >= 0 ? text.slice(oathStart).replace(/^JURAMENTO DA T[AÁ]VOLA REDONDA\s*/i, '').trim() : '',
      notes: 'Importado do tópico "' + topic.title + '".',
      active: true
    }];
  }
  if (!Array.isArray(state.titles)) state.titles = seed();

  const previousExtend = window.extendBackup;
  window.extendBackup = (data, clean) => {
    previousExtend?.(data, clean);
    if (!Array.isArray(data.titles)) return;
    clean.titles = data.titles.filter(t => t && typeof t === 'object').map(t => {
      const out = { active: t.active === true };
      for (const k of STR_KEYS) out[k] = typeof t[k] === 'string' ? t[k].slice(0, 30000) : '';
      return out;
    });
  };

  Object.assign(titles, { titulos: ['称号 / TÍTULOS', 'Títulos conquistados'] });
  const editing = new Set();

  function syncActive() {
    const tags = $('.identity-tags');
    tags.querySelectorAll('.title-tag').forEach(t => t.remove());
    const active = state.titles.filter(t => t.active);
    active.forEach(t => {
      const tag = el('span', '❖ ' + (t.name || 'Título'), 'title-tag');
      tag.style.setProperty('--rarity', rarityColor(t.rarity));
      tag.title = t.rarity + ' · ' + t.type;
      tags.append(tag); // append: codex.js usa os dois primeiros filhos para raça e classe
    });
    let crest = $('.crest-title');
    if (!crest) { crest = el('em', '', 'crest-title'); $('.crest-cloth strong').after(crest); }
    crest.textContent = active[0]?.name || '';
    crest.hidden = !active.length;
  }

  function paragraphs(parent, text, cls) {
    const box = el('div', undefined, cls);
    String(text || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).forEach(p => {
      if (/^[IVX]+\.\s/.test(p) || (/^[^a-z]{4,60}$/.test(p.split('\n')[0]) && p.split('\n')[0] === p.split('\n')[0].toUpperCase())) {
        const [head, ...rest] = p.split('\n');
        box.append(el('h4', head));
        if (rest.length) box.append(el('p', rest.join('\n')));
      } else box.append(el('p', p));
    });
    parent.append(box);
  }

  function field(t, key, label, multiline) {
    return labeledField(label, t[key], v => { t[key] = v; save(); if (key === 'name') syncActive(); }, multiline);
  }

  function titleCard(t, i) {
    const card = el('article', undefined, 'card title-card');
    card.style.setProperty('--rarity', rarityColor(t.rarity));
    card.classList.toggle('active-title', t.active);
    const rerender = () => card.replaceWith(titleCard(t, i));

    const ribbon = el('div', undefined, 'title-ribbon');
    ribbon.append(el('span', (t.rarity || 'Comum').toUpperCase()), el('span', t.type || ''));
    const head = el('header', undefined, 'title-head');
    const emblem = el('span', '❖', 'title-emblem');
    emblem.setAttribute('aria-hidden', 'true');
    const name = el('h3', t.name || 'Sem título');
    const toggle = el('button', t.active ? '◉ Título ativo' : '○ Ativar título', 'title-toggle');
    toggle.setAttribute('aria-pressed', String(t.active));
    toggle.onclick = () => { t.active = !t.active; save(); syncActive(); rerender(); };
    head.append(emblem, name, toggle);
    card.append(ribbon, head);

    if (!editing.has(t)) {
      const chips = el('div', undefined, 'title-chips');
      for (const [k, label] of [['duration', 'Duração'], ['category', 'Categoria'], ['origin', 'Origem']]) {
        if (t[k]) chips.append(el('span', label + ' · ' + t[k]));
      }
      if (chips.childElementCount) card.append(chips);
      if (t.benefits) paragraphs(card, t.benefits, 'title-benefits');
      else card.append(el('p', 'Sem benefícios registrados.', 'footnote'));
      if (t.oath) {
        const oath = el('blockquote', undefined, 'title-oath');
        oath.append(el('span', 'JURAMENTO', 'eyebrow'), el('p', t.oath));
        card.append(oath);
      }
      if (t.notes) card.append(el('p', t.notes, 'footnote'));
      const tools = el('div', undefined, 'toolbar title-tools');
      const edit = el('button', 'Editar título');
      edit.onclick = () => { editing.add(t); rerender(); $('#title-list').children[i]?.querySelector('input')?.focus(); };
      tools.append(edit);
      card.append(tools);
      return card;
    }

    const form = el('div', undefined, 'title-form');
    const raritySel = el('select');
    RARITIES.forEach(([r]) => raritySel.append(el('option', r)));
    if (t.rarity && !RARITIES.some(([r]) => r === t.rarity)) raritySel.append(el('option', t.rarity));
    raritySel.value = t.rarity || 'Comum';
    raritySel.onchange = () => { t.rarity = raritySel.value; card.style.setProperty('--rarity', rarityColor(t.rarity)); ribbon.firstChild.textContent = t.rarity.toUpperCase(); save(); syncActive(); };
    const rarityLabel = el('label', 'Raridade', 'editor-label');
    rarityLabel.append(raritySel);
    const grid = el('div', undefined, 'title-form-grid');
    grid.append(field(t, 'name', 'Nome do título'), rarityLabel, field(t, 'type', 'Tipo'), field(t, 'duration', 'Duração'), field(t, 'category', 'Categoria'), field(t, 'origin', 'Como foi conquistado'));
    form.append(grid, field(t, 'benefits', 'Benefícios (linha em branco separa blocos; "I. Nome" vira subtítulo)', true), field(t, 'oath', 'Juramento / citação', true), field(t, 'notes', 'Notas', true));
    const tools = el('div', undefined, 'toolbar title-tools');
    const done = el('button', 'Concluir edição', 'red');
    done.onclick = () => { editing.delete(t); rerender(); syncActive(); };
    const del = el('button', 'Excluir título');
    del.onclick = () => { if (!confirm('Excluir o título “' + (t.name || '') + '”?')) return; editing.delete(t); state.titles.splice(i, 1); save(); render(); };
    tools.append(done, del);
    card.append(form, tools);
    return card;
  }

  function render() {
    const root = $('#title-list');
    root.replaceChildren();
    if (!state.titles.length) root.append(el('p', 'Nenhum título conquistado ainda.', 'footnote'));
    state.titles.forEach((t, i) => root.append(titleCard(t, i)));
    syncActive();
  }
  $('#add-title').onclick = () => {
    const t = blank();
    state.titles.push(t);
    editing.add(t);
    save(); render();
    $('#title-list .title-card:last-child input')?.select();
  };

  render();
  save();
})();
