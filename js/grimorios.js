/* =========================================================
   Grimórios (aba 魔書), no mesmo espírito da ficha do Bedivere.
   Cada grimório tem atributo de conjuração (CD e ataque mágico calculados),
   característica especial, um contador opcional (ex.: Marcas de Corte) e
   magias por círculo. Conjurar gasta mana (window.spendMana, de arsenal.js);
   os dados citados no texto da magia viram botões de rolagem.
   Tudo em state.grimoires e no backup JSON via window.extendBackup.
   ========================================================= */
(() => {
  const int = (v, d = 0) => { const n = Math.floor(Number(String(v ?? '').replace(',', '.'))); return Number.isFinite(n) ? n : d; };
  const clampN = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const str = (v, max = 20000) => (typeof v === 'string' ? v.slice(0, max) : '');
  const G_STR = ['name', 'kind', 'magicAttr', 'damageType', 'description', 'special', 'counterName', 'notes'];
  const S_STR = ['name', 'circle', 'school', 'time', 'range', 'duration', 'text', 'notes'];

  /* ---------- Regras da mesa: Sistema de PM e Sobrecarga Arcana ---------- */
  const PM_BY_LEVEL = [4, 6, 14, 17, 27, 32, 38, 44, 57, 64, 73, 73, 83, 83, 94, 94, 107, 114, 123, 133];
  const COST_BY_CIRCLE = [2, 3, 4, 6, 8, 9, 11, 12, 20, 23, 26, 28, 31, 34, 37, 41]; // índice 0 = truque
  const FORCE = [['', 'Sem forçar'], ['potencia', 'Potência (+2 dados de dano/cura)'], ['precisao', 'Precisão (+2 na CD)'], ['penetracao', 'Penetração (ignora resistência)'], ['estabilidade', 'Estabilidade (+3 no teste)']];
  const circleNum = s => (/truque/i.test(s.circle || '') ? 0 : String(s.circle ?? '').trim() ? int(s.circle, NaN) : NaN);
  const tableCost = n => (Number.isInteger(n) && n >= 0 && n < COST_BY_CIRCLE.length ? COST_BY_CIRCLE[n] : null);
  const effCost = s => (int(s.cost) > 0 ? int(s.cost) : tableCost(circleNum(s)) ?? 0);
  const pmForLevel = () => PM_BY_LEVEL[clampN(int(state.level, 1), 1, 20) - 1];
  const rollD6s = n => { let t = 0; const r = []; for (let i = 0; i < n; i++) { const d = die(6); r.push(d); t += d; } return { t, r }; };

  const blankSpell = () => ({ name: 'Nova magia', circle: '1', school: '', cost: 0, time: '1 ação', range: '', duration: 'Instantânea', text: '', notes: '' });
  const blankGrimoire = () => ({ name: 'Novo grimório', kind: '', magicAttr: '', castAttr: 3, damageType: '', description: '', special: '', counterName: '', counterMax: 0, counter: 0, notes: '', spells: [] });

  function seed() {
    return [{
      name: 'Grimório dos Cortes',
      kind: 'Grimório Arcano — Magia de Corte',
      magicAttr: 'Corte',
      castAttr: 3,
      damageType: 'Cortante mágico, salvo indicação contrária.',
      description: 'Este grimório é especializado em cortes mágicos, lâminas invisíveis, ataques sucessivos e adaptação às defesas inimigas.\n\nSua principal característica é a capacidade de criar lâminas que se tornam progressivamente mais afiadas à medida que enfrentam um adversário. Quanto mais o combate se prolonga, mais perigosos se tornam seus cortes.',
      special: 'Adaptação Cortante\nSempre que uma criatura sofrer dano de uma magia deste grimório, você poderá acumular uma Marca de Corte nela, até o máximo de três marcas. As marcas permanecem por 1 minuto, e você só pode aplicar uma marca por turno em cada criatura.\n\n1 marca: seus cortes ignoram resistência a dano cortante dessa criatura.\n2 marcas: seus ataques mágicos de corte recebem +1 nas jogadas de ataque contra ela.\n3 marcas: uma vez por turno, quando atingir essa criatura com uma magia de corte, causa 1d6 de dano cortante adicional.\n\nAs marcas desaparecem quando a criatura chega a 0 PV ou quando sua duração termina.',
      counterName: 'Marcas de Corte no alvo',
      counterMax: 3,
      counter: 0,
      notes: '',
      spells: [
        { name: 'Foice Cortante', circle: '1', school: 'Evocação', cost: 3, time: '1 ação', range: '18 metros', duration: 'Instantânea',
          text: 'Você manifesta uma lâmina curva de energia cortante e a dispara contra um adversário.\n\nRealize um ataque mágico à distância. Em um acerto, o alvo sofre 3d8 de dano cortante.\n\nCorte Profundo. Se o alvo já possuir pelo menos uma Marca de Corte, você poderá empurrá-lo 1,5 metro em qualquer direção horizontal.', notes: '' },
        { name: 'Lâminas do Estripador', circle: '1', school: 'Transmutação', cost: 3, time: '1 ação bônus', range: 'Pessoal', duration: '1 minuto (Concentração)',
          text: 'Você manifesta lâminas serrilhadas sobre seus antebraços, semelhantes a foices monstruosas. Enquanto a magia estiver ativa:\n\nArmamento Cortante. Você pode utilizar suas lâminas como armas corpo a corpo mágicas, com alcance de 1,5 metro, causando 1d8 de dano cortante e utilizando Inteligência nas jogadas de ataque e dano.\n\nFio Afiado. Uma vez por turno, quando atingir uma criatura com essas lâminas, causa 1d6 de dano cortante adicional.', notes: '' },
        { name: 'Corte Crescente', circle: '2', school: 'Evocação', cost: 5, time: '1 ação', range: 'Pessoal (linha de 12 metros)', duration: 'Instantânea',
          text: 'Você realiza um movimento cortante que projeta uma enorme lâmina de energia em linha reta.\n\nCada criatura em uma linha de 12 metros de comprimento e 1,5 metro de largura deve realizar uma salvaguarda de Destreza.\n\nFalha: sofre 4d8 de dano cortante.\nSucesso: sofre metade do dano.', notes: '' },
        { name: 'Retaliação Serrilhada', circle: '2', school: 'Abjuração', cost: 5, time: '1 reação, quando uma criatura atingir você com um ataque', range: '9 metros', duration: 'Instantânea',
          text: 'Você manifesta uma lâmina serrilhada que intercepta parcialmente o golpe recebido.\n\nReduza o dano do ataque em 2d8 + seu modificador de Inteligência.\n\nSe o atacante estiver ao alcance da magia, poderá realizar um ataque mágico contra ele. Em um acerto, causa 2d6 de dano cortante.', notes: '' },
        { name: 'Magia sem nome', circle: '', school: '', cost: 0, time: '1 ação bônus', range: 'Pessoal', duration: '4 turnos (Concentração)',
          text: 'Você manifesta quatro lâminas serrilhadas flutuantes ao redor do corpo. Enquanto a magia estiver ativa:\n\nAssalto Cortante. Uma vez por turno, quando realizar a ação de Ataque, você poderá realizar um ataque adicional com uma lâmina flutuante, utilizando seu modificador de ataque mágico. O ataque possui alcance de 3 metros e causa 2d6 + Inteligência de dano cortante.\n\nDefesa Serrilhada. Como reação, quando uma criatura atingir você com um ataque corpo a corpo, poderá reduzir o dano recebido em 1d10 + Inteligência.\n\nAlcance Estendido. Seus ataques corpo a corpo com as lâminas flutuantes possuem alcance de 3 metros.',
          notes: 'O texto colado não trazia nome, círculo, escola nem custo em PM desta magia. Preencha em Editar.' }
      ]
    }];
  }
  if (!Array.isArray(state.grimoires)) state.grimoires = seed();
  if (!Number.isInteger(state.grimoireActive)) state.grimoireActive = 0;
  if (!Number.isInteger(state.overload) || state.overload < 0) state.overload = 0;
  if (!Number.isInteger(state.maxCircle) || state.maxCircle < 0) state.maxCircle = 0; // 0 = sem limite marcado
  if (typeof state.dissipateUsed !== 'boolean') state.dissipateUsed = false;
  if (typeof state.conSaveProf !== 'boolean') state.conSaveProf = /constitui/i.test(state.training || $('.lower-grid .detail')?.textContent || '');

  const previousExtend = window.extendBackup;
  window.extendBackup = (data, clean) => {
    previousExtend?.(data, clean);
    if (Number.isInteger(data.overload) && data.overload >= 0) clean.overload = Math.min(data.overload, 999);
    if (Number.isInteger(data.maxCircle)) clean.maxCircle = clampN(data.maxCircle, 0, 15);
    for (const k of ['dissipateUsed', 'conSaveProf']) if (typeof data[k] === 'boolean') clean[k] = data[k];
    if (!Array.isArray(data.grimoires)) return;
    clean.grimoires = data.grimoires.filter(g => g && typeof g === 'object').map(g => {
      const out = { castAttr: clampN(int(g.castAttr, 3), 0, 5), counterMax: clampN(int(g.counterMax), 0, 20), counter: clampN(int(g.counter), 0, 20) };
      for (const k of G_STR) out[k] = str(g[k]);
      out.spells = (Array.isArray(g.spells) ? g.spells : []).filter(s => s && typeof s === 'object').map(s => {
        const sp = { cost: clampN(int(s.cost), 0, 999) };
        for (const k of S_STR) sp[k] = str(s[k]);
        return sp;
      });
      return out;
    });
    if (Number.isInteger(data.grimoireActive)) clean.grimoireActive = data.grimoireActive;
  };

  Object.assign(titles, { grimorios: ['魔書 / GRIMÓRIOS', 'Grimórios'] });

  const root = $('#grimoire-list');
  let query = '';
  let editHead = false;
  const editing = new Set();

  const castMod = g => mod(state.attrs[g.castAttr ?? 3]);
  const spellDC = g => 8 + Number(state.prof) + castMod(g);
  const spellAtk = g => Number(state.prof) + castMod(g);

  /* "3d8", "2d8 + seu modificador de Inteligência", "2d6 + Inteligência" */
  function diceIn(g, text) {
    const re = /(\d+)\s*d\s*(\d+)(\s*\+\s*(?:o |seu )?(?:modificador de )?(Força|Destreza|Constituição|Inteligência|Sabedoria|Carisma))?/gi;
    const found = new Map();
    let m;
    while ((m = re.exec(text))) {
      const attr = m[4] ? attrNames.findIndex(a => a.toLowerCase() === m[4].toLowerCase()) : -1;
      const label = m[1] + 'd' + m[2] + (attr >= 0 ? '+' + ['FOR', 'DES', 'CON', 'INT', 'SAB', 'CAR'][attr] : '');
      if (!found.has(label)) found.set(label, { count: Number(m[1]), sides: Number(m[2]), attr });
    }
    return [...found.entries()].slice(0, 6);
  }
  function rollDice(title, { count, sides, attr }) {
    const results = Array.from({ length: Math.min(count, 100) }, () => die(sides));
    const bonus = attr >= 0 ? mod(state.attrs[attr]) : 0;
    const total = results.reduce((a, b) => a + b, 0) + bonus;
    rollResult(title, total, count + 'd' + sides + ' [' + results.join(', ') + ']' + (attr >= 0 ? ' ' + signed(bonus) + ' ' + ['FOR', 'DES', 'CON', 'INT', 'SAB', 'CAR'][attr] : '') + ' = ' + total);
  }

  function paragraphs(text) {
    const box = el('div', undefined, 'gm-text');
    String(text || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).forEach(p => {
      const para = el('p');
      const m = p.match(/^([^.\n:]{2,40}[.:])\s/);
      if (m && m[1].trim().split(/\s+/).length <= 4) { para.append(el('strong', m[1]), document.createTextNode(p.slice(m[1].length))); }
      else para.textContent = p;
      box.append(para);
    });
    return box;
  }

  function attrSelect(g, onchange) {
    const lab = el('label', 'Atributo de conjuração', 'editor-label');
    const sel = el('select');
    attrNames.forEach((a, i) => { const o = el('option', a); o.value = i; sel.append(o); });
    sel.value = g.castAttr ?? 3;
    sel.onchange = () => { g.castAttr = Number(sel.value); save(); onchange(); };
    lab.append(sel);
    return lab;
  }

  function header(g, gi) {
    const card = el('article', undefined, 'card gm-head');
    const top = el('div', undefined, 'gm-head-top');
    const seal = el('span', '魔', 'gm-seal');
    seal.setAttribute('aria-hidden', 'true');
    const names = el('div');
    names.append(el('p', (g.kind || 'GRIMÓRIO').toUpperCase(), 'eyebrow'), el('h3', g.name || 'Sem nome'));
    top.append(seal, names);
    card.append(top);

    const stats = el('div', undefined, 'gm-stats');
    const atk = el('button', undefined, 'gm-stat');
    atk.append(el('small', 'ATAQUE MÁGICO'), el('b', signed(spellAtk(g))));
    atk.setAttribute('aria-label', 'Rolar ataque mágico ' + signed(spellAtk(g)));
    atk.onclick = () => roll('Ataque mágico · ' + (g.name || 'grimório'), spellAtk(g));
    const dc = el('div', undefined, 'gm-stat');
    dc.append(el('small', 'CD DAS MAGIAS'), el('b', String(spellDC(g))));
    const at = el('div', undefined, 'gm-stat');
    at.append(el('small', 'CONJURAÇÃO'), el('b', attrNames[g.castAttr ?? 3]));
    stats.append(atk, dc, at);
    if (g.magicAttr) { const ma = el('div', undefined, 'gm-stat'); ma.append(el('small', 'ATRIBUTO MÁGICO'), el('b', g.magicAttr)); stats.append(ma); }
    card.append(stats);
    card.append(el('p', 'CD = 8 + proficiência ' + signed(Number(state.prof)) + ' + ' + attrNames[g.castAttr ?? 3] + ' ' + signed(castMod(g)) + (g.damageType ? ' · Dano: ' + g.damageType : ''), 'footnote'));

    if (g.counterMax > 0) {
      const counter = el('div', undefined, 'gm-counter');
      counter.append(el('span', g.counterName || 'Contador'));
      const pips = el('div', undefined, 'gm-pips');
      for (let n = 1; n <= g.counterMax; n++) {
        const b = el('button', '', n <= g.counter ? 'on' : '');
        b.type = 'button';
        b.setAttribute('aria-label', (g.counterName || 'Contador') + ': ' + n);
        b.setAttribute('aria-pressed', String(n <= g.counter));
        b.onclick = () => { g.counter = g.counter === n ? n - 1 : n; save(); render(); };
        pips.append(b);
      }
      const clear = el('button', 'Zerar');
      clear.onclick = () => { g.counter = 0; save(); render(); };
      counter.append(pips, el('b', g.counter + ' / ' + g.counterMax), clear);
      card.append(counter);
    }

    if (!editHead) {
      if (g.description) card.append(paragraphs(g.description));
      if (g.special) {
        const sp = el('div', undefined, 'gm-special');
        const [first, ...rest] = g.special.split('\n');
        sp.append(el('span', 'CARACTERÍSTICA ESPECIAL', 'eyebrow'), el('h4', first), paragraphs(rest.join('\n')));
        card.append(sp);
      }
      if (g.notes) card.append(el('p', g.notes, 'footnote'));
      const tools = el('div', undefined, 'toolbar');
      const edit = el('button', 'Editar grimório');
      edit.onclick = () => { editHead = true; render(); root.querySelector('.gm-head input')?.focus(); };
      tools.append(edit);
      card.append(tools);
      return card;
    }
    const form = el('div', undefined, 'gm-form');
    const f = (k, label, multi) => labeledField(label, g[k], v => { g[k] = v; save(); if (k === 'name') renderPicker(); }, multi);
    const numField = (k, label) => {
      const lab = el('label', label, 'editor-label');
      const input = el('input'); input.type = 'number'; input.min = 0; input.max = 20; input.value = g[k] || 0;
      input.onchange = () => { g[k] = clampN(int(input.value), 0, 20); g.counter = Math.min(g.counter, g.counterMax); save(); };
      lab.append(input); return lab;
    };
    const grid = el('div', undefined, 'gm-form-grid');
    grid.append(f('name', 'Nome'), f('kind', 'Tipo (ex.: Grimório Arcano — Magia de Corte)'), f('magicAttr', 'Atributo mágico'), attrSelect(g, () => {}), f('damageType', 'Tipo de dano'), f('counterName', 'Nome do contador (opcional)'), numField('counterMax', 'Máximo do contador (0 = sem)'));
    form.append(grid, f('description', 'Descrição', true), f('special', 'Característica especial (1ª linha = nome)', true), f('notes', 'Notas', true));
    const tools = el('div', undefined, 'toolbar');
    const done = el('button', 'Concluir edição', 'red');
    done.onclick = () => { editHead = false; render(); };
    const del = el('button', 'Excluir grimório');
    del.onclick = () => {
      if (!confirm('Excluir o grimório “' + (g.name || 'sem nome') + '” e todas as suas magias?')) return;
      state.grimoires.splice(gi, 1);
      state.grimoireActive = Math.max(0, gi - 1);
      editHead = false; save(); render();
    };
    tools.append(done, del);
    card.append(form, tools);
    return card;
  }

  function spellCard(g, s, si) {
    const card = el('article', undefined, 'card gm-spell');
    const top = el('div', undefined, 'gm-spell-top');
    top.append(el('h4', s.name || 'Sem nome'));
    const cost = effCost(s), table = tableCost(circleNum(s));
    if (cost) top.append(el('span', cost + ' PM', 'gm-cost'));
    card.append(el('p', [s.school, s.circle ? s.circle + 'º círculo' : ''].filter(Boolean).join(' · ').toUpperCase() || 'MAGIA', 'eyebrow'), top);
    if (!editing.has(s)) {
      const meta = el('dl', undefined, 'gm-meta');
      for (const [k, label] of [['time', 'Conjuração'], ['range', 'Alcance'], ['duration', 'Duração']]) {
        if (s[k]) meta.append(el('dt', label), el('dd', s[k]));
      }
      card.append(meta, paragraphs(s.text));
      if (s.notes) card.append(el('p', s.notes, 'footnote gm-note'));
      if (int(s.cost) > 0 && table !== null && int(s.cost) !== table) card.append(el('p', 'Pela tabela da mesa, ' + (circleNum(s) ? circleNum(s) + 'º círculo' : 'truque') + ' custa ' + table + ' PM; esta magia está com ' + s.cost + ' PM. Para usar a tabela, deixe o custo em 0 em Editar.', 'footnote gm-note'));
      const n = circleNum(s);
      const actions = el('div', undefined, 'gm-actions');
      const status = el('span', '', 'gm-status');
      status.setAttribute('role', 'status');
      let force = null;
      if (n >= 5) {
        force = el('select', undefined, 'gm-force');
        force.setAttribute('aria-label', 'Conjuração forçada');
        FORCE.forEach(([v, l]) => { const o = el('option', v ? l + ' · +' + Math.ceil(cost / 2) + ' PM' : l); o.value = v; force.append(o); });
      }
      const cast = el('button', 'Conjurar' + (cost ? ' · −' + cost + ' PM' : ''), 'red');
      cast.dataset.manaCost = cost;
      cast.onclick = () => { status.textContent = castSpell(g, s, force?.value || ''); };
      if (force) force.onchange = () => { const extra = force.value ? Math.ceil(cost / 2) : 0; cast.textContent = 'Conjurar · −' + (cost + extra) + ' PM'; cast.dataset.manaCost = cost + extra; };
      if (force) actions.append(force);
      actions.append(cast);
      if (/ataque mágico/i.test(s.text)) {
        const a = el('button', 'Ataque ' + signed(spellAtk(g)));
        a.onclick = () => roll('Ataque mágico · ' + s.name, spellAtk(g));
        actions.append(a);
      }
      if (/salvaguarda|resistência de/i.test(s.text)) actions.append(el('span', 'CD ' + spellDC(g), 'gm-dc'));
      for (const [label, dice] of diceIn(g, s.text)) {
        const b = el('button', '⚄ ' + label);
        b.onclick = () => rollDice(s.name + ' · ' + label, dice);
        actions.append(b);
      }
      actions.append(status);
      card.append(actions);
      const tools = el('div', undefined, 'toolbar gm-tools');
      const edit = el('button', 'Editar');
      edit.onclick = () => { editing.add(s); render(); };
      tools.append(edit);
      card.append(tools);
      return card;
    }
    const f = (k, label, multi) => labeledField(label, s[k], v => { s[k] = v; save(); }, multi);
    const costLab = el('label', 'Custo em PM (0 = tabela do círculo)', 'editor-label');
    const costIn = el('input'); costIn.type = 'number'; costIn.min = 0; costIn.value = s.cost || 0;
    costIn.onchange = () => { s.cost = clampN(int(costIn.value), 0, 999); save(); };
    costLab.append(costIn);
    const grid = el('div', undefined, 'gm-form-grid');
    grid.append(f('name', 'Nome'), f('circle', 'Círculo'), f('school', 'Escola'), costLab, f('time', 'Tempo de conjuração'), f('range', 'Alcance'), f('duration', 'Duração'));
    card.append(grid, f('text', 'Descrição (linha em branco separa parágrafos)', true), f('notes', 'Notas', true));
    const tools = el('div', undefined, 'toolbar');
    const done = el('button', 'Concluir edição', 'red');
    done.onclick = () => { editing.delete(s); render(); };
    const up = el('button', '↑'); up.setAttribute('aria-label', 'Mover magia para cima'); up.disabled = si === 0;
    up.onclick = () => { g.spells.splice(si - 1, 0, g.spells.splice(si, 1)[0]); save(); render(); };
    const down = el('button', '↓'); down.setAttribute('aria-label', 'Mover magia para baixo'); down.disabled = si === g.spells.length - 1;
    down.onclick = () => { g.spells.splice(si + 1, 0, g.spells.splice(si, 1)[0]); save(); render(); };
    const del = el('button', 'Excluir magia');
    del.onclick = () => { if (!confirm('Excluir a magia “' + (s.name || 'sem nome') + '”?')) return; editing.delete(s); g.spells.splice(si, 1); save(); render(); };
    tools.append(done, up, down, del);
    card.append(tools);
    return card;
  }

  /* ---------- Conjuração com Sobrecarga Arcana ---------- */
  function markCondition(name) {
    const b = [...document.querySelectorAll('.condition')].find(x => x.textContent === name);
    if (b && b.getAttribute('aria-pressed') !== 'true') b.click();
  }
  function castSpell(g, s, forceOpt) {
    const n = circleNum(s), cost = effCost(s);
    if (state.maxCircle && Number.isInteger(n) && n > state.maxCircle) return 'Sem acesso ao ' + n + 'º círculo (seu limite: ' + state.maxCircle + 'º).';
    const extra = forceOpt && n >= 5 ? Math.ceil(cost / 2) : 0;
    const spent = cost + extra;
    if (typeof window.spendMana === 'function' && !window.spendMana(spent, s.name || 'magia')) return 'Mana insuficiente (' + state.mana + ' de ' + spent + ' PM).';
    const conc = /concentra/i.test(s.duration) ? ' Lembre-se da concentração.' : '';
    if (!(n >= 5)) return 'Conjurada (−' + spent + ' PM).' + conc;

    const ps = n - 4;
    state.overload += ps;
    const dc = 8 + state.overload;
    const d = die(20);
    const bonus = mod(state.attrs[2]) + (state.conSaveProf ? Number(state.prof) : 0) + (forceOpt === 'estabilidade' ? 3 : 0);
    const total = d + bonus, miss = dc - total;
    let title, detail = 'Resistência de CON d20: ' + d + ' ' + signed(bonus) + ' = ' + total + ' contra CD ' + dc + ' (+' + ps + ' PS, total ' + state.overload + ' PS).';
    const hurt = dice => {
      const { t, r } = rollD6s(dice);
      state.hp = Math.max(0, state.hp - t);
      summary();
      return ' Dano de energia: ' + dice + 'd6 [' + r.join(', ') + '] = ' + t + ' (ignora resistências e imunidades).';
    };
    if (miss <= 0) { title = 'Conjuração estável'; detail += ' A magia funciona normalmente.'; }
    else if (miss <= 4) { title = 'Oscilação arcana'; detail += ' Falhou por ' + miss + '. A magia funciona.' + hurt(Math.ceil(state.overload / 2)); }
    else if (miss <= 9) {
      title = 'Ruptura arcana';
      const back = Math.floor(spent / 2);
      state.mana = Math.min(state.maxMana, state.mana + back);
      window.spendMana?.(0, 'ruptura arcana: ' + back + ' PM devolvidos');
      detail += ' Falhou por ' + miss + '. A magia falha, a ação fica gasta e ' + back + ' PM voltam.' + hurt(state.overload);
    } else {
      title = 'Colapso arcano';
      detail += ' Falhou por ' + miss + '. A magia falha e os PM são consumidos.' + hurt(state.overload * 2) + ' Incapacitado até o fim do seu próximo turno.';
      markCondition('Incapacitado');
    }
    if (forceOpt) detail += ' Forçada: ' + FORCE.find(f => f[0] === forceOpt)[1] + '.';
    save();
    renderOverload();
    rollResult(title + ' · ' + (s.name || 'magia'), total, detail);
    return title + '.' + conc;
  }

  const overloadPanel = el('article', undefined, 'card gm-overload');
  root.before(overloadPanel);
  function renderOverload() {
    const pb = Number(state.prof);
    overloadPanel.replaceChildren();
    overloadPanel.append(el('div', 'SOBRECARGA ARCANA · PONTOS DE MANA', 'card-label'));
    const row = el('div', undefined, 'gm-ov-row');

    const ps = el('div', undefined, 'gm-ov-ps');
    const minus = el('button', '−'); minus.setAttribute('aria-label', 'Reduzir 1 PS'); minus.disabled = !state.overload;
    minus.onclick = () => { state.overload = Math.max(0, state.overload - 1); save(); renderOverload(); };
    const plus = el('button', '+'); plus.setAttribute('aria-label', 'Somar 1 PS');
    plus.onclick = () => { state.overload++; save(); renderOverload(); };
    const value = el('div', undefined, 'gm-ov-value');
    value.append(el('b', String(state.overload)), el('small', 'PS acumulados'));
    ps.append(minus, value, plus);
    ps.classList.toggle('hot', state.overload >= 5);

    const info = el('div', undefined, 'gm-ov-info');
    info.append(el('p', 'Próximo teste (5º círculo ou mais): CD ' + (8 + state.overload) + ' + PS da magia · CON ' + signed(mod(state.attrs[2]) + (state.conSaveProf ? pb : 0))));
    const diss = el('button', state.dissipateUsed ? 'Dissipação usada neste descanso' : 'Dissipar mana · −' + (2 * pb) + ' PM, −' + pb + ' PS');
    diss.disabled = state.dissipateUsed || !state.overload;
    diss.onclick = () => {
      if (!window.spendMana?.(2 * pb, 'dissipação de mana')) { diss.textContent = 'Mana insuficiente para dissipar'; return; }
      state.overload = Math.max(0, state.overload - pb);
      state.dissipateUsed = true;
      save(); renderOverload();
    };
    const prof = el('label', undefined, 'preference');
    const box = el('input'); box.type = 'checkbox'; box.checked = state.conSaveProf;
    box.onchange = () => { state.conSaveProf = box.checked; save(); renderOverload(); };
    prof.append(box, document.createTextNode('Proficiente em resistência de Constituição'));
    info.append(diss, prof);

    const mana = el('div', undefined, 'gm-ov-mana');
    const target = pmForLevel();
    mana.append(el('p', 'Nível ' + state.level + ' pela tabela: ' + target + ' PM · seu máximo: ' + state.maxMana + ' PM'));
    if (Number(state.maxMana) !== target) {
      const apply = el('button', 'Usar ' + target + ' PM como máximo');
      apply.onclick = () => {
        if (!confirm('Mudar a mana máxima de ' + state.maxMana + ' para ' + target + ' PM (tabela do nível ' + state.level + ')?')) return;
        state.maxMana = target; state.mana = Math.min(state.mana, target);
        window.spendMana?.(0, 'máximo ajustado à tabela do nível');
        renderOverload();
      };
      mana.append(apply);
    }
    const lim = el('label', 'Maior círculo acessível (0 = não marcado)', 'editor-label');
    const limIn = el('input'); limIn.type = 'number'; limIn.min = 0; limIn.max = 15; limIn.value = state.maxCircle;
    limIn.onchange = () => { state.maxCircle = clampN(int(limIn.value), 0, 15); save(); };
    lim.append(limIn);
    mana.append(lim);
    row.append(ps, info, mana);
    overloadPanel.append(row);

    const rules = el('details', undefined, 'gm-rules');
    rules.append(el('summary', 'Tabelas da mesa: custo por círculo e Sobrecarga'));
    const t = el('table');
    const head = el('tr'); ['Círculo', 'PM', 'PS'].forEach(h => head.append(el('th', h)));
    t.append(head);
    COST_BY_CIRCLE.forEach((c, i) => { const tr = el('tr'); tr.append(el('td', i ? i + 'º' : 'Truque'), el('td', String(c)), el('td', i >= 5 ? String(i - 4) : '—')); t.append(tr); });
    rules.append(t, el('p', 'Teste de Estabilidade: CON contra CD 8 + PS. Sucesso: estável. Falha por 1–4: funciona e sofre 1d6 a cada 2 PS. Falha por 5–9: falha, devolve metade dos PM e sofre 1d6 por PS. Falha por 10+: falha, PM perdidos, 2d6 por PS e Incapacitado. Conjuração forçada: +50% do custo para Potência, Precisão, Penetração ou Estabilidade (+3). Descanso curto: −PB de PS. Descanso longo: zera a Sobrecarga e recupera todos os PM.', 'footnote'));
    overloadPanel.append(rules);
  }

  /* descansos (arsenal.js): curto reduz PS em PB; longo zera. Ambos liberam a Dissipação. */
  new MutationObserver(() => {
    const text = $('#saved').textContent;
    const short = /Descanso curto concluído/.test(text), long = /Descanso longo concluído/.test(text);
    if (!short && !long) return;
    state.overload = long ? 0 : Math.max(0, state.overload - Number(state.prof));
    state.dissipateUsed = false;
    setTimeout(() => { save(); renderOverload(); });
  }).observe($('#saved'), { childList: true, characterData: true, subtree: true });

  const picker = el('div', undefined, 'gm-picker');
  picker.setAttribute('role', 'tablist');
  picker.setAttribute('aria-label', 'Grimórios');
  root.before(picker);
  function renderPicker() {
    picker.replaceChildren();
    picker.hidden = state.grimoires.length < 2;
    state.grimoires.forEach((g, i) => {
      const b = el('button', g.name || 'Sem nome');
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(i === state.grimoireActive));
      b.onclick = () => { state.grimoireActive = i; editHead = false; query = ''; save(); render(); };
      picker.append(b);
    });
  }

  function render() {
    state.grimoireActive = clampN(state.grimoireActive, 0, Math.max(0, state.grimoires.length - 1));
    renderOverload();
    renderPicker();
    root.replaceChildren();
    const g = state.grimoires[state.grimoireActive];
    if (!g) { root.append(el('p', 'Nenhum grimório ainda. Use “+ Grimório”.', 'footnote')); return; }
    root.append(header(g, state.grimoireActive));

    const bar = el('div', undefined, 'toolbar gm-bar');
    bar.append(el('h3', 'Magias · ' + g.spells.length));
    if (g.spells.length > 3) {
      const search = el('input');
      search.type = 'search';
      search.placeholder = 'Buscar magia';
      search.setAttribute('aria-label', 'Buscar magia');
      search.value = query;
      search.oninput = () => { query = search.value; renderSpells(); };
      bar.append(search);
    }
    const add = el('button', '+ Magia');
    add.onclick = () => { const s = blankSpell(); g.spells.push(s); editing.add(s); query = ''; save(); render(); root.querySelector('.gm-spell:last-child input')?.select(); };
    bar.append(add);
    const list = el('div', undefined, 'gm-spells');
    root.append(bar, list);

    function renderSpells() {
      list.replaceChildren();
      const q = query.trim().toLocaleLowerCase();
      const circles = new Map();
      g.spells.forEach((s, si) => {
        if (q && ![s.name, s.school, s.text, s.circle].join(' ').toLocaleLowerCase().includes(q)) return;
        const key = s.circle?.trim() || '';
        if (!circles.has(key)) circles.set(key, []);
        circles.get(key).push([s, si]);
      });
      const keys = [...circles.keys()].sort((a, b) => (a === '' ? 1 : b === '' ? -1 : (int(a, 99) - int(b, 99)) || a.localeCompare(b)));
      for (const key of keys) {
        const section = el('section', undefined, 'gm-circle');
        section.append(el('h4', key ? key + 'º Círculo' : 'Sem círculo', 'gm-circle-title'));
        const grid = el('div', undefined, 'gm-spell-grid');
        circles.get(key).forEach(([s, si]) => grid.append(spellCard(g, s, si)));
        section.append(grid);
        list.append(section);
      }
      if (!keys.length) list.append(el('p', q ? 'Nenhuma magia encontrada.' : 'Nenhuma magia neste grimório.', 'footnote'));
    }
    renderSpells();
  }

  $('#add-grimoire').onclick = () => {
    state.grimoires.push(blankGrimoire());
    state.grimoireActive = state.grimoires.length - 1;
    editHead = true; save(); render();
    root.querySelector('.gm-head input')?.select();
  };

  /* atributos e proficiência mudam CD e ataque */
  document.addEventListener('change', e => { if (e.target.matches('#attributes input, #prof')) render(); });
  document.querySelector('[data-tab="grimorios"]').addEventListener('click', () => render());

  render();
  save();
})();
