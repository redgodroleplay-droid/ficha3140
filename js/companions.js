/* Relações com aparência (retrato + descrição) e área de Familiares. */
(() => {
  const IMG = /^(data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+|https:\/\/[^\s"'<>]+)$/;
  const validImage = v => (typeof v === 'string' && v.length < 900000 && IMG.test(v) ? v : '');
  const num = (v, d = 0) => (v !== '' && v !== null && Number.isFinite(Number(v)) ? Number(v) : d);
  const ATTRS = ['FOR', 'DES', 'CON', 'INT', 'SAB', 'CAR'];
  const FAM_STR = ['name', 'species', 'bond', 'speed', 'senses', 'attack', 'damage', 'abilities', 'appearance', 'image', 'notes'];

  /* ---------- Imagem: redimensiona para caber no localStorage ---------- */
  function pickImage(done) {
    const input = el('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp';
    input.onchange = () => {
      const file = input.files[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 420 / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        done(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => { URL.revokeObjectURL(url); alert('Não foi possível ler essa imagem.'); };
      img.src = url;
    };
    input.click();
  }

  function portrait(record, label, onChange) {
    const box = el('div', undefined, 'portrait-box');
    const frame = el('div', undefined, 'portrait-frame');
    const draw = () => {
      frame.replaceChildren();
      const src = validImage(record.image);
      if (src) {
        const img = el('img');
        img.src = src;
        img.alt = 'Retrato de ' + (record.title || record.name || label);
        img.loading = 'lazy';
        frame.append(img);
      } else frame.append(el('span', (record.title || record.name || '?').trim().charAt(0).toUpperCase() || '?', 'portrait-initial'));
      remove.hidden = !src;
    };
    const tools = el('div', undefined, 'portrait-tools');
    const upload = el('button', 'Enviar imagem');
    upload.type = 'button';
    upload.onclick = () => pickImage(data => { record.image = data; save(); draw(); onChange?.(); });
    const link = el('button', 'Usar link');
    link.type = 'button';
    link.onclick = () => {
      const url = prompt('Cole o link (https://) da imagem:', /^https:/.test(record.image || '') ? record.image : '');
      if (url === null) return;
      if (url && !validImage(url.trim())) return alert('Use um link https:// direto para a imagem.');
      record.image = url.trim(); save(); draw(); onChange?.();
    };
    const remove = el('button', 'Remover');
    remove.type = 'button';
    remove.onclick = () => { record.image = ''; save(); draw(); onChange?.(); };
    tools.append(upload, link, remove);
    box.append(frame, tools);
    draw();
    return box;
  }

  /* ---------- Relações: aparência ---------- */
  const baseRelations = renderRelations;
  renderRelations = function () {
    baseRelations();
    [...$('#relations').children].forEach((card, i) => {
      const relation = state.relations[i];
      if (!relation) return;
      card.classList.add('relation-card');
      const top = el('div', undefined, 'relation-top');
      top.append(portrait(relation, 'personagem'));
      const firstFields = el('div', undefined, 'relation-id');
      [...card.querySelectorAll(':scope > label')].slice(0, 3).forEach(f => firstFields.append(f));
      top.append(firstFields);
      card.prepend(top);
      const appearance = labeledField('Aparência', relation.appearance, v => { relation.appearance = v; save(); }, true);
      appearance.classList.add('appearance-field');
      top.after(appearance);
    });
  };

  /* ---------- Familiares ---------- */
  if (!Array.isArray(state.familiars)) {
    state.familiars = state.relations.filter(r => /familiar/i.test(r.category || '')).map(r => ({
      name: r.title, species: '', bond: r.history || '', hp: 0, maxhp: 0, ac: 0, speed: '', senses: '',
      attrs: [10, 10, 10, 10, 10, 10], attack: '', damage: '', abilities: '', appearance: r.appearance || '',
      image: r.image || '', notes: r.text || '', summoned: false
    }));
  }
  const previousExtend = window.extendBackup;
  window.extendBackup = (data, clean) => {
    previousExtend?.(data, clean);
    if (Array.isArray(clean.relations)) clean.relations.forEach(r => { if ('image' in r) r.image = validImage(r.image); });
    if (!Array.isArray(data.familiars)) return;
    clean.familiars = data.familiars.filter(f => f && typeof f === 'object').map(f => {
      const out = {};
      for (const k of FAM_STR) out[k] = typeof f[k] === 'string' ? f[k].slice(0, 30000) : '';
      out.image = validImage(out.image);
      for (const k of ['hp', 'maxhp', 'ac']) out[k] = Math.max(0, num(f[k]));
      out.attrs = Array.isArray(f.attrs) && f.attrs.length === 6 ? f.attrs.map(n => Math.min(30, Math.max(1, num(n, 10)))) : [10, 10, 10, 10, 10, 10];
      out.summoned = f.summoned === true;
      out.skills = Array.isArray(f.skills) ? f.skills.filter(s => s && typeof s === 'object').slice(0, 100).map(s => ({
        title: typeof s.title === 'string' ? s.title.slice(0, 200) : '',
        tag: typeof s.tag === 'string' ? s.tag.slice(0, 80) : '',
        text: typeof s.text === 'string' ? s.text.slice(0, 30000) : ''
      })) : [];
      return out;
    });
  };

  const section = el('section', undefined, 'familiar-area');
  section.innerHTML = '<div class="toolbar"><div><p class="eyebrow">使い魔 / FAMILIARES</p><h3>Familiares</h3></div><button type="button" id="add-familiar">+ Familiar</button></div><div id="familiars" class="familiar-grid"></div>';
  $('#relacoes .entity').after(section);
  const relationsHeading = el('div', undefined, 'relations-heading');
  relationsHeading.innerHTML = '<p class="eyebrow">関係 / RELAÇÕES</p><h3>Personagens</h3>';
  $('#add-relation').before(relationsHeading);

  function statInput(f, key, label, onChange) {
    const wrap = el('label', label, 'fam-stat');
    const input = el('input');
    input.type = 'number'; input.min = 0; input.value = f[key];
    input.oninput = () => { f[key] = Math.max(0, num(input.value)); save(); onChange?.(); };
    wrap.append(input);
    return wrap;
  }

  function familiarCard(f, i) {
    const card = el('article', undefined, 'card familiar-card');
    card.classList.toggle('summoned', f.summoned);
    const rerender = () => card.replaceWith(familiarCard(f, i));

    const head = el('div', undefined, 'familiar-head');
    head.append(portrait(f, 'familiar', () => {}));
    const id = el('div', undefined, 'familiar-id');
    const name = el('input', undefined, 'familiar-name');
    name.value = f.name; name.placeholder = 'Nome'; name.setAttribute('aria-label', 'Nome do familiar');
    name.oninput = () => { f.name = name.value; save(); };
    const species = el('input', undefined, 'familiar-species');
    species.value = f.species; species.placeholder = 'Espécie / tipo de criatura'; species.setAttribute('aria-label', 'Espécie');
    species.oninput = () => { f.species = species.value; save(); };
    const summon = el('button', f.summoned ? '◉ Invocado' : '○ Dispensado', 'summon-toggle');
    summon.setAttribute('aria-pressed', String(f.summoned));
    summon.onclick = () => { f.summoned = !f.summoned; save(); rerender(); };
    id.append(name, species, summon);
    head.append(id);

    /* vida */
    const vit = el('div', undefined, 'familiar-vitals');
    const bar = el('div', undefined, 'bar familiar-bar');
    const fill = el('i');
    bar.append(fill);
    const drawBar = () => {
      f.hp = Math.min(f.hp, f.maxhp || f.hp);
      fill.style.width = (f.maxhp ? Math.min(100, (f.hp / f.maxhp) * 100) : 0) + '%';
      hpCount.textContent = f.hp + ' / ' + f.maxhp + ' PV';
    };
    const hpCount = el('b', '', 'familiar-hp');
    const amount = el('input');
    amount.type = 'number'; amount.min = 1; amount.value = 1; amount.setAttribute('aria-label', 'Quantidade de dano ou cura do familiar');
    const hurt = el('button', 'Dano'), heal = el('button', 'Cura');
    hurt.onclick = () => { f.hp = Math.max(0, f.hp - Math.max(0, num(amount.value))); save(); syncInputs(); drawBar(); };
    heal.onclick = () => { f.hp = Math.min(f.maxhp, f.hp + Math.max(0, num(amount.value))); save(); syncInputs(); drawBar(); };
    const stats = el('div', undefined, 'familiar-stats');
    const hpIn = statInput(f, 'hp', 'PV', drawBar), maxIn = statInput(f, 'maxhp', 'PV máx.', drawBar), acIn = statInput(f, 'ac', 'CA');
    const syncInputs = () => { hpIn.querySelector('input').value = f.hp; };
    const speed = labeledField('Deslocamento', f.speed, v => { f.speed = v; save(); });
    speed.classList.add('fam-stat');
    stats.append(hpIn, maxIn, acIn, speed);
    const hpRow = el('div', undefined, 'familiar-hp-row');
    hpRow.append(hpCount, amount, hurt, heal);
    vit.append(bar, hpRow, stats);

    /* atributos */
    const attrs = el('div', undefined, 'familiar-attrs');
    f.attrs.forEach((value, k) => {
      const cell = el('div', undefined, 'fam-attr');
      const input = el('input');
      input.type = 'number'; input.min = 1; input.max = 30; input.value = value;
      input.setAttribute('aria-label', ATTRS[k] + ' do familiar');
      const btn = el('button', signed(mod(value)));
      btn.setAttribute('aria-label', 'Rolar ' + ATTRS[k] + ' do familiar');
      input.oninput = () => { f.attrs[k] = Math.min(30, Math.max(1, num(input.value, 10))); btn.textContent = signed(mod(f.attrs[k])); save(); };
      btn.onclick = () => roll((f.name || 'Familiar') + ' · ' + ATTRS[k], mod(f.attrs[k]));
      cell.append(el('span', ATTRS[k]), input, btn);
      attrs.append(cell);
    });

    /* combate */
    const combat = el('div', undefined, 'familiar-combat');
    const atk = labeledField('Ataque (bônus)', f.attack, v => { f.attack = v; save(); });
    const dmg = labeledField('Dano', f.damage, v => { f.damage = v; save(); });
    const atkBtn = el('button', '⚔ Ataque');
    atkBtn.onclick = () => window.rollExpr((f.name || 'Familiar') + ' · ataque', '1d20+' + (f.attack || '0').replace(/^\+/, ''));
    const dmgBtn = el('button', '✶ Dano');
    dmgBtn.onclick = () => {
      const expr = (String(f.damage).match(/\d*d\d+(?:\s*[+-]\s*\d+)*/i) || [])[0];
      if (!expr) return rollResult('Dano', '?', 'Escreva o dano com dados, ex.: 1d4+2.');
      window.rollExpr((f.name || 'Familiar') + ' · dano', expr);
    };
    const r1 = el('div', undefined, 'roll-field'); r1.append(atk, atkBtn);
    const r2 = el('div', undefined, 'roll-field'); r2.append(dmg, dmgBtn);
    combat.append(r1, r2);

    const texts = el('div', undefined, 'familiar-texts');
    const WIDE = ['appearance', 'abilities', 'bond'];
    for (const [key, label] of [['appearance', 'Aparência'], ['abilities', 'Traços & estatísticas'], ['bond', 'Vínculo com ' + (state.nickname || 'o portador')], ['senses', 'Sentidos & idiomas'], ['notes', 'Notas']]) {
      const field = labeledField(label, f[key], v => { f[key] = v; save(); }, key !== 'senses');
      if (WIDE.includes(key)) field.classList.add('fam-wide');
      const area = field.querySelector('textarea');
      if (area) autoGrow(area);
      texts.append(field);
    }
    const tools = el('div', undefined, 'toolbar');
    const del = el('button', 'Remover familiar');
    del.onclick = () => { if (!confirm('Remover o familiar “' + (f.name || '') + '”?')) return; state.familiars.splice(i, 1); save(); renderFamiliars(); };
    tools.append(del);

    card.append(head, vit, attrs, combat, skillsSection(f, rerender), texts, tools);
    drawBar();
    return card;
  }

  /* ---------- Subseção de habilidades do familiar ---------- */
  /* a caixa cresce com o texto, para fichas longas não ficarem espremidas */
  function autoGrow(area) {
    const grow = () => {
      if (!area.offsetWidth) return; /* aba ou cartão fechado: mede quando aparecer */
      area.style.height = 'auto'; area.style.height = area.scrollHeight + 2 + 'px';
    };
    area.addEventListener('input', grow);
    let lastWidth = 0;
    new ResizeObserver(() => { if (area.offsetWidth !== lastWidth) { lastWidth = area.offsetWidth; grow(); } }).observe(area);
  }

  /* Separa um bloco de texto livre em habilidades.
     Título = linha curta, sozinha após linha em branco, sem ponto final nem dois-pontos
     (ou iniciada por ⤷). Um título sem texto (ex.: "Ações") vira o tipo das seguintes.
     O que vier antes do primeiro título continua em "Traços & estatísticas". */
  function splitSkills(text) {
    const lines = String(text || '').replace(/\r/g, '').split('\n');
    const isTitle = (line, prev) => {
      const t = line.trim();
      if (!t) return false;
      if (/^⤷/.test(t)) return true;
      return t.length <= 40 && !/[.:,;!?]$/.test(t) && !t.includes(':') && !/\d+d\d+/i.test(t) && !(prev || '').trim();
    };
    const preamble = [], skills = [];
    let current = null, tag = '';
    lines.forEach((line, k) => {
      if (isTitle(line, lines[k - 1])) {
        if (current && !current.text.trim()) { tag = current.title; skills.pop(); }
        current = { title: line.trim().replace(/^⤷\s*/, ''), tag, text: '' };
        skills.push(current);
      } else if (current) current.text += line + '\n';
      else preamble.push(line);
    });
    if (current && !current.text.trim()) skills.pop();
    skills.forEach(s => { s.text = s.text.replace(/\n{3,}/g, '\n\n').trim(); });
    return { rest: preamble.join('\n').replace(/\n{3,}/g, '\n\n').trim(), skills };
  }

  function skillsSection(f, rerender) {
    if (!Array.isArray(f.skills)) f.skills = [];
    const box = el('section', undefined, 'fam-skills');
    const header = el('div', undefined, 'fam-skills-head');
    const titleWrap = el('div');
    titleWrap.append(el('p', '技 / HABILIDADES', 'eyebrow'), el('h4', 'Habilidades (' + f.skills.length + ')'));
    const actions = el('div', undefined, 'fam-skills-actions');
    if (!f.skills.length && f.abilities.trim()) {
      const split = el('button', 'Separar do texto');
      split.type = 'button';
      split.title = 'Transforma os títulos do texto de traços em cartões de habilidade';
      split.onclick = () => {
        const { rest, skills } = splitSkills(f.abilities);
        if (!skills.length) return alert('Não encontrei títulos no texto. Use “+ Habilidade”.');
        if (!confirm('Criar ' + skills.length + ' habilidades (' + skills.map(s => s.title).join(', ') + ')?\nO restante continua em “Traços & estatísticas”.')) return;
        f.skills = skills; f.abilities = rest; save(); rerender();
      };
      actions.append(split);
    }
    const toggle = el('button', 'Abrir todas');
    toggle.type = 'button';
    toggle.hidden = f.skills.length < 2;
    toggle.onclick = () => {
      const all = [...list.querySelectorAll('details')];
      const open = all.some(d => !d.open);
      all.forEach(d => { d.open = open; });
      toggle.textContent = open ? 'Fechar todas' : 'Abrir todas';
    };
    const add = el('button', '+ Habilidade');
    add.type = 'button';
    add.onclick = () => { f.skills.push({ title: 'Nova habilidade', tag: '', text: '' }); save(); rerender(); };
    actions.append(toggle, add);
    header.append(titleWrap, actions);

    const list = el('div', undefined, 'fam-skill-list');
    if (!f.skills.length) list.append(el('p', 'Nenhuma habilidade separada ainda.', 'footnote'));
    f.skills.forEach((s, k) => {
      const item = el('details', undefined, 'fam-skill');
      const summary = el('summary');
      const sTitle = el('b', s.title || 'Sem nome');
      const sTag = el('span', s.tag || '', 'fam-skill-tag');
      sTag.hidden = !s.tag;
      summary.append(sTitle, sTag);
      const body = el('div', undefined, 'fam-skill-body');
      const row = el('div', undefined, 'fam-skill-row');
      row.append(
        labeledField('Nome', s.title, v => { s.title = v; sTitle.textContent = v || 'Sem nome'; save(); }),
        labeledField('Tipo', s.tag, v => { s.tag = v; sTag.textContent = v; sTag.hidden = !v; save(); })
      );
      row.lastChild.querySelector('input').placeholder = 'Ação, Reação, Passiva…';
      const desc = labeledField('Descrição', s.text, v => { s.text = v; save(); }, true);
      autoGrow(desc.querySelector('textarea'));
      const tools = el('div', undefined, 'fam-skill-tools');
      const up = el('button', '↑'), down = el('button', '↓'), del = el('button', 'Remover');
      up.type = down.type = del.type = 'button';
      up.setAttribute('aria-label', 'Mover para cima'); down.setAttribute('aria-label', 'Mover para baixo');
      up.disabled = k === 0; down.disabled = k === f.skills.length - 1;
      const move = d => { [f.skills[k], f.skills[k + d]] = [f.skills[k + d], f.skills[k]]; save(); rerender(); };
      up.onclick = () => move(-1); down.onclick = () => move(1);
      del.onclick = () => { if (!confirm('Remover a habilidade “' + (s.title || '') + '”?')) return; f.skills.splice(k, 1); save(); rerender(); };
      tools.append(up, down, del);
      body.append(row, desc, tools);
      item.append(summary, body);
      list.append(item);
    });
    box.append(header, list);
    return box;
  }

  function renderFamiliars() {
    const root = $('#familiars');
    root.replaceChildren();
    if (!state.familiars.length) root.append(el('p', 'Nenhum familiar registrado.', 'footnote'));
    state.familiars.forEach((f, i) => root.append(familiarCard(f, i)));
  }
  $('#add-familiar').onclick = () => {
    state.familiars.push({ name: 'Novo familiar', species: '', bond: '', hp: 0, maxhp: 0, ac: 10, speed: '', senses: '', attrs: [10, 10, 10, 10, 10, 10], attack: '', damage: '', abilities: '', appearance: '', image: '', notes: '', summoned: false, skills: [] });
    save(); renderFamiliars();
    $('#familiars .familiar-card:last-child .familiar-name')?.select();
  };

  renderRelations();
  renderFamiliars();
  save();
})();
