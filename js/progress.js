/* Progressão: barra de XP, PB automático pelo nível e marcos que destravam. */
(() => {
  /* Tabela de XP da mesa (XP total necessário para cada nível). */
  const XP = [0, 1200, 3600, 10800, 26000, 56000, 92000, 136000, 192000, 256000, 340000, 400000, 480000, 560000, 660000, 780000, 900000, 1060000, 1220000, 1420000];
  const pbFor = level => 2 + Math.floor((Math.max(1, level) - 1) / 4);
  const fmt = n => Number(n).toLocaleString('pt-BR');
  const BASE_MILESTONES = [
    [2, 'Experiência oriental'],
    [3, 'Sangue de Herói — Instinto de Sobrevivência'], [3, 'Mestre Samurai — Especialidade Aprimorada (+1)'], [3, 'Humano — Potencial Humano (Sobrevivente)'],
    [4, 'Humano — 1º Talento adicional'],
    [5, 'Proficiência +3'], [5, 'Afinidade com Cortes — Corte Afiado (+1d4 cortante)'], [5, 'Humano — Espírito Indomável'], [5, 'Luta contra a desonra — +1d4'], [5, 'Truques: 2 dados de dano'],
    [9, 'Proficiência +4'],
    [10, 'Afinidade com Cortes — Mestre da Lâmina'], [10, 'Humano — 2º Talento adicional'],
    [11, 'Truques: 3 dados de dano'], [11, 'Luta contra a desonra — +1d4'],
    [13, 'Mestre Samurai — Especialidade Aprimorada (+2)'], [13, 'Proficiência +5'],
    [15, 'Afinidade com Cortes — Corte Devastador'],
    [16, 'Humano — 3º Talento adicional'],
    [17, 'Truques: 4 dados de dano'], [17, 'Experiência oriental — 1º e 2º ataques'], [17, 'Proficiência +6'],
    [20, 'Afinidade com Cortes — Corte Absoluto'], [20, 'Luta contra a desonra — +1d4']
  ];

  /* ---------- Estado ---------- */
  if (!Number.isFinite(state.xp)) {
    const fromDiary = state.pages.map(p => (String(p.text).match(/(\d[\d.]*)\s*xp/i) || [])[1]).find(Boolean);
    state.xp = fromDiary ? Number(fromDiary.replace(/\./g, '')) : XP[Math.min(19, Math.max(0, state.level - 1))];
  }
  if (typeof state.autoProf !== 'boolean') state.autoProf = Number(state.prof) === pbFor(state.level);
  if (!Array.isArray(state.milestones)) state.milestones = [];

  const previousExtend = window.extendBackup;
  window.extendBackup = (data, clean) => {
    previousExtend?.(data, clean);
    if (Number.isFinite(data.xp) && data.xp >= 0) clean.xp = data.xp;
    if (typeof data.autoProf === 'boolean') clean.autoProf = data.autoProf;
    if (Array.isArray(data.milestones)) clean.milestones = data.milestones
      .filter(m => m && Number.isInteger(m.level) && m.level >= 1 && m.level <= 20 && typeof m.text === 'string')
      .map(m => ({ level: m.level, text: m.text.slice(0, 200) }));
  };

  const allMilestones = () => [...BASE_MILESTONES.map(([level, text]) => ({ level, text })), ...state.milestones.map((m, i) => ({ ...m, custom: i }))]
    .sort((a, b) => a.level - b.level);
  const levelForXp = xp => XP.reduce((lvl, need, i) => (xp >= need ? i + 1 : lvl), 1);

  /* ---------- Card ---------- */
  const card = el('article', undefined, 'card progress-card');
  card.innerHTML =
    '<div class="card-label">PROGRESSÃO <span lang="ja">道程</span></div>' +
    '<div class="progress-head"><div class="level-seal"><small>NÍVEL</small><b></b></div>' +
    '<div class="xp-block"><div class="xp-line"><label>XP <input type="number" min="0" class="xp-input" aria-label="Experiência total"></label><span class="xp-next"></span></div>' +
    '<div class="bar xp-bar"><i></i></div><p class="xp-remaining"></p></div></div>' +
    '<form class="xp-form"><input type="number" min="1" step="1" placeholder="+ XP ganho" aria-label="XP ganho" required><button>Adicionar XP</button><button type="button" class="level-up red" hidden></button></form>' +
    '<label class="preference auto-prof"><input type="checkbox"> Proficiência automática pelo nível</label>' +
    '<div class="level-track" aria-label="Marcos por nível"></div>' +
    '<div class="milestones"><div class="milestone-col"><span class="eyebrow">PRÓXIMOS MARCOS</span><ul class="next-list"></ul></div><div class="milestone-col"><span class="eyebrow">JÁ DESTRAVADO</span><ul class="done-list"></ul></div></div>' +
    '<details class="milestone-edit"><summary>Marcos personalizados</summary><div class="custom-milestones"></div><form class="milestone-add"><input type="number" min="1" max="20" value="4" aria-label="Nível do marco"><input placeholder="Ex.: Aprende nova técnica de espada" aria-label="Descrição do marco" required><button>+ Marco</button></form></details>' +
    '<p class="session-status progress-status" role="status"></p>';
  $('.resources-card').before(card);

  const q = s => card.querySelector(s);
  const xpInput = q('.xp-input'), status = q('.progress-status'), autoBox = q('.auto-prof input'), upBtn = q('.level-up');
  autoBox.checked = state.autoProf;

  function setLevel(level) {
    state.level = Math.min(20, Math.max(1, level));
    $('#level').value = state.level;
    summary(); save(); render();
  }

  function render() {
    const lvl = Math.min(20, Math.max(1, Number(state.level) || 1));
    const xp = Math.max(0, Number(state.xp) || 0);
    if (document.activeElement !== xpInput) xpInput.value = xp;
    q('.level-seal b').textContent = lvl;
    const floor = XP[lvl - 1], next = XP[lvl];
    const eligible = levelForXp(xp);
    if (lvl >= 20) {
      q('.xp-bar i').style.width = '100%';
      q('.xp-next').textContent = 'Nível máximo';
      q('.xp-remaining').textContent = fmt(xp) + ' XP acumulados.';
    } else {
      const pct = Math.max(0, Math.min(1, (xp - floor) / (next - floor)));
      q('.xp-bar i').style.width = pct * 100 + '%';
      q('.xp-next').textContent = fmt(xp) + ' / ' + fmt(next) + ' para o nível ' + (lvl + 1);
      q('.xp-remaining').textContent = xp >= next ? 'XP suficiente para subir de nível!' : 'Faltam ' + fmt(next - xp) + ' XP (' + Math.round(pct * 100) + '%).';
    }
    card.classList.toggle('can-level', eligible > lvl);
    upBtn.hidden = eligible <= lvl;
    upBtn.textContent = '⬆ Subir para o nível ' + (lvl + 1);

    const all = allMilestones();
    const track = q('.level-track');
    track.replaceChildren();
    for (let n = 1; n <= 20; n++) {
      const has = all.filter(m => m.level === n);
      const dot = el('span', String(n), 'track-dot');
      dot.classList.toggle('reached', n <= lvl);
      dot.classList.toggle('current', n === lvl);
      dot.classList.toggle('marked', has.length > 0);
      dot.title = 'Nível ' + n + (has.length ? ': ' + has.map(m => m.text).join(' · ') : '');
      track.append(dot);
    }
    const nextList = q('.next-list'), doneList = q('.done-list');
    nextList.replaceChildren(); doneList.replaceChildren();
    const upcoming = all.filter(m => m.level > lvl);
    const nextLevels = [...new Set(upcoming.map(m => m.level))].slice(0, 2);
    upcoming.filter(m => nextLevels.includes(m.level)).forEach(m => nextList.append(milestoneItem(m)));
    if (!nextList.childElementCount) nextList.append(el('li', 'Nada registrado adiante.'));
    all.filter(m => m.level <= lvl).reverse().slice(0, 6).forEach(m => doneList.append(milestoneItem(m)));
    if (!doneList.childElementCount) doneList.append(el('li', '—'));

    const customRoot = q('.custom-milestones');
    customRoot.replaceChildren();
    state.milestones.forEach((m, i) => {
      const row = el('div', undefined, 'custom-milestone');
      const del = el('button', '×', 'icon-btn');
      del.type = 'button';
      del.setAttribute('aria-label', 'Remover marco');
      del.onclick = () => { state.milestones.splice(i, 1); save(); render(); };
      row.append(el('b', 'Nv. ' + m.level), el('span', m.text), del);
      customRoot.append(row);
    });
  }
  function milestoneItem(m) {
    const li = el('li');
    li.append(el('b', 'Nv. ' + m.level), document.createTextNode(' ' + m.text));
    if (m.custom !== undefined) li.classList.add('custom');
    return li;
  }

  /* ---------- Eventos ---------- */
  xpInput.oninput = () => { state.xp = Math.max(0, Number(xpInput.value) || 0); save(); render(); };
  xpInput.onblur = render;
  q('.xp-form').onsubmit = e => {
    e.preventDefault();
    const input = e.target.querySelector('input');
    const gain = Math.max(0, Math.floor(Number(input.value) || 0));
    if (!gain) return;
    const before = levelForXp(state.xp);
    state.xp += gain;
    input.value = '';
    save(); render();
    status.textContent = '+' + fmt(gain) + ' XP' + (levelForXp(state.xp) > Math.max(before, state.level) ? ' · você pode subir de nível!' : '');
  };
  upBtn.onclick = () => {
    const target = state.level + 1;
    const unlocks = allMilestones().filter(m => m.level === target);
    setLevel(target);
    rollResult('Nível ' + target, '⬆', unlocks.length ? 'Destravado: ' + unlocks.map(m => m.text).join(' · ') + '. Lembre de aumentar o PV máximo.' : 'Nenhum marco registrado neste nível. Lembre de aumentar o PV máximo.');
    card.classList.add('leveled');
    setTimeout(() => card.classList.remove('leveled'), 1600);
  };
  autoBox.onchange = () => { state.autoProf = autoBox.checked; summary(); save(); };
  $('#prof').addEventListener('input', () => { if (state.autoProf) { state.autoProf = false; autoBox.checked = false; status.textContent = 'Proficiência manual — PB automático desligado.'; save(); } });
  $('#level').addEventListener('input', () => render());
  q('.milestone-add').onsubmit = e => {
    e.preventDefault();
    const [lvl, text] = e.target.querySelectorAll('input');
    state.milestones.push({ level: Math.min(20, Math.max(1, Math.floor(Number(lvl.value) || 1))), text: text.value.trim() });
    text.value = '';
    save(); render();
  };

  const baseSummary = summary;
  summary = function () {
    if (state.autoProf) {
      state.prof = pbFor(state.level);
      if (document.activeElement !== $('#prof')) $('#prof').value = state.prof;
    }
    baseSummary();
  };

  summary();
  render();
  save();
})();
