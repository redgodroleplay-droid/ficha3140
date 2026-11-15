/* Diário reconstruído: livro com modo leitura/escrita, modelos de entrada,
   missões com tarefas, tags, fixados, filtros e linha do tempo.
   Mantém o formato de state.pages ({title, text, category, date}) e acrescenta
   campos opcionais: tags, session, pinned, done, xp, xpAdded. */
(() => {
  const CATS = {
    'Registro': ['記', '#d8b36a'], 'Sessão': ['戦', '#ff8a3d'], 'Missão': ['任', '#e8432c'],
    'Descoberta': ['発', '#3fb6a8'], 'Sonho': ['夢', '#8a6cff'], 'Aula': ['学', '#5b9cff'], 'Anotação': ['書', '#a39684']
  };
  const catOf = c => CATS[c] || ['頁', '#a39684'];
  const today = () => new Date().toISOString().slice(0, 10);
  const fmtDate = d => (d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
  const words = t => (String(t).trim().match(/\S+/g) || []).length;
  const tagsOf = p => String(p.tags || '').split(',').map(t => t.trim()).filter(Boolean);
  const owner = () => state.nickname || state.name || 'Viajante';

  const TEMPLATES = [
    ['Em branco', 'Registro', () => ({ title: 'Nova entrada', text: '' })],
    ['Sessão de jogo', 'Sessão', () => {
      const n = state.pages.filter(p => p.category === 'Sessão').length + 1;
      return { title: 'Sessão ' + n, session: String(n), text: '# Resumo\n\n\n# Quem encontramos\n- \n\n# Loot & recompensas\n- \n\n# Pendências\n- [ ] ' };
    }],
    ['Missão', 'Missão', () => ({ title: 'Nova missão', text: '# Objetivo\n\n\n# Pistas\n- [ ] \n\n# Recompensa\n' })],
    ['Descoberta', 'Descoberta', () => ({ title: 'Descoberta', text: '# O que descobri\n\n\n# Onde / com quem\n\n\n# O que isso muda\n' })],
    ['Sonho', 'Sonho', () => ({ title: 'Sonho', text: '> \n\n' })],
    ['Aula', 'Aula', () => ({ title: 'Aula', text: '# Matéria\n\n\n# Anotações\n- \n\n# Dúvidas\n- [ ] ' })]
  ];

  /* ---------- Backup: campos extras das páginas ---------- */
  const previousExtend = window.extendBackup;
  window.extendBackup = (data, clean) => {
    previousExtend?.(data, clean);
    if (!Array.isArray(data.pages) || data.pages.length !== clean.pages.length) return;
    data.pages.forEach((p, i) => {
      if (!p || typeof p !== 'object') return;
      for (const k of ['tags', 'session', 'xp']) if (typeof p[k] === 'string') clean.pages[i][k] = p[k].slice(0, 400);
      for (const k of ['pinned', 'done', 'xpAdded']) if (typeof p[k] === 'boolean') clean.pages[i][k] = p[k];
    });
  };

  /* ---------- Estrutura ---------- */
  const root = $('#diario');
  root.replaceChildren();
  root.classList.add('journal');
  root.innerHTML =
    '<div class="j-top">' +
      '<div class="j-views" role="group" aria-label="Modo de visualização"><button type="button" data-view="book">Livro</button><button type="button" data-view="timeline">Linha do tempo</button></div>' +
      '<div class="j-stats"></div>' +
      '<details class="j-new"><summary>+ Nova entrada</summary><div class="j-templates"></div></details>' +
    '</div>' +
    '<div class="j-book">' +
      '<aside class="j-index" aria-label="Índice do diário">' +
        '<div class="j-index-head"><span class="eyebrow">ÍNDICE DA JORNADA</span><button type="button" class="j-index-toggle" aria-expanded="true">Ocultar</button></div>' +
        '<div class="j-index-body">' +
          '<input type="search" class="j-search" placeholder="Buscar título, texto ou #tag" aria-label="Buscar no diário">' +
          '<div class="j-filters" role="group" aria-label="Filtrar por categoria"></div>' +
          '<label class="j-sort">Ordenar <select aria-label="Ordenar entradas"><option value="book">Ordem do livro</option><option value="new">Mais recentes</option><option value="old">Mais antigas</option><option value="az">Título A–Z</option></select></label>' +
          '<div class="j-list"></div>' +
        '</div>' +
      '</aside>' +
      '<article class="j-page" aria-live="polite">' +
        '<div class="j-page-top"><span class="j-owner"></span><span class="j-counter"></span></div>' +
        '<header class="j-head">' +
          '<div class="j-meta">' +
            '<label class="j-cat"><span class="j-cat-glyph" aria-hidden="true"></span><select aria-label="Categoria"></select></label>' +
            '<label class="j-date">Data <input type="date" aria-label="Data da entrada"></label>' +
            '<label class="j-session">Sessão nº <input type="text" inputmode="numeric" aria-label="Número da sessão"></label>' +
            '<button type="button" class="j-pin" aria-pressed="false">☆ Fixar</button>' +
            '<button type="button" class="j-done" aria-pressed="false">○ Concluída</button>' +
          '</div>' +
          '<input class="j-title" aria-label="Título da entrada" placeholder="Título">' +
          '<div class="j-tags-row"><input class="j-tags" aria-label="Tags separadas por vírgula" placeholder="tags, separadas, por vírgula"><div class="j-tagchips"></div></div>' +
        '</header>' +
        '<div class="j-tools">' +
          '<div class="j-mode" role="group" aria-label="Modo"><button type="button" data-mode="read">Ler</button><button type="button" data-mode="write">Escrever</button></div>' +
          '<div class="j-format" role="group" aria-label="Formatação"></div>' +
          '<span class="j-count"></span>' +
        '</div>' +
        '<textarea class="j-text" aria-label="Texto da entrada" placeholder="A jornada começa aqui…"></textarea>' +
        '<div class="j-read"></div>' +
        '<div class="j-progress-tasks" hidden><div class="bar"><i></i></div><span></span></div>' +
        '<div class="j-xp" hidden><label>XP desta sessão <input type="number" min="0" inputmode="numeric"></label><button type="button">Somar à progressão</button><span class="j-xp-status"></span></div>' +
        '<footer class="j-foot"><button type="button" class="j-prev">← Anterior</button><div class="j-foot-mid"><button type="button" class="j-dup">Duplicar</button><button type="button" class="j-del">Excluir</button></div><button type="button" class="j-next">Próxima →</button></footer>' +
      '</article>' +
    '</div>' +
    '<div class="j-timeline" hidden></div>';

  const q = s => root.querySelector(s);
  const els = {
    stats: q('.j-stats'), list: q('.j-list'), search: q('.j-search'), filters: q('.j-filters'), sort: q('.j-sort select'),
    page: q('.j-page'), owner: q('.j-owner'), counter: q('.j-counter'), cat: q('.j-cat select'), catGlyph: q('.j-cat-glyph'),
    date: q('.j-date input'), session: q('.j-session'), sessionIn: q('.j-session input'), pin: q('.j-pin'), done: q('.j-done'),
    title: q('.j-title'), tags: q('.j-tags'), tagchips: q('.j-tagchips'), text: q('.j-text'), read: q('.j-read'),
    count: q('.j-count'), tasks: q('.j-progress-tasks'), xp: q('.j-xp'), xpIn: q('.j-xp input'), xpBtn: q('.j-xp button'), xpStatus: q('.j-xp-status'),
    prev: q('.j-prev'), next: q('.j-next'), dup: q('.j-dup'), del: q('.j-del'), timeline: q('.j-timeline'), book: q('.j-book')
  };

  let current = 0, mode = null, filter = 'Todos', view = 'book', rendered = null;
  const P = () => state.pages[current];

  /* ---------- Markdown leve (sem innerHTML com texto do usuário) ---------- */
  function inline(parent, text) {
    String(text).split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*|==[^=\n]+==|#[\p{L}\d_-]+)/u).forEach(part => {
      if (!part) return;
      if (/^\*\*.+\*\*$/.test(part)) parent.append(el('strong', part.slice(2, -2)));
      else if (/^\*.+\*$/.test(part)) parent.append(el('em', part.slice(1, -1)));
      else if (/^==.+==$/.test(part)) parent.append(el('mark', part.slice(2, -2)));
      else if (/^#[\p{L}\d_-]+$/u.test(part)) {
        const tag = el('button', part, 'j-inline-tag');
        tag.type = 'button';
        tag.onclick = () => { els.search.value = part; renderList(); };
        parent.append(tag);
      } else parent.append(document.createTextNode(part));
    });
  }
  function renderMarkdown(text, box) {
    box.replaceChildren();
    const lines = String(text).split('\n');
    let para = [], list = null, quote = null;
    const flush = () => {
      if (para.length) { const p = el('p'); inline(p, para.join('\n')); box.append(p); para = []; }
      list = null; quote = null;
    };
    lines.forEach((line, n) => {
      let m;
      if (!line.trim()) return flush();
      if ((m = line.match(/^(#{1,3})\s+(.*)$/))) { flush(); const h = el(m[1].length === 1 ? 'h3' : 'h4'); inline(h, m[2]); return box.append(h); }
      if (/^\s*(-{3,}|━{3,}|—{3,}|_{3,})\s*$/.test(line)) { flush(); return box.append(el('hr')); }
      if ((m = line.match(/^\s*[-*]\s\[( |x|X)\]\s?(.*)$/))) {
        if (para.length || !list || list.tagName !== 'UL' || !list.classList.contains('tasks')) { flush(); list = el('ul', undefined, 'tasks'); box.append(list); }
        const li = el('li', undefined, m[1] === ' ' ? '' : 'checked');
        const box2 = el('input'); box2.type = 'checkbox'; box2.checked = m[1] !== ' ';
        box2.setAttribute('aria-label', 'Concluir tarefa: ' + m[2]);
        box2.onchange = () => toggleTask(n, box2.checked);
        const span = el('span'); inline(span, m[2] || '…');
        const label = el('label'); label.append(box2, span);
        li.append(label); list.append(li);
        return;
      }
      if ((m = line.match(/^\s*(?:[-*•])\s+(.*)$/)) || (m = line.match(/^\s*(\d+[.)]\s+.*)$/))) {
        const ordered = /^\s*\d+[.)]\s/.test(line);
        const tag = ordered ? 'OL' : 'UL';
        if (para.length || !list || list.tagName !== tag || list.classList.contains('tasks')) { flush(); list = el(tag.toLowerCase()); box.append(list); }
        const li = el('li'); inline(li, ordered ? m[1].replace(/^\d+[.)]\s+/, '') : m[1]); list.append(li);
        return;
      }
      if ((m = line.match(/^>\s?(.*)$/))) {
        if (para.length || !quote) { flush(); quote = el('blockquote'); box.append(quote); }
        const p = el('p'); inline(p, m[1]); quote.append(p);
        return;
      }
      if (/^\s*—/.test(line)) { flush(); const p = el('p', undefined, 'dialogue'); inline(p, line.trim()); return box.append(p); }
      list = null; quote = null;
      para.push(line);
    });
    flush();
    if (!box.childElementCount) box.append(el('p', 'Página em branco. Toque em “Escrever” para começar.', 'j-empty'));
  }
  function taskStats(text) {
    const all = String(text).match(/^\s*[-*]\s\[( |x|X)\]/gm) || [];
    return { total: all.length, done: all.filter(t => /\[(x|X)\]/.test(t)).length };
  }
  function toggleTask(lineIndex, checked) {
    const lines = P().text.split('\n');
    lines[lineIndex] = lines[lineIndex].replace(/\[( |x|X)\]/, checked ? '[x]' : '[ ]');
    P().text = lines.join('\n');
    save(); renderPage(false); renderList(); renderStats();
  }

  /* ---------- Formatação ---------- */
  const FORMATS = [
    ['T', 'Título', { prefix: '# ' }], ['N', 'Negrito', { wrap: '**' }], ['I', 'Itálico', { wrap: '*' }], ['✦', 'Destaque', { wrap: '==' }],
    ['•', 'Lista', { prefix: '- ' }], ['☐', 'Tarefa', { prefix: '- [ ] ' }], ['❝', 'Citação', { prefix: '> ' }], ['—', 'Fala', { prefix: '— ' }], ['⎯', 'Separador', { insert: '\n---\n' }]
  ];
  function applyFormat(f) {
    const t = els.text, s = t.selectionStart, e = t.selectionEnd, v = t.value;
    let next, cs, ce;
    if (f.wrap) {
      const sel = v.slice(s, e) || 'texto';
      next = v.slice(0, s) + f.wrap + sel + f.wrap + v.slice(e);
      cs = s + f.wrap.length; ce = cs + sel.length;
    } else if (f.prefix) {
      const lineStart = v.lastIndexOf('\n', s - 1) + 1;
      const block = v.slice(lineStart, e);
      const prefixed = block.split('\n').map(l => (l.startsWith(f.prefix) ? l.slice(f.prefix.length) : f.prefix + l)).join('\n');
      next = v.slice(0, lineStart) + prefixed + v.slice(e);
      cs = lineStart; ce = lineStart + prefixed.length;
    } else {
      next = v.slice(0, s) + f.insert + v.slice(e);
      cs = ce = s + f.insert.length;
    }
    t.value = next;
    t.focus();
    t.setSelectionRange(cs, ce);
    t.dispatchEvent(new Event('input'));
  }
  FORMATS.forEach(([glyph, label, f]) => {
    const b = el('button', glyph, 'j-fmt');
    b.type = 'button'; b.title = label; b.setAttribute('aria-label', label);
    b.onmousedown = ev => ev.preventDefault();
    b.onclick = () => applyFormat(f);
    q('.j-format').append(b);
  });
  els.text.addEventListener('keydown', e => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const key = e.key.toLowerCase();
    if (key === 'b') { e.preventDefault(); applyFormat({ wrap: '**' }); }
    if (key === 'i') { e.preventDefault(); applyFormat({ wrap: '*' }); }
  });

  /* ---------- Categorias ---------- */
  function fillCategories() {
    const cats = new Set([...Object.keys(CATS), ...state.pages.map(p => p.category).filter(Boolean)]);
    els.cat.replaceChildren(...[...cats].map(c => el('option', c)));
  }
  function renderFilters() {
    const counts = {};
    state.pages.forEach(p => { const c = p.category || 'Registro'; counts[c] = (counts[c] || 0) + 1; });
    const open = state.pages.filter(p => p.category === 'Missão' && !p.done).length;
    els.filters.replaceChildren();
    const chips = [['Todos', state.pages.length], ...Object.entries(counts)];
    if (open) chips.push(['Missões abertas', open]);
    chips.forEach(([name, n]) => {
      const b = el('button', undefined, 'j-chip');
      b.type = 'button';
      b.style.setProperty('--cat', name === 'Missões abertas' ? CATS['Missão'][1] : name === 'Todos' ? '#d8b36a' : catOf(name)[1]);
      b.setAttribute('aria-pressed', String(filter === name));
      b.append(el('span', name), el('b', String(n)));
      b.onclick = () => { filter = name; renderFilters(); renderList(); };
      els.filters.append(b);
    });
  }

  /* ---------- Índice ---------- */
  function visibleIndices() {
    const term = els.search.value.trim().toLocaleLowerCase();
    let idx = state.pages.map((_, i) => i).filter(i => {
      const p = state.pages[i];
      if (filter === 'Missões abertas' && !(p.category === 'Missão' && !p.done)) return false;
      if (filter !== 'Todos' && filter !== 'Missões abertas' && (p.category || 'Registro') !== filter) return false;
      if (!term) return true;
      const tagHit = term.startsWith('#') && tagsOf(p).some(t => ('#' + t.toLocaleLowerCase()).startsWith(term));
      return tagHit || [p.title, p.text, p.category, p.date, p.tags].join(' ').toLocaleLowerCase().includes(term.replace(/^#/, ''));
    });
    const by = els.sort.value;
    if (by === 'new') idx.sort((a, b) => String(state.pages[b].date || '').localeCompare(String(state.pages[a].date || '')) || b - a);
    if (by === 'old') idx.sort((a, b) => String(state.pages[a].date || '9999').localeCompare(String(state.pages[b].date || '9999')) || a - b);
    if (by === 'az') idx.sort((a, b) => String(state.pages[a].title).localeCompare(String(state.pages[b].title), 'pt-BR'));
    return [...idx.filter(i => state.pages[i].pinned), ...idx.filter(i => !state.pages[i].pinned)];
  }
  function renderList() {
    els.list.replaceChildren();
    const idx = visibleIndices();
    if (!idx.length) { els.list.append(el('p', 'Nada encontrado.', 'j-empty')); return; }
    let pinnedHeader = false, restHeader = false;
    idx.forEach(i => {
      const p = state.pages[i];
      if (p.pinned && !pinnedHeader) { els.list.append(el('span', 'FIXADAS', 'j-group')); pinnedHeader = true; }
      if (!p.pinned && pinnedHeader && !restHeader) { els.list.append(el('span', 'ENTRADAS', 'j-group')); restHeader = true; }
      const [glyph, color] = catOf(p.category || 'Registro');
      const b = el('button', undefined, 'j-item');
      b.type = 'button';
      b.style.setProperty('--cat', color);
      b.classList.toggle('active', i === current);
      b.classList.toggle('done', p.category === 'Missão' && p.done === true);
      if (i === current) b.setAttribute('aria-current', 'true');
      const t = taskStats(p.text);
      const sub = [fmtDate(p.date), p.category || 'Registro', t.total ? t.done + '/' + t.total + ' ✓' : ''].filter(Boolean).join(' · ');
      const g = el('span', glyph, 'j-item-glyph'); g.setAttribute('aria-hidden', 'true');
      const body = el('span', undefined, 'j-item-body');
      body.append(el('b', (p.pinned ? '★ ' : '') + (p.title || 'Sem título')), el('small', sub));
      b.append(g, body);
      b.onclick = () => { go(i); if (matchMedia('(max-width:760px)').matches) els.page.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
      els.list.append(b);
    });
  }

  function renderStats() {
    const total = state.pages.length;
    const open = state.pages.filter(p => p.category === 'Missão' && !p.done).length;
    const w = state.pages.reduce((n, p) => n + words(p.text), 0);
    els.stats.replaceChildren(
      el('span', total + (total === 1 ? ' entrada' : ' entradas')),
      el('span', open + (open === 1 ? ' missão aberta' : ' missões abertas')),
      el('span', w.toLocaleString('pt-BR') + ' palavras')
    );
  }

  /* ---------- Página ---------- */
  function renderPage(resetMode = true) {
    current = Math.max(0, Math.min(current, state.pages.length - 1));
    if (typeof page !== 'undefined') page = current;
    const p = P();
    const category = p.category || 'Registro';
    const [glyph, color] = catOf(category);
    if (resetMode || mode === null) mode = p.text.trim() ? 'read' : 'write';
    els.page.style.setProperty('--cat', color);
    els.owner.textContent = 'DIÁRIO DE ' + owner().toLocaleUpperCase('pt-BR');
    els.counter.textContent = String(current + 1).padStart(2, '0') + ' / ' + String(state.pages.length).padStart(2, '0');
    if (![...els.cat.options].some(o => o.value === category)) fillCategories();
    els.cat.value = category;
    els.catGlyph.textContent = glyph;
    /* Só preserva o campo em foco se ainda for a mesma entrada; ao trocar de página, tudo é reescrito. */
    const samePage = rendered === p;
    rendered = p;
    const keep = node => samePage && document.activeElement === node;
    if (!keep(els.date)) els.date.value = p.date || '';
    if (!keep(els.title)) els.title.value = p.title || '';
    if (!keep(els.tags)) els.tags.value = p.tags || '';
    if (!keep(els.sessionIn)) els.sessionIn.value = p.session || '';
    if (!keep(els.text)) els.text.value = p.text || '';
    els.session.hidden = category !== 'Sessão';
    els.done.hidden = category !== 'Missão';
    els.pin.textContent = p.pinned ? '★ Fixada' : '☆ Fixar';
    els.pin.setAttribute('aria-pressed', String(Boolean(p.pinned)));
    els.done.textContent = p.done ? '● Concluída' : '○ Concluída';
    els.done.setAttribute('aria-pressed', String(Boolean(p.done)));
    els.page.classList.toggle('mission-done', category === 'Missão' && Boolean(p.done));
    els.tagchips.replaceChildren(...tagsOf(p).map(t => {
      const b = el('button', '#' + t, 'j-tagchip');
      b.type = 'button';
      b.onclick = () => { els.search.value = '#' + t; renderList(); };
      return b;
    }));
    root.querySelectorAll('.j-mode button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
    els.page.classList.toggle('reading', mode === 'read');
    els.text.hidden = mode === 'read';
    els.read.hidden = mode !== 'read';
    q('.j-format').hidden = mode === 'read';
    if (mode === 'read') renderMarkdown(p.text, els.read);
    const w = words(p.text);
    els.count.textContent = w + (w === 1 ? ' palavra' : ' palavras') + ' · ' + Math.max(1, Math.ceil(w / 200)) + ' min de leitura';
    const t = taskStats(p.text);
    els.tasks.hidden = !t.total;
    if (t.total) {
      els.tasks.querySelector('i').style.width = (t.done / t.total) * 100 + '%';
      els.tasks.querySelector('span').textContent = t.done + ' de ' + t.total + ' tarefas';
    }
    els.xp.hidden = category !== 'Sessão';
    if (!keep(els.xpIn)) els.xpIn.value = p.xp || '';
    els.xpBtn.disabled = Boolean(p.xpAdded) || !Number(p.xp);
    els.xpBtn.textContent = p.xpAdded ? 'Somado ✓' : 'Somar à progressão';
    els.prev.disabled = current === 0;
    els.next.disabled = current === state.pages.length - 1;
  }

  function go(i, direction) {
    if (i < 0 || i >= state.pages.length) return;
    const dir = direction || (i > current ? 'next' : 'prev');
    current = i;
    mode = null;
    renderPage(); renderList();
    els.page.classList.remove('turn-next', 'turn-prev');
    void els.page.offsetWidth;
    els.page.classList.add('turn-' + dir);
  }
  function refreshAll() { fillCategories(); renderFilters(); renderList(); renderStats(); renderPage(false); }

  /* ---------- Eventos de edição ---------- */
  els.title.oninput = () => { P().title = els.title.value; save(); renderList(); };
  els.text.oninput = () => {
    P().text = els.text.value; save();
    const w = words(P().text);
    els.count.textContent = w + (w === 1 ? ' palavra' : ' palavras') + ' · ' + Math.max(1, Math.ceil(w / 200)) + ' min de leitura';
    clearTimeout(els.text._t);
    els.text._t = setTimeout(() => { renderList(); renderStats(); renderPage(false); }, 400);
  };
  els.cat.onchange = () => { P().category = els.cat.value; save(); refreshAll(); };
  els.date.onchange = () => { P().date = els.date.value; save(); renderList(); };
  els.sessionIn.oninput = () => { P().session = els.sessionIn.value; save(); };
  els.tags.oninput = () => { P().tags = els.tags.value; save(); };
  els.tags.onchange = () => renderPage(false);
  els.pin.onclick = () => { P().pinned = !P().pinned; save(); renderPage(false); renderList(); };
  els.done.onclick = () => { P().done = !P().done; save(); refreshAll(); };
  root.querySelectorAll('.j-mode button').forEach(b => { b.onclick = () => { mode = b.dataset.mode; renderPage(false); if (mode === 'write') els.text.focus(); }; });
  els.xpIn.oninput = () => { P().xp = els.xpIn.value; save(); els.xpBtn.disabled = Boolean(P().xpAdded) || !Number(P().xp); };
  els.xpBtn.onclick = () => {
    const amount = Math.floor(Number(P().xp) || 0);
    const form = $('.xp-form');
    if (!amount || !form) return;
    form.querySelector('input').value = amount;
    form.requestSubmit(form.querySelector('button'));
    P().xpAdded = true; save();
    els.xpStatus.textContent = '+' + amount.toLocaleString('pt-BR') + ' XP somados na Visão geral.';
    renderPage(false);
  };
  els.prev.onclick = () => go(current - 1, 'prev');
  els.next.onclick = () => go(current + 1, 'next');
  els.dup.onclick = () => {
    const copy = { ...P(), title: (P().title || 'Entrada') + ' (cópia)', pinned: false, xpAdded: false };
    state.pages.splice(current + 1, 0, copy);
    save(); go(current + 1, 'next'); refreshAll();
  };
  els.del.onclick = () => {
    if (!confirm('Excluir a entrada “' + (P().title || 'Sem título') + '”? Isso não pode ser desfeito (exporte antes se quiser guardar).')) return;
    if (state.pages.length === 1) state.pages[0] = { title: 'O início do caminho', text: '', category: 'Registro', date: today() };
    else state.pages.splice(current, 1);
    current = Math.min(current, state.pages.length - 1);
    save(); mode = null; refreshAll(); renderPage();
  };
  els.search.oninput = renderList;
  els.sort.onchange = renderList;

  /* Novas entradas por modelo */
  TEMPLATES.forEach(([label, category, make]) => {
    const [glyph, color] = catOf(category);
    const b = el('button', undefined, 'j-template');
    b.type = 'button';
    b.style.setProperty('--cat', color);
    b.append(el('span', glyph, 'j-item-glyph'), el('span', label));
    b.onclick = () => {
      const entry = { category, date: today(), ...make() };
      state.pages.push(entry);
      current = state.pages.length - 1;
      filter = 'Todos'; els.search.value = '';
      q('.j-new').open = false;
      save(); mode = 'write'; refreshAll(); renderPage(false);
      setView('book');
      els.title.focus(); els.title.select();
    };
    q('.j-templates').append(b);
  });
  document.addEventListener('click', e => { const d = q('.j-new'); if (d.open && !d.contains(e.target)) d.open = false; });

  /* Índice recolhível (útil no celular) */
  const indexToggle = q('.j-index-toggle');
  indexToggle.onclick = () => {
    const open = indexToggle.getAttribute('aria-expanded') !== 'true';
    indexToggle.setAttribute('aria-expanded', String(open));
    indexToggle.textContent = open ? 'Ocultar' : 'Mostrar (' + state.pages.length + ')';
    q('.j-index').classList.toggle('collapsed', !open);
  };

  /* Teclado: ← → viram a página no modo leitura */
  document.addEventListener('keydown', e => {
    if (!root.classList.contains('active') || view !== 'book') return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.querySelector('dialog[open]')) return;
    if (e.key === 'ArrowRight') go(current + 1, 'next');
    if (e.key === 'ArrowLeft') go(current - 1, 'prev');
  });

  /* ---------- Linha do tempo ---------- */
  function renderTimeline() {
    const box = els.timeline;
    box.replaceChildren();
    const dated = state.pages.map((p, i) => ({ p, i })).sort((a, b) => String(a.p.date || '9999').localeCompare(String(b.p.date || '9999')) || a.i - b.i);
    let lastMonth = null;
    dated.forEach(({ p, i }) => {
      const month = p.date ? new Date(p.date + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : 'Sem data';
      if (month !== lastMonth) { box.append(el('h3', month, 'j-tl-month')); lastMonth = month; }
      const [glyph, color] = catOf(p.category || 'Registro');
      const item = el('button', undefined, 'j-tl-item');
      item.type = 'button';
      item.style.setProperty('--cat', color);
      item.classList.toggle('done', p.category === 'Missão' && p.done === true);
      const g = el('span', glyph, 'j-tl-glyph'); g.setAttribute('aria-hidden', 'true');
      const body = el('span', undefined, 'j-tl-body');
      const excerpt = String(p.text).replace(/^[#>\-*\s[\]x]+/gm, '').replace(/\s+/g, ' ').trim().slice(0, 150);
      body.append(el('small', [fmtDate(p.date), p.category || 'Registro', p.session ? 'Sessão ' + p.session : ''].filter(Boolean).join(' · ')), el('b', p.title || 'Sem título'), el('span', excerpt ? excerpt + (excerpt.length >= 150 ? '…' : '') : '—'));
      item.append(g, body);
      item.onclick = () => { setView('book'); go(i); };
      box.append(item);
    });
  }
  function setView(next) {
    view = next;
    root.querySelectorAll('.j-views button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
    els.book.hidden = view !== 'book';
    els.timeline.hidden = view !== 'timeline';
    if (view === 'timeline') renderTimeline();
  }
  root.querySelectorAll('.j-views button').forEach(b => { b.onclick = () => setView(b.dataset.view); });

  /* Título da seção */
  Object.assign(titles, { diario: ['07 / 日記', 'Diário de jornada'] });

  fillCategories();
  setView('book');
  refreshAll();
  renderPage();
})();
