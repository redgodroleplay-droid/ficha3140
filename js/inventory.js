/* Inventário com Durabilidade de Armas e Armaduras (regra opcional da mesa)
   e calculadora de desgaste. Vale para os itens do inventário (meta em
   state.items[i][2]) e para as armas do Arsenal maldito (state.cursedWeapons[i].dur).
   Tudo viaja no backup JSON via window.extendBackup. */
(() => {
  /* ---------- Regras ---------- */
  const GEAR = {
    'w-improv': { kind: 'weapon', label: 'Arma improvisada', pd: 10 },
    'w-wood': { kind: 'weapon', label: 'Arma simples de madeira', pd: 20 },
    'w-metal': { kind: 'weapon', label: 'Arma simples de metal', pd: 34 },
    'w-martial': { kind: 'weapon', label: 'Arma marcial', pd: 46 },
    'w-heavy': { kind: 'weapon', label: 'Arma pesada de duas mãos', pd: 60 },
    'a-light': { kind: 'armor', label: 'Armadura leve', pd: 25 },
    'a-medium': { kind: 'armor', label: 'Armadura média', pd: 40 },
    'a-heavy': { kind: 'armor', label: 'Armadura pesada', pd: 60 },
    'shield': { kind: 'shield', label: 'Escudo', pd: 35 }
  };
  const GEAR_GROUPS = [['Armas', ['w-improv', 'w-wood', 'w-metal', 'w-martial', 'w-heavy']], ['Armaduras', ['a-light', 'a-medium', 'a-heavy']], ['Escudo', ['shield']]];
  const RARITY = {
    comum: { label: 'Comum', bonus: 0, cut: 0 },
    incomum: { label: 'Incomum', bonus: 25, cut: 1 },
    raro: { label: 'Raro', bonus: 50, cut: 2 },
    'muito-raro': { label: 'Muito raro', bonus: 83, cut: 3 },
    lendario: { label: 'Lendário', bonus: 125, cut: 5 },
    artefato: { label: 'Artefato', bonus: 0, cut: 0, immune: true }
  };
  const MATERIAL = { metal: ['Metal', 'ferramentas de ferreiro'], madeira: ['Madeira', 'ferramentas de carpinteiro'], couro: ['Couro', 'ferramentas de coureiro'] };
  const STATE_LABEL = { conservado: 'Conservado', desgastado: 'Desgastado', danificado: 'Danificado', critico: 'Crítico', quebrado: 'Quebrado', artefato: 'Artefato' };
  const EVENTS = {
    weapon: [
      { k: 'use', label: 'Atacou neste combate', n: 1, once: true },
      { k: 'crit', label: 'Acerto crítico', n: 2 },
      { k: 'fumble', label: 'Falha crítica (1 natural)', n: 5 },
      { k: 'hard', label: 'Golpeou superfície resistente', n: 3 },
      { k: 'parry', label: 'Aparou golpe devastador', n: 5 }
    ],
    armor: [
      { k: 'use', label: 'Portador sofreu dano', n: 1, once: true },
      { k: 'critIn', label: 'Recebeu acerto crítico', n: 3 },
      { k: 'down', label: 'Portador caiu a 0 PV', n: 5 },
      { k: 'corrode', label: 'Corrosão / destruição material', n: [2, 5] }
    ],
    shield: [
      { k: 'use', label: 'Portador foi alvo de ataque', n: 1, once: true },
      { k: 'critIn', label: 'Crítico atingiu o escudo', n: 3 },
      { k: 'block', label: 'Bloqueou impacto destrutivo', n: 5 }
    ]
  };

  const int = (v, d = 0) => {
    if (v === undefined || v === null || String(v).trim() === '') return d;
    const n = Math.floor(Number(String(v).replace(',', '.')));
    return Number.isFinite(n) ? n : d;
  };
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const price = v => { const n = Number(String(v ?? '').replace(',', '.')); return Number.isFinite(n) && n > 0 ? n : 0; };

  function info(meta) {
    const g = meta && GEAR[meta.gear];
    if (!g) return null;
    const rarity = RARITY[meta.rarity] || RARITY.comum;
    return { ...g, rarity, max: g.pd + rarity.bonus, immune: !!rarity.immune, magic: (meta.rarity || 'comum') !== 'comum' };
  }
  function normalizeMeta(meta) {
    const i = info(meta);
    if (!i) return;
    if (!RARITY[meta.rarity]) meta.rarity = 'comum';
    meta.pd = clamp(int(meta.pd, i.max), 0, i.max);
    if (!Array.isArray(meta.combat)) meta.combat = [];
    if (!Array.isArray(meta.log)) meta.log = [];
  }
  /* Porcentagem arredondada para baixo; 0 PD é sempre Quebrado. */
  function stateOf(pd, max) {
    if (pd <= 0) return 'quebrado';
    const pct = Math.floor(pd * 100 / max);
    return pct > 50 ? 'conservado' : pct > 25 ? 'desgastado' : pct > 10 ? 'danificado' : 'critico';
  }
  /* ×1,10 arredondado para cima, em inteiros para evitar erro de ponto flutuante. */
  const accelerate = net => (net > 0 ? Math.ceil(net * 11 / 10) : 0);
  const sunder = damage => Math.min(10, Math.max(1, Math.floor(Math.max(0, damage) / 4)));

  /* Resolve um combate: soma, redução mágica, Desgaste Acelerado e quebra.
     Durante o combate o desgaste é provisório (já descontada a redução mágica);
     se o item estiver Crítico e sofrer 5+ PD de uma só fonte, quebra na hora. */
  function resolveCombat(pd, max, events, cut, immune) {
    const raw = events.reduce((a, e) => a + e.n, 0);
    if (immune) return { raw, cut: 0, net: 0, final: 0, after: pd, broke: false, reason: 'Artefato: não sofre desgaste convencional.' };
    let cum = 0, reason = '';
    for (const e of events) {
      const before = pd - Math.max(0, cum - cut);
      cum += e.n;
      const now = pd - Math.max(0, cum - cut);
      if (reason || before <= 0) continue;
      if (stateOf(before, max) === 'critico' && e.n >= 5) reason = 'Estava Crítico e perdeu ' + e.n + ' PD de uma só fonte (' + e.label + ').';
      else if (now <= 0) reason = 'Chegou a 0 PD em: ' + e.label + '.';
    }
    const net = Math.max(0, raw - cut), final = accelerate(net);
    const after = reason ? 0 : Math.max(0, pd - final);
    if (!reason && after === 0 && pd > 0) reason = 'Chegou a 0 PD com o Desgaste Acelerado.';
    return { raw, cut, net, final, after, broke: after === 0 && pd > 0, reason };
  }
  function penalties(kind, st, magic) {
    const p = [];
    const ac = kind === 'armor' ? 'CA da armadura −1.' : 'Bônus de CA do escudo −1.';
    if (st === 'danificado') p.push(kind === 'weapon' ? '−1 nas jogadas de dano (mínimo 1 de dano total).' : ac);
    if (st === 'critico') {
      p.push(kind === 'weapon' ? '−1 nas jogadas de ataque e de dano.' : ac);
      p.push('Perder 5 PD ou mais de uma só fonte o quebra na hora.');
    }
    if (st === 'quebrado') {
      p.push(kind === 'weapon' ? 'Não funciona como arma da sua categoria; os fragmentos podem virar arma improvisada (Mestre).'
        : kind === 'armor' ? 'Não fornece a CA base; se vestida, mantém peso, deslocamento e desvantagens.' : 'Não concede bônus de CA.');
      if (magic) p.push('Propriedades mágicas suspensas até o reparo.');
      p.push('Só um profissional pode restaurá-lo.');
    }
    if (st === 'desgastado') p.push('Marcas evidentes, sem penalidades.');
    if (st === 'conservado') p.push('Sem penalidades.');
    return p;
  }
  function repairCost(base, restored) {
    if (!(base > 0) || restored <= 0) return null;
    return Math.max(1, Math.round(base * 0.01 * restored / 10 * 100) / 100);
  }
  function coins(value) {
    const cents = Math.round(value * 100), po = Math.floor(cents / 100), pp = Math.floor(cents % 100 / 10), pc = cents % 10;
    const text = value.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' PO';
    const parts = [po && po + ' PO', pp && pp + ' PP', pc && pc + ' PC'].filter(Boolean);
    return parts.length > 1 ? text + ' (' + parts.join(', ') + ')' : text;
  }
  window.durability = { GEAR, RARITY, info, stateOf, accelerate, sunder, resolveCombat, repairCost };

  /* ---------- Arsenal maldito ---------- */
  function guessRarity(text) {
    const t = String(text || '').toLocaleLowerCase();
    if (/artefato/.test(t)) return 'artefato';
    if (/lend[aá]ri/.test(t)) return 'lendario';
    if (/muito\s*rar/.test(t)) return 'muito-raro';
    if (/\brar[oa]/.test(t)) return 'raro';
    if (/incomum/.test(t)) return 'incomum';
    return 'comum';
  }
  function guessGear(text) {
    const t = String(text || '').toLocaleLowerCase();
    if (/improvis/.test(t)) return 'w-improv';
    if (/duas m[aã]os|montante|nodachi|[oō]dachi|grande/.test(t)) return 'w-heavy';
    if (/adaga|faca|punhal|tant[oō]/.test(t)) return 'w-metal';
    return 'w-martial';
  }
  /* Durabilidade de uma arma amaldiçoada (criada na primeira vez que aparece). */
  function cursedDur(w) {
    if (!w.dur || typeof w.dur !== 'object' || !GEAR[w.dur.gear]) {
      w.dur = { gear: guessGear(w.type), rarity: guessRarity(w.rarity), material: 'metal' };
    }
    normalizeMeta(w.dur);
    return w.dur;
  }
  const cursedName = w => w.name || 'Arma amaldiçoada';

  /* ---------- Migração e backup ---------- */
  if (!state.durabilityV1) {
    const guess = { 'katana': ['w-martial', 'metal'], 'faca pequena': ['w-metal', 'metal'], 'besta leve': ['w-wood', 'madeira'] };
    state.items.forEach(item => {
      const g = guess[String(item[0]).trim().toLocaleLowerCase()];
      if (!g || (item[2] && item[2].gear)) return;
      item[2] ||= {};
      Object.assign(item[2], { gear: g[0], material: g[1], rarity: 'comum' });
    });
    state.durabilityV1 = true;
  }
  state.items.forEach(item => normalizeMeta(item[2]));

  function sanitizeMeta(m, out) {
    if (GEAR[m.gear]) out.gear = m.gear;
    if (RARITY[m.rarity]) out.rarity = m.rarity;
    if (MATERIAL[m.material]) out.material = m.material;
    if (Number.isFinite(m.pd)) out.pd = m.pd;
    if (typeof m.price === 'string' || Number.isFinite(m.price)) out.price = String(m.price).slice(0, 20);
    for (const f of ['maintShort', 'maintLong']) if (typeof m[f] === 'boolean') out[f] = m[f];
    if (Array.isArray(m.combat)) out.combat = m.combat.filter(e => e && typeof e.k === 'string' && Number.isFinite(e.n))
      .slice(0, 100).map(e => ({ k: e.k.slice(0, 20), label: String(e.label || '').slice(0, 80), n: clamp(int(e.n), 0, 200) }));
    if (Array.isArray(m.log)) out.log = m.log.filter(e => e && typeof e.t === 'string').slice(0, 8).map(e => ({ d: String(e.d || '').slice(0, 20), t: e.t.slice(0, 240) }));
    normalizeMeta(out);
    return out;
  }
  const previousExtend = window.extendBackup;
  window.extendBackup = (data, clean) => {
    if (typeof previousExtend === 'function') previousExtend(data, clean);
    if (data.durabilityV1 === true) clean.durabilityV1 = true;
    data.items.forEach((raw, i) => {
      const m = Array.isArray(raw) ? raw[2] : null;
      if (!m || typeof m !== 'object' || !clean.items[i]) return;
      sanitizeMeta(m, clean.items[i][2] ||= {});
    });
    /* o Arsenal filtra as armas do mesmo jeito: os índices batem */
    if (Array.isArray(data.cursedWeapons) && Array.isArray(clean.cursedWeapons)) {
      data.cursedWeapons.filter(w => w && typeof w === 'object').forEach((w, i) => {
        if (w.dur && typeof w.dur === 'object' && GEAR[w.dur.gear] && clean.cursedWeapons[i]) clean.cursedWeapons[i].dur = sanitizeMeta(w.dur, {});
      });
    }
  };

  /* ---------- Utilidades de interface ---------- */
  function select(options, value, onChange, label) {
    const s = el('select');
    if (label) s.setAttribute('aria-label', label);
    for (const opt of options) {
      if (Array.isArray(opt[1])) {
        const group = el('optgroup'); group.label = opt[0];
        opt[1].forEach(([v, t]) => { const o = el('option', t); o.value = v; group.append(o); });
        s.append(group);
      } else { const o = el('option', opt[1]); o.value = opt[0]; s.append(o); }
    }
    s.value = value;
    s.onchange = () => onChange(s.value);
    return s;
  }
  const gearOptions = (withNone, only) => [...(withNone ? [['', 'Sem durabilidade']] : []),
    ...GEAR_GROUPS.filter(([g]) => !only || g === only).map(([g, keys]) => [g, keys.map(k => [k, GEAR[k].label + ' · ' + GEAR[k].pd + ' PD'])])];
  const rarityOptions = () => Object.entries(RARITY).map(([k, r]) => [k, r.label + (r.immune ? ' · sem desgaste' : r.bonus ? ' · +' + r.bonus + ' PD, −' + r.cut + '/combate' : '')]);
  const materialOptions = () => Object.entries(MATERIAL).map(([k, [label]]) => [k, label]);
  function wrap(label, control, cls) { const w = el('label', label, 'editor-label ' + (cls || '')); w.append(control); return w; }
  function numberInput(value, min, max, label) {
    const n = el('input'); n.type = 'number'; n.inputMode = 'numeric'; n.value = value;
    if (min !== undefined) n.min = min; if (max !== undefined) n.max = max;
    if (label) n.setAttribute('aria-label', label);
    return n;
  }
  function meterEl(meta, i, big) {
    const st = i.immune ? 'artefato' : stateOf(meta.pd, i.max);
    const bar = el('span', undefined, 'pd-meter' + (big ? ' big' : ''));
    bar.dataset.state = st;
    const fill = el('i');
    fill.style.width = (i.immune ? 100 : meta.pd / i.max * 100) + '%';
    bar.append(fill);
    /* marcas dos limites de estado (50%, 25%, 10%) */
    if (big) for (const p of [50, 25, 10]) { const t = el('b'); t.style.left = p + '%'; bar.append(t); }
    return bar;
  }
  const pendingOf = meta => (meta?.combat || []).reduce((a, e) => a + e.n, 0);
  function logIt(meta, text) {
    meta.log.unshift({ d: new Date().toLocaleDateString('pt-BR'), t: text });
    meta.log.length = Math.min(meta.log.length, 8);
  }
  const firstDice = text => (String(text || '').match(/\d*d\d+(?:\s*[+-]\s*(?:\d*d\d+|\d+|FOR|DES|CON|INT|SAB|CAR|PB|NIV))*/i) || [])[0];

  /* Redesenha tudo que mostra durabilidade. */
  function refresh() { renderItems(); renderArsenal(); }

  /* ---------- Lista ---------- */
  let filter = 'all', selected = -1;
  const FILTERS = [['all', 'Todos'], ['equipped', 'Equipados'], ['weapon', 'Armas'], ['armor', 'Armaduras'], ['shield', 'Escudos'], ['repair', 'Precisam de reparo'], ['other', 'Outros']];
  function matches(item, f) {
    const meta = item[2] || {}, i = info(meta);
    if (f === 'equipped') return !!meta.equipped;
    if (['weapon', 'armor', 'shield'].includes(f)) return i?.kind === f;
    if (f === 'repair') return !!i && !i.immune && ['danificado', 'critico', 'quebrado'].includes(stateOf(meta.pd, i.max));
    if (f === 'other') return !i;
    return true;
  }
  function renderFilters() {
    const root = $('#item-filters');
    root.replaceChildren();
    for (const [k, label] of FILTERS) {
      const count = state.items.filter(it => matches(it, k)).length;
      if (k !== 'all' && k !== filter && !count) continue;
      const b = el('button', label + ' ', 'inv-chip');
      b.type = 'button';
      b.append(el('small', String(count)));
      b.setAttribute('aria-pressed', String(filter === k));
      b.onclick = () => { filter = k; renderList(); };
      root.append(b);
    }
  }
  function renderList() {
    const root = $('#items');
    const query = $('#item-search').value.trim().toLocaleLowerCase();
    root.replaceChildren();
    let shown = 0;
    state.items.forEach((item, idx) => {
      const meta = item[2] || {}, i = info(meta);
      const text = [item[0], meta.category, meta.notes, i?.label, i?.rarity.label].join(' ').toLocaleLowerCase();
      if (!matches(item, filter) || !text.includes(query)) return;
      shown++;
      const row = el('div', undefined, 'item inv-item');
      row.dataset.idx = idx;
      row.classList.toggle('selected', idx === selected);
      row.classList.toggle('equipped', !!meta.equipped);
      const btn = el('button', undefined, 'inventory-name');
      btn.type = 'button';
      btn.setAttribute('aria-pressed', String(idx === selected));
      btn.append(el('span', item[0], 'inv-title'));
      const sub = [i ? i.label + (i.magic ? ' · ' + i.rarity.label : '') : meta.category || 'Item'];
      if (meta.equipped) sub.push('Equipado');
      btn.append(el('small', sub.join(' · '), 'inv-sub'));
      if (i) {
        const st = i.immune ? 'artefato' : stateOf(meta.pd, i.max);
        row.dataset.state = st;
        btn.append(meterEl(meta, i), el('span', (i.immune ? '∞' : meta.pd + '/' + i.max + ' PD') + ' · ' + STATE_LABEL[st], 'pd-text'));
        if (meta.combat.length) btn.append(el('span', '⚔ ' + pendingOf(meta) + ' PD em combate', 'pd-pending'));
      }
      btn.onclick = () => {
        selected = selected === idx ? -1 : idx;
        renderList(); renderItemDetail();
        $('#items [data-idx="' + idx + '"] .inventory-name')?.focus();
        if (selected === idx && matchMedia('(max-width: 979px)').matches) $('#item-detail').scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
      const qty = numberInput(item[1], 0, undefined, 'Quantidade de ' + item[0]);
      qty.onchange = () => { item[1] = Math.max(0, int(qty.value)); qty.value = item[1]; save(); };
      const del = el('button', '×');
      del.type = 'button';
      del.setAttribute('aria-label', 'Remover ' + item[0]);
      del.onclick = () => {
        if (!confirm('Remover “' + item[0] + '” do inventário?')) return;
        state.items.splice(idx, 1);
        if (selected === idx) selected = -1; else if (selected > idx) selected--;
        save(); renderItems();
      };
      row.append(btn, qty, del);
      root.append(row);
    });
    if (!shown) root.append(el('p', state.items.length ? 'Nenhum item neste filtro.' : 'O inventário está vazio.', 'footnote inv-empty'));
    renderFilters();
  }

  /* ---------- Ações de durabilidade (inventário e Arsenal) ----------
     target = { name, meta, box } — box é o bloco que mostra o status. */
  function notify(target, text) {
    const status = target.box?.isConnected ? target.box.querySelector('.dur-status') : null;
    if (status) status.textContent = text; else alert(text);
  }
  function directLoss(meta, n, why) {
    const i = info(meta), before = meta.pd;
    let after = Math.max(0, before - n), extra = '';
    if (before > 0 && after > 0 && stateOf(before, i.max) === 'critico' && n >= 5) { after = 0; extra = ' · estava Crítico: 5+ PD de uma só fonte, quebrou'; }
    meta.pd = after;
    logIt(meta, why + ': −' + (before - after) + ' PD (' + before + ' → ' + after + ')' + extra);
    return after === 0 && before > 0;
  }
  function selfRepair(target, mode) {
    const { meta, name } = target, i = info(meta);
    if (meta.pd <= 0) return notify(target, 'Equipamento quebrado: só um profissional pode restaurá-lo.');
    if (meta.pd >= i.max) return notify(target, 'Já está com a durabilidade máxima.');
    const flag = mode === 'short' ? 'maintShort' : 'maintLong';
    if (meta[flag]) return notify(target, mode === 'short' ? 'A manutenção já foi feita neste descanso curto.' : 'O reparo já foi feito neste descanso longo.');
    const tool = MATERIAL[meta.material]?.[1] || 'ferramentas apropriadas';
    if (!confirm((mode === 'short' ? 'Manutenção (descanso curto, 10 min)' : 'Reparo (descanso longo, 1 h)') + ' em “' + name + '”.\n\nExige ' + tool + ' e proficiência com elas. Continuar?')) return;
    const pb = int(state.prof, 2);
    const dice = mode === 'short' ? [die(6)] : [die(10), die(10)];
    const gain = dice.reduce((a, b) => a + b, 0) + pb, before = meta.pd;
    meta.pd = Math.min(i.max, before + gain);
    meta[flag] = true;
    logIt(meta, (mode === 'short' ? 'Manutenção' : 'Reparo no descanso longo') + ': +' + (meta.pd - before) + ' PD (' + before + ' → ' + meta.pd + ')');
    save(); refresh();
    rollResult((mode === 'short' ? 'Manutenção · ' : 'Reparo · ') + name, '+' + (meta.pd - before),
      (mode === 'short' ? '1d6' : '2d10') + ' [' + dice.join(', ') + '] + PB ' + pb + ' = ' + gain + ' · PD ' + before + ' → ' + meta.pd + ' / ' + i.max);
  }
  function proRepair(target) {
    const { meta, name } = target, i = info(meta), restored = i.max - meta.pd;
    if (restored <= 0) return notify(target, 'Já está com a durabilidade máxima.');
    const base = price(meta.price);
    if (!base) return notify(target, 'Informe o preço original (PO) para calcular o custo do reparo.');
    const cost = repairCost(base, restored);
    const gold = Number(state.gold) || 0;
    if (cost > gold) return notify(target, 'Reparo custa ' + coins(cost) + ', mas há só ' + coins(gold) + '.');
    const extra = meta.pd <= 0 && i.magic ? '\n\nItem mágico quebrado: pode exigir artesão especializado, materiais raros ou procedimentos arcanos.' : '';
    if (!confirm('Reparo profissional de “' + name + '”: restaurar ' + restored + ' PD por ' + coins(cost) + '.\nO valor sai do ouro (' + coins(gold) + '). O tempo de reparo fica a cargo do Mestre.' + extra)) return;
    state.gold = Math.round((gold - cost) * 100) / 100;
    $('#gold').value = state.gold;
    const before = meta.pd;
    meta.pd = i.max;
    logIt(meta, 'Reparo profissional: ' + before + ' → ' + i.max + ' PD por ' + coins(cost));
    save(); refresh();
    notify(target, 'Restaurado por ' + coins(cost) + '.');
  }

  /* Bloco de durabilidade reutilizado no detalhe do item e nos cartões do Arsenal.
     opts: { allowNone, only (grupo de tipos), onGear(v) } */
  function durabilityBox(target, opts = {}) {
    const { meta } = target;
    const box = el('section', undefined, 'dur-box');
    target.box = box;
    box.append(el('div', 'DURABILIDADE', 'eyebrow'));
    const i = info(meta);
    const grid = el('div', undefined, 'dur-grid');
    grid.append(wrap('Tipo de equipamento', select(gearOptions(opts.allowNone, opts.only), meta.gear || '', v => {
      const had = info(meta), wasFull = !had || meta.pd >= had.max;
      if (!v) { delete meta.gear; } else { meta.gear = v; if (!meta.material) meta.material = v === 'w-wood' ? 'madeira' : v === 'a-light' ? 'couro' : 'metal'; }
      if (v) { if (wasFull) meta.pd = info(meta).max; normalizeMeta(meta); }
      save(); refresh();
    }, 'Tipo de equipamento')));
    if (i) {
      grid.append(wrap('Raridade', select(rarityOptions(), meta.rarity || 'comum', v => {
        const wasFull = meta.pd >= i.max;
        meta.rarity = v;
        if (wasFull) meta.pd = info(meta).max;
        normalizeMeta(meta); save(); refresh();
      }, 'Raridade')));
      grid.append(wrap('Material (ferramentas)', select(materialOptions(), meta.material || 'metal', v => { meta.material = v; save(); }, 'Material')));
      const priceIn = el('input'); priceIn.inputMode = 'decimal'; priceIn.value = meta.price || ''; priceIn.placeholder = 'ex.: 15';
      priceIn.onchange = () => { meta.price = priceIn.value.trim(); save(); refresh(); };
      grid.append(wrap('Preço original (PO)', priceIn));
    }
    box.append(grid);
    if (!i) {
      box.append(el('p', 'Escolha um tipo para controlar a durabilidade (armas, armaduras e escudos).', 'detail'));
      return box;
    }

    const st = i.immune ? 'artefato' : stateOf(meta.pd, i.max);
    box.dataset.state = st;
    const pdRow = el('div', undefined, 'pd-row');
    const pdIn = numberInput(meta.pd, 0, i.max, 'Pontos de Durabilidade atuais');
    pdIn.onchange = () => { meta.pd = clamp(int(pdIn.value, meta.pd), 0, i.max); save(); refresh(); };
    const value = el('div', undefined, 'pd-value');
    value.append(pdIn, el('span', '/ ' + i.max + ' PD'));
    const label = el('strong', STATE_LABEL[st], 'pd-state');
    label.dataset.state = st;
    pdRow.append(value, label);
    box.append(pdRow, meterEl(meta, i, true));
    const pen = el('ul', undefined, 'pd-penalties');
    (i.immune ? ['Não sofre desgaste convencional, salvo circunstâncias extraordinárias (Mestre).'] : penalties(i.kind, st, i.magic)).forEach(t => pen.append(el('li', t)));
    box.append(pen);
    if (meta.combat.length) box.append(el('p', '⚔ ' + pendingOf(meta) + ' PD registrados no combate atual (ainda não aplicados).', 'pd-pending'));

    const actions = el('div', undefined, 'dur-actions');
    const pb = int(state.prof, 2);
    const shortBtn = el('button', meta.maintShort ? 'Manutenção feita ✓' : 'Manutenção · 1d6+' + pb);
    shortBtn.type = 'button';
    shortBtn.title = 'Descanso curto, 10 minutos';
    shortBtn.disabled = meta.maintShort || meta.pd <= 0 || meta.pd >= i.max;
    shortBtn.onclick = () => selfRepair(target, 'short');
    const longBtn = el('button', meta.maintLong ? 'Reparo feito ✓' : 'Reparo · 2d10+' + pb);
    longBtn.type = 'button';
    longBtn.title = 'Descanso longo, 1 hora de atividade leve';
    longBtn.disabled = meta.maintLong || meta.pd <= 0 || meta.pd >= i.max;
    longBtn.onclick = () => selfRepair(target, 'long');
    const cost = repairCost(price(meta.price), i.max - meta.pd);
    const proBtn = el('button', 'Ferreiro' + (cost ? ' · ' + coins(cost) : ''), meta.pd <= 0 ? 'red' : '');
    proBtn.type = 'button';
    proBtn.title = 'Reparo profissional: 1% do preço a cada 10 PD, mínimo 1 PO';
    proBtn.disabled = meta.pd >= i.max;
    proBtn.onclick = () => proRepair(target);
    const fight = el('button', '⚔ Registrar combate');
    fight.type = 'button';
    fight.onclick = () => {
      calcTarget = meta;
      if (!$('#inventario').classList.contains('active')) openTab('inventario');
      renderCalc();
      calc.scrollIntoView({ behavior: 'smooth', block: 'start' });
      calc.querySelector('select')?.focus({ preventScroll: true });
    };
    actions.append(shortBtn, longBtn, proBtn, fight);
    box.append(actions, el('small', 'Ferramentas: ' + (MATERIAL[meta.material]?.[1] || 'apropriadas') + ', com proficiência. Uma vez por descanso; não restaura item quebrado.', 'dur-hint'));

    const loss = el('form', undefined, 'dur-loss');
    const lossIn = numberInput(1, 1, 200, 'PD perdidos fora de combate');
    loss.append(el('span', 'Fora de combate'), lossIn, el('button', 'Aplicar perda'));
    loss.onsubmit = e => {
      e.preventDefault();
      const n = Math.max(0, int(lossIn.value));
      if (!n) return;
      const broke = directLoss(meta, n, 'Fora de combate');
      save(); refresh();
      notify(target, broke ? target.name + ' quebrou.' : '−' + n + ' PD aplicados (sem Desgaste Acelerado).');
    };
    box.append(loss);
    const status = el('p', '', 'session-status dur-status');
    status.setAttribute('role', 'status');
    box.append(status);
    if (meta.log.length) {
      const hist = el('details', undefined, 'dur-log');
      hist.append(el('summary', 'Histórico de desgaste (' + meta.log.length + ')'));
      const ol = el('ol');
      meta.log.forEach(l => ol.append(el('li', l.d + ' · ' + l.t)));
      hist.append(ol);
      box.append(hist);
    }
    return box;
  }

  /* ---------- Detalhe do item ---------- */
  renderItemDetail = function () {
    const panel = $('#item-detail');
    const item = state.items[selected];
    panel.hidden = !item;
    panel.replaceChildren();
    if (!item) return;
    const meta = item[2] ||= {};
    const head = el('header', undefined, 'detail-head');
    const close = el('button', '×', 'icon-btn');
    close.type = 'button';
    close.setAttribute('aria-label', 'Fechar detalhes');
    close.onclick = () => { const idx = selected; selected = -1; renderList(); renderItemDetail(); $('#items [data-idx="' + idx + '"] .inventory-name')?.focus(); };
    head.append(el('h3', item[0]), close);
    panel.append(head, durabilityBox({ name: item[0], meta }, { allowNone: true }));

    /* Dados gerais */
    const fields = el('details', undefined, 'item-fields');
    fields.open = !info(meta);
    fields.append(el('summary', 'Descrição, dano e notas'));
    for (const [key, label] of [['category', 'Categoria'], ['weight', 'Peso unitário'], ['damage', 'Dano'], ['properties', 'Propriedades'], ['description', 'Descrição'], ['notes', 'Observações']]) {
      fields.append(labeledField(label, meta[key], v => { meta[key] = v; save(); }, ['description', 'notes'].includes(key)));
    }
    panel.append(fields);
    const tools = el('div', undefined, 'detail-actions');
    const equip = el('button', meta.equipped ? 'Desequipar' : 'Equipar', meta.equipped ? '' : 'red');
    equip.onclick = () => { meta.equipped = !meta.equipped; save(); renderItems(); };
    tools.append(equip);
    if (firstDice(meta.damage)) {
      const dmg = el('button', 'Rolar dano');
      dmg.onclick = () => window.rollExpr('Dano · ' + item[0], firstDice(meta.damage));
      tools.append(dmg);
    }
    panel.append(tools);
  };

  /* ---------- Durabilidade nos cartões do Arsenal ---------- */
  function renderArsenal() {
    const root = $('#cursed-weapons');
    if (!root) return;
    [...root.children].forEach((card, i) => {
      const w = state.cursedWeapons[i];
      if (!w || !card.classList.contains('cursed')) return;
      const meta = cursedDur(w);
      const box = durabilityBox({ name: cursedName(w), meta }, { only: 'Armas' });
      box.classList.add('cursed-dur');
      const old = card.querySelector(':scope > .cursed-dur');
      if (old) { old.replaceWith(box); return; }
      const anchor = card.querySelector(':scope > .cursed-meters') || card.querySelector(':scope > .cursed-activate');
      if (anchor) anchor.after(box); else card.append(box);
    });
  }
  const arsenalRoot = $('#cursed-weapons');
  if (arsenalRoot) new MutationObserver(() => {
    /* só desenha nos cartões novos (o Arsenal recria um cartão ao mudar) */
    [...arsenalRoot.children].some(card => card.classList.contains('cursed') && !card.querySelector(':scope > .cursed-dur')) && renderArsenal();
  }).observe(arsenalRoot, { childList: true });

  /* ---------- Calculadora de combate ---------- */
  const calc = el('article', undefined, 'card wear-calc');
  calc.id = 'wear-calc';
  const free = { gear: 'w-martial', rarity: 'comum', pd: 46, combat: [], log: [] };
  let calcTarget = null; /* meta do equipamento escolhido, ou 'free' */

  /* Todos os equipamentos com durabilidade: inventário e Arsenal maldito. */
  function entries() {
    const list = [];
    state.items.forEach(it => { if (info(it[2])) list.push({ name: it[0], meta: it[2], group: it[2].equipped ? 'Equipados' : 'Na bolsa' }); });
    (state.cursedWeapons || []).forEach(w => list.push({ name: cursedName(w), meta: cursedDur(w), group: 'Arsenal maldito' }));
    return list;
  }

  function endCombat(entry) {
    const { meta } = entry, i = info(meta), before = meta.pd;
    const r = resolveCombat(before, i.max, meta.combat, i.rarity.cut, i.immune);
    meta.pd = r.after;
    logIt(meta, 'Combate: ' + r.raw + ' registrado' + (r.cut ? ', −' + r.cut + ' mágico' : '') + ' → ' + r.final + ' final (' + before + ' → ' + r.after + ')' + (r.broke ? ' · QUEBROU' : ''));
    meta.combat = [];
    return entry.name + ': −' + (before - r.after) + ' PD (' + before + ' → ' + r.after + ' / ' + i.max + ') · ' + STATE_LABEL[i.immune ? 'artefato' : stateOf(r.after, i.max)] + (r.broke ? ' · ' + r.reason : '');
  }

  function renderCalc() {
    const focusKey = calc.contains(document.activeElement) ? document.activeElement.dataset.fk : null;
    calc.replaceChildren();
    const title = el('div', 'CALCULADORA DE DESGASTE ', 'card-label');
    title.append(el('span', '摩耗'));
    calc.append(title, el('p', 'Marque o que aconteceu com cada equipamento durante o combate. Ao encerrar, a calculadora desconta a resistência mágica e aplica o Desgaste Acelerado (×1,10, arredondado para cima) uma única vez.', 'detail'));

    const list = entries();
    if (calcTarget !== 'free' && !list.some(e => e.meta === calcTarget)) calcTarget = (list.find(e => e.group === 'Equipados') || list[0])?.meta || 'free';
    const options = [];
    for (const g of ['Equipados', 'Arsenal maldito', 'Na bolsa']) {
      const group = list.map((e, k) => [e, k]).filter(([e]) => e.group === g);
      if (group.length) options.push([g, group.map(([e, k]) => [String(k), e.name + (e.meta.combat.length ? ' · ⚔ ' + pendingOf(e.meta) : '')])]);
    }
    options.push(['Simulação', [['free', 'Equipamento avulso (não salva)']]]);
    const top = el('div', undefined, 'calc-top');
    const current = list.find(e => e.meta === calcTarget);
    const pick = select(options, calcTarget === 'free' ? 'free' : String(list.indexOf(current)), v => { calcTarget = v === 'free' ? 'free' : list[Number(v)].meta; renderCalc(); }, 'Equipamento');
    pick.dataset.fk = 'pick';
    top.append(wrap('Equipamento', pick));
    const isFree = calcTarget === 'free';
    const meta = isFree ? free : calcTarget;
    if (isFree) {
      const g = select(gearOptions(false), free.gear, v => { free.gear = v; free.pd = info(free).max; free.combat = []; renderCalc(); }, 'Tipo');
      g.dataset.fk = 'free-gear';
      const r = select(rarityOptions(), free.rarity, v => { free.rarity = v; free.pd = info(free).max; renderCalc(); }, 'Raridade');
      r.dataset.fk = 'free-rarity';
      const pdIn = numberInput(free.pd, 0, info(free).max, 'PD atuais');
      pdIn.dataset.fk = 'free-pd';
      pdIn.onchange = () => { free.pd = clamp(int(pdIn.value), 0, info(free).max); renderCalc(); };
      top.append(wrap('Tipo', g), wrap('Raridade', r), wrap('PD atuais', pdIn, 'narrow'));
    }
    calc.append(top);
    normalizeMeta(meta);
    const i = info(meta);
    const stNow = i.immune ? 'artefato' : stateOf(meta.pd, i.max);
    const now = el('p', undefined, 'calc-now');
    now.append(meterEl(meta, i), el('span', i.label + ' · ' + i.rarity.label + ' · ' + meta.pd + '/' + i.max + ' PD · ' + STATE_LABEL[stNow]));
    calc.append(now);

    const persist = () => {
      if (!isFree) { save(); renderList(); if (state.items[selected]?.[2] === meta) renderItemDetail(); if (current?.group === 'Arsenal maldito') renderArsenal(); }
      renderCalc();
    };
    const events = el('div', undefined, 'calc-events');
    events.setAttribute('role', 'group');
    events.setAttribute('aria-label', 'Acontecimentos do combate');
    EVENTS[i.kind].forEach(ev => {
      if (Array.isArray(ev.n)) {
        const box = el('div', undefined, 'ev-range');
        const amount = select(Array.from({ length: ev.n[1] - ev.n[0] + 1 }, (_, k) => [String(ev.n[0] + k), (ev.n[0] + k) + ' PD']), String(ev.n[0]), () => {}, 'PD de ' + ev.label);
        const b = el('button', ev.label, 'ev');
        b.type = 'button'; b.dataset.fk = 'ev-' + ev.k;
        b.onclick = () => { meta.combat.push({ k: ev.k, label: ev.label, n: int(amount.value) }); persist(); };
        box.append(b, amount);
        events.append(box);
        return;
      }
      const count = meta.combat.filter(e => e.k === ev.k).length;
      const b = el('button', ev.label + ' ', 'ev');
      b.type = 'button'; b.dataset.fk = 'ev-' + ev.k;
      b.append(el('small', (ev.once ? '' : '+') + ev.n + ' PD'));
      if (ev.once) b.setAttribute('aria-pressed', String(count > 0));
      else if (count) b.append(el('b', ' ×' + count));
      b.onclick = () => {
        if (ev.once && count) meta.combat = meta.combat.filter(e => e.k !== ev.k);
        else meta.combat.push({ k: ev.k, label: ev.label, n: ev.n });
        persist();
      };
      events.append(b);
    });
    calc.append(events);

    const extras = el('div', undefined, 'calc-extras');
    if (i.kind !== 'armor') {
      const f = el('form', undefined, 'calc-inline');
      const dmg = numberInput('', 0, 999, 'Dano do Golpe Destruidor'); dmg.placeholder = 'dano';
      dmg.dataset.fk = 'sunder-in';
      const b = el('button', 'Golpe Destruidor sofrido'); b.dataset.fk = 'sunder';
      f.append(dmg, b);
      f.onsubmit = e => { e.preventDefault(); if (dmg.value === '') return dmg.focus(); const d = Math.max(0, int(dmg.value)); meta.combat.push({ k: 'sunder', label: 'Golpe Destruidor (' + d + ' de dano)', n: sunder(d) }); persist(); };
      extras.append(f);
    }
    const f2 = el('form', undefined, 'calc-inline');
    const other = numberInput('', 1, 200, 'Outro desgaste em PD'); other.placeholder = 'PD';
    other.dataset.fk = 'other-in';
    const b2 = el('button', 'Outro desgaste (Mestre)'); b2.dataset.fk = 'other';
    f2.append(other, b2);
    f2.onsubmit = e => { e.preventDefault(); const n = Math.max(0, int(other.value)); if (!n) return other.focus(); meta.combat.push({ k: 'gm', label: 'Desgaste do Mestre', n }); persist(); };
    extras.append(f2);
    calc.append(extras);

    if (meta.combat.length) {
      const ol = el('ol', undefined, 'calc-log');
      meta.combat.forEach((e, k) => {
        const li = el('li');
        li.append(el('span', e.label), el('b', '−' + e.n));
        const x = el('button', '×', 'icon-btn'); x.type = 'button';
        x.setAttribute('aria-label', 'Remover ' + e.label);
        x.onclick = () => { meta.combat.splice(k, 1); persist(); };
        li.append(x);
        ol.append(li);
      });
      calc.append(ol);
    }

    const r = resolveCombat(meta.pd, i.max, meta.combat, i.rarity.cut, i.immune);
    const stAfter = i.immune ? 'artefato' : stateOf(r.after, i.max);
    const out = el('dl', undefined, 'calc-result');
    const line = (dt, dd, cls) => { const d = el('dd', dd); if (cls) d.className = cls; out.append(el('dt', dt), d); };
    line('Desgaste registrado', r.raw + ' PD');
    if (i.rarity.cut) line('Resistência mágica (' + i.rarity.label + ')', '−' + i.rarity.cut + ' → ' + r.net + ' PD');
    line('Desgaste Acelerado ×1,10 ↑', r.final + ' PD', 'big');
    line('Durabilidade', meta.pd + ' → ' + r.after + ' / ' + i.max + ' PD');
    line('Estado', STATE_LABEL[stNow] + (stAfter !== stNow ? ' → ' + STATE_LABEL[stAfter] : ''), 'state-' + stAfter);
    calc.append(out);
    if (r.reason && (r.broke || i.immune)) calc.append(el('p', (r.broke ? '⚠ Quebra: ' : '') + r.reason, 'calc-warn'));
    if (!i.immune && stAfter !== stNow) {
      const pen = el('ul', undefined, 'pd-penalties');
      penalties(i.kind, stAfter, i.magic).forEach(t => pen.append(el('li', t)));
      calc.append(pen);
    }

    const actions = el('div', undefined, 'calc-actions');
    if (!isFree) {
      const lost = meta.pd - r.after;
      const apply = el('button', 'Encerrar combate · aplicar −' + lost + ' PD', 'red');
      apply.dataset.fk = 'apply';
      apply.disabled = !meta.combat.length;
      apply.onclick = () => { const text = endCombat(current); save(); refresh(); rollResult('Fim do combate', '−' + lost + ' PD', text); };
      actions.append(apply);
      const pending = list.filter(e => e.meta.combat.length);
      if (pending.length > 1) {
        const all = el('button', 'Encerrar para todos (' + pending.length + ' itens)');
        all.dataset.fk = 'apply-all';
        all.onclick = () => { const lines = pending.map(endCombat); save(); refresh(); rollResult('Fim do combate', pending.length + ' itens', lines.join(' · ')); };
        actions.append(all);
      }
    }
    const clear = el('button', isFree ? 'Limpar simulação' : 'Limpar registros');
    clear.dataset.fk = 'clear';
    clear.disabled = !meta.combat.length;
    clear.onclick = () => { meta.combat = []; persist(); };
    actions.append(clear);
    calc.append(actions);
    if (focusKey) (calc.querySelector('[data-fk="' + focusKey + '"]:not(:disabled)') || calc.querySelector('[data-fk="pick"]'))?.focus();
  }

  /* ---------- Calculadoras rápidas ---------- */
  const quick = el('article', undefined, 'card wear-tools');
  (() => {
    const title = el('div', 'CÁLCULOS RÁPIDOS ', 'card-label');
    title.append(el('span', '算'));
    quick.append(title);
    const grid = el('div', undefined, 'tools-grid');

    const sunderBox = el('section', undefined, 'tool');
    const sDmg = numberInput(12, 0, 999, 'Dano que o ataque causaria');
    const sOut = el('output');
    const sCalc = () => { const d = Math.max(0, int(sDmg.value)); sOut.textContent = sunder(d) + ' PD perdidos' + (Math.floor(d / 4) > 10 ? ' (limite de 10)' : ''); };
    sDmg.oninput = sCalc;
    sunderBox.append(el('h4', 'Golpe Destruidor'), wrap('Dano que o ataque causaria', sDmg), sOut, el('small', 'máx(1, ⌊dano ÷ 4⌋), até 10 PD. Uma vez por turno.'));
    sCalc();

    const costBox = el('section', undefined, 'tool');
    const cPrice = numberInput(15, 0, undefined, 'Preço original em PO');
    const cPd = numberInput(20, 0, 999, 'PD a restaurar');
    const cOut = el('output');
    const cCalc = () => { const v = repairCost(price(cPrice.value), Math.max(0, int(cPd.value))); cOut.textContent = v ? coins(v) : 'Informe preço e PD'; };
    cPrice.oninput = cPd.oninput = cCalc;
    costBox.append(el('h4', 'Custo de reparo'), wrap('Preço original (PO)', cPrice), wrap('PD a restaurar', cPd), cOut, el('small', '1% do preço a cada 10 PD, proporcional, mínimo 1 PO.'));
    cCalc();

    const lifeBox = el('section', undefined, 'tool');
    const life = { gear: 'w-martial', rarity: 'comum' };
    const lPd = numberInput(46, 0, 999, 'PD atuais');
    const lWear = numberInput(1, 0, 99, 'Desgaste por combate');
    const lOut = el('output');
    const lCalc = () => {
      const i = info(life);
      lPd.max = i.max;
      const pd = clamp(int(lPd.value, i.max), 0, i.max);
      const final = i.immune ? 0 : accelerate(Math.max(0, Math.max(0, int(lWear.value)) - i.rarity.cut));
      lOut.textContent = i.immune ? 'Artefato: não se desgasta.' : !final ? 'Não perde PD com esse desgaste.' : final + ' PD por combate · ≈ ' + Math.ceil(pd / final) + ' combates até quebrar';
    };
    const lGear = select(gearOptions(false), life.gear, v => { life.gear = v; lPd.value = info(life).max; lCalc(); }, 'Tipo');
    const lRarity = select(rarityOptions(), life.rarity, v => { life.rarity = v; lPd.value = info(life).max; lCalc(); }, 'Raridade');
    lPd.oninput = lWear.oninput = lCalc;
    lifeBox.append(el('h4', 'Vida útil'), wrap('Tipo', lGear), wrap('Raridade', lRarity), wrap('PD atuais', lPd), wrap('Desgaste básico por combate', lWear), lOut, el('small', 'Sem manutenção, críticos ou golpes contra o equipamento.'));
    lCalc();

    grid.append(sunderBox, costBox, lifeBox);
    quick.append(grid);
  })();
  $('#inventario').append(calc, quick);

  /* ---------- Inventário: render geral, busca e adição ---------- */
  renderItems = function () {
    state.items.forEach(item => normalizeMeta(item[2]));
    if (selected >= state.items.length) selected = -1;
    renderList();
    renderItemDetail();
    renderCalc();
  };
  $('#item-search').oninput = renderList;
  const gearSelect = $('#item-gear');
  gearSelect.replaceWith(select([['', 'Item comum'], ...gearOptions(false)], '', () => {}, 'Tipo de equipamento'));
  const addGear = $('#add-item select');
  addGear.id = 'item-gear';
  $('#add-item').onsubmit = e => {
    e.preventDefault();
    const name = $('#item-name').value.trim();
    if (!name) return;
    const qty = Math.max(1, int($('#item-qty').value, 1));
    const g = addGear.value;
    if (g) {
      const meta = { gear: g, rarity: 'comum', material: g === 'w-wood' ? 'madeira' : g === 'a-light' ? 'couro' : 'metal' };
      normalizeMeta(meta);
      state.items.push([name, qty, meta]);
    } else state.items.push([name, qty]);
    $('#item-name').value = ''; $('#item-qty').value = 1; addGear.value = '';
    selected = state.items.length - 1;
    filter = 'all';
    save(); renderItems();
  };

  /* Descansos (arsenal.js) liberam manutenção e reparo de novo. */
  new MutationObserver(() => {
    const text = $('#saved').textContent;
    const short = /Descanso curto concluído/.test(text), long = /Descanso longo concluído/.test(text);
    if (!short && !long) return;
    let changed = false;
    const metas = [...state.items.map(item => item[2]), ...(state.cursedWeapons || []).map(w => w.dur)];
    metas.forEach(m => {
      if (!m) return;
      if (m.maintShort) { m.maintShort = false; changed = true; }
      if (long && m.maintLong) { m.maintLong = false; changed = true; }
    });
    if (!changed) return;
    try { localStorage.setItem(key, JSON.stringify(state)); } catch {}
    renderItemDetail(); renderArsenal();
  }).observe($('#saved'), { childList: true, characterData: true, subtree: true });

  renderItems();
  /* espera os outros módulos (Habakiri) montarem os cartões do Arsenal */
  setTimeout(() => { renderArsenal(); renderCalc(); save(); });
})();
