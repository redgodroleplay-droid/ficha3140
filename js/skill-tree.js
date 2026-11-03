(() => {
  const root = $('#progression');
  const headings = ['Disciplina', 'Lâmina', 'Selo de Shodhoruan', 'Personalizadas'];
  const defaultsByBranch = [
    [0, 1, 4, 6].map(index => abilities[index]),
    [2, 3, 5].map(index => abilities[index]),
    [['Manifestação', 'MARCADOR NARRATIVO', $('#besta .beast-panel p:nth-of-type(2)').textContent]],
    []
  ];
  let selection;
  let shownEntry;
  const map = el('div', undefined, 'skill-map');
  const inspector = el('article', undefined, 'card skill-inspector');
  inspector.setAttribute('aria-label', 'Detalhes da habilidade');
  inspector.hidden = true;
  root.append(map, inspector);
  const add = el('button', '+ Habilidade personalizada');
  add.onclick = () => {
    state.customAbilities.push({ title: 'Nova habilidade', category: 'PERSONALIZADA', text: '' });
    save();
    render(state.customAbilities.at(-1), true);
    inspector.querySelector('input')?.focus();
  };
  const actions = el('div', undefined, 'skill-editor-tools');
  actions.append(add);
  root.before(actions);

  function appendColoredText(parent, entry) {
    const marks = [...(entry.colors || [])].sort((a,b) => a.start - b.start);
    let position = 0;
    for (const mark of marks) {
      if (mark.start < position || mark.end > entry.text.length || !/^#[0-9a-f]{6}$/i.test(mark.color)) continue;
      parent.append(document.createTextNode(entry.text.slice(position, mark.start)));
      const span = el('span', entry.text.slice(mark.start, mark.end));
      span.style.color = mark.color;
      parent.append(span);
      position = mark.end;
    }
    parent.append(document.createTextNode(entry.text.slice(position)));
  }

  function show(item, editing = false) {
    inspector.hidden = false;
    root.classList.add('has-inspector');
    selection = item.key;
    shownEntry = item;
    map.querySelectorAll('.skill-node').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.skillKey === item.key));
    });
    const close = el('button', '×', 'skill-close');
    close.setAttribute('aria-label', 'Fechar detalhes da habilidade');
    close.onclick = () => {
      inspector.hidden = true;
      root.classList.remove('has-inspector');
      const active = map.querySelector('[aria-pressed="true"]');
      active?.setAttribute('aria-pressed', 'false');
      active?.focus();
      selection = undefined;
      shownEntry = undefined;
    };
    inspector.replaceChildren(close, el('p', item.branch, 'eyebrow'), el('h3', item.entry.title || 'Sem título'), el('p', item.badge, 'skill-badge'));
    if (item.required > state.level) inspector.append(el('p', 'Requer nível ' + item.required, 'skill-badge'));
    const preview = el('div', undefined, 'skill-description');
    appendColoredText(preview, item.entry);
    inspector.append(preview);
    for (const [key, label] of [['requirements','Requisitos'], ['cost','Custo'], ['range','Alcance'], ['damage','Dano'], ['status','Disponibilidade']]) {
      if (item.entry[key]) inspector.append(el('p', label + ' · ' + item.entry[key], 'skill-badge'));
    }
    if (!editing) {
      const edit = el('button', item.custom ? 'Editar habilidade e cores' : 'Colorir descrição');
      edit.onclick = () => show(item, true);
      inspector.append(edit);
      if (item.branch === headings[2]) {
        const link = el('button', 'Abrir ficha de Shodhoruan');
        link.onclick = () => openTab('besta');
        inspector.append(link);
      }
      return;
    }
    if (item.custom) {
      inspector.append(labeledField('Nome da habilidade', item.entry.title, value => { item.entry.title = value; save(); }));
      inspector.append(labeledField('Categoria', item.entry.category, value => { item.entry.category = value; save(); }));
    }
    const label = el('label', 'Selecione um trecho para aplicar a cor', 'editor-label');
    const editor = el('textarea');
    editor.readOnly = !item.custom;
    editor.value = item.entry.text;
    label.append(editor);
    const palette = el('input');
    palette.type = 'color';
    palette.value = '#f49b85';
    palette.setAttribute('aria-label', 'Cor do trecho');
    const apply = el('button', 'Aplicar cor');
    const clear = el('button', 'Limpar cores');
    const status = el('p', '', 'skill-badge');
    status.setAttribute('role', 'status');
    const controls = el('div', undefined, 'skill-editor-tools');
    const done = el('button', 'Concluir');
    controls.append(palette, apply, clear, done);
    inspector.append(label, controls, status);
    function update() {
      if (!item.custom && !state.skillNotes.includes(item.entry)) state.skillNotes.push(item.entry);
      preview.replaceChildren();
      appendColoredText(preview, item.entry);
      save();
    }
    editor.oninput = () => {
      const old = item.entry.text;
      const next = editor.value;
      let start = 0;
      while (start < old.length && start < next.length && old[start] === next[start]) start++;
      let end = old.length;
      let nextEnd = next.length;
      while (end > start && nextEnd > start && old[end - 1] === next[nextEnd - 1]) { end--; nextEnd--; }
      const shift = nextEnd - end;
      item.entry.colors = (item.entry.colors || []).flatMap(mark => {
        if (mark.end <= start) return [mark];
        if (mark.start >= end) return [{ ...mark, start: mark.start + shift, end: mark.end + shift }];
        return [];
      });
      item.entry.text = next;
      update();
    };
    apply.onclick = () => {
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      if (start === end) { status.textContent = 'Selecione um trecho primeiro.'; return; }
      item.entry.colors = (item.entry.colors || []).flatMap(mark => {
        if (mark.end <= start || mark.start >= end) return [mark];
        const remaining = [];
        if (mark.start < start) remaining.push({...mark, end: start});
        if (mark.end > end) remaining.push({...mark, start: end});
        return remaining;
      });
      item.entry.colors.push({ start, end, color: palette.value });
      status.textContent = 'Cor aplicada e salva.';
      update();
    };
    clear.onclick = () => { item.entry.colors = []; update(); status.textContent = 'Cores removidas.'; };
    done.onclick = () => render(item.entry);
  }

  function render(preferred, editing = false) {
    map.replaceChildren();
    const trunk = el('div', undefined, 'skill-trunk');
    trunk.innerHTML = '<svg viewBox="0 0 78 340" focusable="false"><circle cx="39" cy="306" r="27" fill="none" stroke="currentColor" stroke-dasharray="145 28" transform="rotate(-45 39 306)" opacity=".62"/><path d="M30 105L29 24Q29 14 39 14Q49 14 49 24L48 105M39 27l6 6-6 6-6-6zm0 18l6 6-6 6-6-6zm0 18l6 6-6 6-6-6zm0 18l6 6-6 6-6-6zM19 104Q39 100 59 104L59 111Q39 115 19 111ZM32 113L33 245Q34 276 40 305Q47 278 47 246L47 113M39 116V271" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/></svg>';
    trunk.setAttribute('aria-hidden', 'true');
    map.append(trunk);
    const items = [];
    headings.forEach((branch, branchIndex) => {
      const entries = branchIndex === 3
        ? state.customAbilities.map((entry, index) => ({entry, key:'custom-' + index, custom:true, badge:entry.category}))
        : defaultsByBranch[branchIndex].map(([title, badge, text]) => ({
          entry: state.skillNotes.find(entry => entry.title === title && entry.text === text) || {title,text},
          key: 'base-' + title, badge, required: badge === 'A PARTIR DO NÍVEL 2' ? 2 : 1
        }));
      if (!entries.length) return;
      const section = el('section', undefined, 'skill-branch');
      section.dataset.branch = branchIndex;
      section.append(el('h3', branch));
      const nodes = el('div', undefined, 'skill-branch-nodes');
      section.append(nodes);
      for (const item of entries) {
        item.branch = branch;
        items.push(item);
        const button = el('button', undefined, 'skill-node');
        const glyphs = {'Segredos da cidade':'歩','Mente afiada':'心','Alerta':'眼','Paranoico':'影','Armas brancas':'刀','Luta contra a desonra':'誉','Experiência oriental':'葉','Manifestação':'封'};
        const glyph = el('span', glyphs[item.entry.title] || '技', 'skill-orb');
        glyph.setAttribute('aria-hidden', 'true');
        button.append(glyph, el('span', item.entry.title || 'Sem título', 'skill-node-label'));
        button.setAttribute('aria-pressed', 'false');
        button.dataset.skillKey = item.key;
        button.classList.toggle('locked', item.required > state.level);
        button.onclick = () => {
          show(item);
          if (matchMedia('(max-width: 700px)').matches) inspector.scrollIntoView({block:'nearest'});
        };
        nodes.append(button);
      }
      map.append(section);
    });
    const next = items.find(item => item.entry === preferred) || items.find(item => item.key === selection);
    if (next) show(next, editing);
  }
  document.querySelector('[data-tab="skilltree"]').addEventListener('click', () => render(shownEntry?.entry));
  render();
})();
