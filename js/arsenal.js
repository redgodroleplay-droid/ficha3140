/* Arsenal: mana, armas amaldiçoadas, usos/recargas, descansos, condições,
   rolagem por expressão e personalização visual. Tudo fica em `state`
   (localStorage) e viaja no backup JSON via window.extendBackup. */
(() => {
  const ATTR_KEYS = { FOR: 0, DES: 1, CON: 2, INT: 3, SAB: 4, CAR: 5 };
  const CONDITIONS = ['Amedrontado', 'Agarrado', 'Atordoado', 'Caído', 'Cego', 'Concentrando', 'Envenenado', 'Exausto', 'Incapacitado', 'Invisível', 'Paralisado', 'Surdo'];
  const RESET_LABEL = { long: 'Descanso longo', short: 'Descanso curto', none: 'Manual' };
  const HEX = /^#[0-9a-f]{6}$/i;
  const num = (v, d = 0) => (Number.isFinite(Number(v)) && v !== '' && v !== null ? Number(v) : d);
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  /* ---------- Dados e migração ---------- */
  function seedResources() {
    return [
      ['Passo do Vendaval', 'PB'], ['Corte da Lua Ascendente', 'PB'], ['Corte de Retorno', 'PB'],
      ['Aprendizado Rápido (Percepção)', 'PB'], ['Escudo dos Indefesos', 'PB'], ['Honra da Távola', '1'],
      ['Determinação Humana', '1'], ['Instinto de Sobrevivência', '1'], ['Colar da Regeneração Menor', '2']
    ].map(([name, max]) => ({ name, max, cur: null, reset: 'long' }));
  }
  function seedWeapons() {
    return [{
      name: 'Ameno Habakiri', spirit: '', type: '', rarity: '', stage: 'Adormecida', sigil: '天', aura: '#7a5cff',
      attack: 'FOR+PB', damage: '', properties: '', powers: '', curse: '',
      notes: 'Registrada a partir das Relações ("Maldição - Amigo?"). Preencha poderes, maldição e números.',
      corruption: 0, corruptionMax: 6, charges: 0, chargesMax: 0, reset: 'long', manaCost: '', activationCorrupts: false, attuned: false
    }];
  }
  function migrateName(target) {
    const match = typeof target.name === 'string' && target.name.match(/\s*[-–·|]?\s*Mana\s*:\s*(\d+)\s*$/i);
    if (!match) return;
    target.name = target.name.slice(0, match.index).trim() || 'Lucifer Adritch';
    if (!num(target.maxMana)) target.maxMana = Number(match[1]);
    if (target.mana === undefined || target.mana === null) target.mana = Number(match[1]);
  }
  function normalize(target) {
    migrateName(target);
    target.maxMana = Math.max(0, num(target.maxMana, 10));
    target.mana = clamp(num(target.mana, target.maxMana), 0, target.maxMana);
    target.tempHp = Math.max(0, num(target.tempHp));
    target.shortRestMana = ['half', 'full', 'none'].includes(target.shortRestMana) ? target.shortRestMana : 'half';
    target.paranoidRest = target.paranoidRest !== false;
    if (!Array.isArray(target.conditions)) target.conditions = [];
    if (!Array.isArray(target.resources)) target.resources = seedResources();
    if (!Array.isArray(target.cursedWeapons)) target.cursedWeapons = seedWeapons();
    if (!target.theme || typeof target.theme !== 'object') target.theme = {};
    if (!Array.isArray(target.theme.hidden)) target.theme.hidden = [];
  }
  normalize(state);

  const str = (v, max = 20000) => (typeof v === 'string' ? v.slice(0, max) : '');
  window.extendBackup = (data, clean) => {
    for (const k of ['mana', 'maxMana', 'tempHp']) if (Number.isFinite(data[k])) clean[k] = data[k];
    if (['half', 'full', 'none'].includes(data.shortRestMana)) clean.shortRestMana = data.shortRestMana;
    if (typeof data.paranoidRest === 'boolean') clean.paranoidRest = data.paranoidRest;
    if (Array.isArray(data.conditions)) clean.conditions = data.conditions.filter(c => typeof c === 'string').map(c => c.slice(0, 40));
    if (Array.isArray(data.resources)) clean.resources = data.resources.filter(r => r && typeof r === 'object').map(r => ({
      name: str(r.name, 120), max: str(String(r.max ?? '1'), 20), cur: Number.isFinite(r.cur) ? r.cur : null,
      reset: ['long', 'short', 'none'].includes(r.reset) ? r.reset : 'long'
    }));
    if (Array.isArray(data.cursedWeapons)) clean.cursedWeapons = data.cursedWeapons.filter(w => w && typeof w === 'object').map(w => {
      const out = {};
      for (const k of ['name', 'spirit', 'type', 'rarity', 'stage', 'sigil', 'attack', 'damage', 'properties', 'powers', 'curse', 'notes', 'manaCost']) out[k] = str(w[k]);
      out.aura = HEX.test(w.aura) ? w.aura : '#7a5cff';
      for (const k of ['corruption', 'corruptionMax', 'charges', 'chargesMax']) out[k] = clamp(num(w[k]), 0, 30);
      out.reset = ['long', 'short', 'none'].includes(w.reset) ? w.reset : 'long';
      out.activationCorrupts = w.activationCorrupts === true;
      out.attuned = w.attuned === true;
      return out;
    });
    if (data.theme && typeof data.theme === 'object') {
      const t = data.theme;
      clean.theme = {
        accent: HEX.test(t.accent) ? t.accent : undefined, manaColor: HEX.test(t.manaColor) ? t.manaColor : undefined,
        crest: str(t.crest, 12), epithet: str(t.epithet, 80),
        hidden: Array.isArray(t.hidden) ? t.hidden.filter(h => typeof h === 'string') : []
      };
    }
    normalize(clean);
  };

  /* ---------- Rolagem por expressão (2d6+FOR+PB) ---------- */
  let lastExpr = null;
  function resolveTokens(expr) {
    return String(expr).toUpperCase()
      .replace(/\b(FOR|DES|CON|INT|SAB|CAR)\b/g, k => signed(mod(state.attrs[ATTR_KEYS[k]])))
      .replace(/\bPB\b/g, () => signed(Number(state.prof) || 0))
      .replace(/\bNIV\b/g, () => signed(Number(state.level) || 1))
      .replace(/\s+/g, '').replace(/\+\+/g, '+').replace(/\+-|-\+/g, '-').replace(/--/g, '+');
  }
  function rollExpr(title, expr) {
    const src = resolveTokens(expr).replace(/^\+/, '');
    const term = /([+-]?)(?:(\d*)D(\d+)|(\d+))/gy;
    let total = 0, parts = [], match, consumed = 0;
    while (consumed < src.length && (match = term.exec(src))) {
      consumed = term.lastIndex;
      const sign = match[1] === '-' ? -1 : 1;
      if (match[3]) {
        const count = clamp(Number(match[2] || 1), 1, 100), sides = clamp(Number(match[3]), 2, 1000);
        const results = Array.from({ length: count }, () => die(sides));
        const sum = results.reduce((a, b) => a + b, 0);
        total += sign * sum;
        parts.push((sign < 0 ? '− ' : parts.length ? '+ ' : '') + count + 'd' + sides + ' [' + results.join(', ') + ']');
      } else {
        total += sign * Number(match[4]);
        parts.push((sign < 0 ? '− ' : parts.length ? '+ ' : '') + match[4]);
      }
    }
    if (!src || consumed !== src.length) {
      rollResult(title, '?', 'Não entendi “' + expr + '”. Use algo como 2d6+3, 1d20+FOR+PB.');
      return null;
    }
    lastExpr = [title, expr];
    rollResult(title, total, parts.join(' ') + ' = ' + total);
    return total;
  }
  const firstDice = text => (String(text || '').match(/\d*d\d+(?:\s*[+-]\s*(?:\d*d\d+|\d+|FOR|DES|CON|INT|SAB|CAR|PB|NIV))*/i) || [])[0];
  window.rollExpr = rollExpr;
  const baseRoll = roll;
  roll = function (...args) { lastExpr = null; return baseRoll(...args); };
  $('#roll-again').onclick = () => (lastExpr ? rollExpr(...lastExpr) : baseRoll(...lastRoll));

  const exprForm = el('form', undefined, 'dice-controls expr-controls');
  const exprInput = el('input');
  exprInput.placeholder = 'Expressão: 2d6+3, 1d20+FOR+PB';
  exprInput.setAttribute('aria-label', 'Expressão de dados');
  exprForm.append(exprInput, el('button', 'Rolar expressão'));
  exprForm.onsubmit = e => { e.preventDefault(); if (exprInput.value.trim()) rollExpr('Expressão', exprInput.value.trim()); };
  $('.dice-controls').after(exprForm);
  exprForm.after(el('small', 'Atalhos: FOR DES CON INT SAB CAR (modificadores), PB (proficiência), NIV (nível).', 'expr-help'));

  /* ---------- Pips reutilizáveis ---------- */
  function pips(cur, max, onSet, cls, label) {
    const wrap = el('div', undefined, 'pips ' + (cls || ''));
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', label + ': ' + cur + ' de ' + max);
    for (let i = 1; i <= Math.min(max, 30); i++) {
      const b = el('button', undefined, 'pip');
      b.type = 'button';
      b.classList.toggle('on', i <= cur);
      b.setAttribute('aria-label', label + ' ' + i + ' de ' + max);
      b.onclick = () => onSet(i === cur ? i - 1 : i);
      wrap.append(b);
    }
    return wrap;
  }

  /* ---------- Mana ---------- */
  const manaCard = el('article', undefined, 'card mana-card');
  manaCard.innerHTML = '<div class="card-label">MANA <span lang="ja">魔力</span></div>' +
    '<div class="health-value mana-value"><input aria-label="Mana atual" type="number" min="0"><span>/ <input aria-label="Mana máxima" type="number" min="0"></span><small>PM</small></div>' +
    '<div class="bar mana-bar"><i></i></div>' +
    '<form class="session-health mana-form"><input type="number" min="1" step="1" value="1" required aria-label="Quantidade de mana"><button value="-1">Gastar</button><button value="1">Recuperar</button></form>' +
    '<p class="session-status mana-status" role="status"></p>';
  $('.top-grid .health').after(manaCard);
  const [manaCur, manaMax] = manaCard.querySelectorAll('.mana-value input');
  const manaStatus = manaCard.querySelector('.mana-status');
  function renderMana() {
    state.maxMana = Math.max(0, num(state.maxMana));
    state.mana = clamp(num(state.mana), 0, state.maxMana);
    if (document.activeElement !== manaCur) manaCur.value = state.mana;
    if (document.activeElement !== manaMax) manaMax.value = state.maxMana;
    const ratio = state.maxMana ? state.mana / state.maxMana : 0;
    manaCard.querySelector('.mana-bar i').style.width = ratio * 100 + '%';
    manaCard.classList.toggle('mana-low', state.maxMana > 0 && ratio <= 0.25);
    document.querySelectorAll('[data-mana-cost]').forEach(b => { b.classList.toggle('short', Number(b.dataset.manaCost) > state.mana); });
  }
  function spendMana(cost, reason) {
    cost = Math.max(0, num(cost));
    if (cost > state.mana) {
      manaStatus.textContent = 'Mana insuficiente para ' + reason + ' (' + state.mana + '/' + cost + '). Excesso de mana = risco de ruptura.';
      return false;
    }
    state.mana -= cost;
    manaStatus.textContent = (cost ? '−' + cost + ' PM · ' : '') + reason;
    renderMana(); save();
    return true;
  }
  window.spendMana = spendMana;
  manaCur.oninput = () => { state.mana = num(manaCur.value); renderMana(); save(); };
  manaMax.oninput = () => { state.maxMana = num(manaMax.value); renderMana(); save(); };
  manaCur.onblur = manaMax.onblur = renderMana;
  manaCard.querySelector('.mana-form').onsubmit = e => {
    e.preventDefault();
    const amount = Math.max(0, num(e.target.querySelector('input').value));
    if (Number(e.submitter?.value) > 0) {
      const before = state.mana;
      state.mana = Math.min(state.maxMana, state.mana + amount);
      manaStatus.textContent = state.mana === before ? 'Mana já está cheia.' : '+' + (state.mana - before) + ' PM';
      renderMana(); save();
    } else spendMana(amount, 'gasto manual');
  };

  /* ---------- PV temporários (o dano consome primeiro) ---------- */
  const tempLabel = el('label', 'PV temporários', 'temp-hp');
  const tempInput = el('input');
  tempInput.type = 'number'; tempInput.min = 0;
  tempLabel.append(tempInput);
  $('.health .bar').after(tempLabel);
  const healthForm = $('.health .session-health');
  const healthStatus = healthForm.nextElementSibling;
  healthForm.onsubmit = e => {
    e.preventDefault();
    /* dano necrótico dobra em humanos (antes dos PV temporários) */
    const necro = e.submitter?.value === 'necro' && /human/i.test(state.race || '');
    const amount = Math.max(0, num(healthForm.querySelector('input').value)) * (necro ? 2 : 1);
    const before = state.hp;
    let absorbed = 0;
    if (Number(e.submitter?.value) > 0) state.hp += amount;
    else {
      absorbed = Math.min(state.tempHp, amount);
      state.tempHp -= absorbed;
      state.hp -= amount - absorbed;
    }
    summary(); save();
    const change = state.hp - before;
    healthStatus.textContent = (necro ? 'Necrótico ×2 (humano): ' + amount + ' · ' : '') + (absorbed ? absorbed + ' absorvido pelos PV temporários · ' : '') + (change ? signed(change) + ' PV' : absorbed ? '' : 'PV já no limite.');
  };
  tempInput.oninput = () => { state.tempHp = Math.max(0, num(tempInput.value)); summary(); save(); };

  /* ---------- Resumo ampliado ---------- */
  const baseSummary = summary;
  summary = function () {
    baseSummary();
    if (document.activeElement !== tempInput) tempInput.value = state.tempHp || 0;
    $('.health').classList.toggle('has-temp', state.tempHp > 0);
    $('.crest-cloth strong').textContent = state.name || 'Lucifer Adritch';
    document.title = (state.nickname || state.name || 'Ficha') + ' — O caminho do rōnin';
    const half = state.hp <= state.maxhp / 2 && state.hp > 0;
    $('.health').classList.toggle('bloodied', half);
    renderMana();
  };

  /* ---------- Descansos e condições ---------- */
  const resMax = r => {
    const text = String(r.max ?? '').toUpperCase().replace(/\bPB\b/g, String(state.prof)).replace(/\bNIV\b/g, String(state.level)).replace(/\s+/g, '');
    if (!/^[+-]?\d+([+-]\d+)*$/.test(text)) return 0;
    return clamp(text.match(/[+-]?\d+/g).reduce((a, b) => a + Number(b), 0), 0, 30);
  };
  const resCur = r => clamp(r.cur === null || r.cur === undefined ? resMax(r) : num(r.cur), 0, resMax(r));

  const table = el('div', undefined, 'table-tools');
  const rest = el('div', undefined, 'rest-bar');
  const shortBtn = el('button', '☾ Descanso curto');
  const longBtn = el('button', '☀ Descanso longo', 'red');
  const paranoid = el('label', undefined, 'preference rest-option');
  const paranoidBox = el('input');
  paranoidBox.type = 'checkbox';
  paranoidBox.checked = state.paranoidRest;
  paranoid.append(paranoidBox, document.createTextNode('Paranoico: teste CON CD 13 no descanso longo'));
  paranoidBox.onchange = () => { state.paranoidRest = paranoidBox.checked; save(); };
  rest.append(el('span', 'DESCANSO'), shortBtn, longBtn, paranoid);
  const conditions = el('div', undefined, 'condition-bar');
  table.append(rest, conditions);
  $('.quick-rolls').after(table);

  function renderConditions() {
    conditions.replaceChildren(el('span', 'CONDIÇÕES'));
    for (const name of CONDITIONS) {
      const b = el('button', name, 'condition');
      const on = state.conditions.includes(name);
      b.setAttribute('aria-pressed', String(on));
      b.onclick = () => {
        state.conditions = on ? state.conditions.filter(c => c !== name) : [...state.conditions, name];
        save(); renderConditions();
      };
      conditions.append(b);
    }
    const active = $('.identity-tags');
    active.querySelectorAll('.cond-tag').forEach(t => t.remove());
    state.conditions.forEach(c => active.append(el('span', c, 'cond-tag')));
  }

  function restoreBy(kinds) {
    state.resources.forEach(r => { if (kinds.includes(r.reset)) r.cur = null; });
    state.cursedWeapons.forEach(w => { if (kinds.includes(w.reset)) w.charges = w.chargesMax; });
    state.used = false;
  }
  function afterRest(text) {
    summary(); save(); renderResources(); renderCursed();
    document.querySelectorAll('#abilities .card button').forEach(b => { if (/Recarregar/.test(b.textContent)) b.textContent = 'Usar · recuperar vida'; });
    $('#saved').textContent = '● ' + text;
  }
  shortBtn.onclick = () => {
    if (!confirm('Fazer um descanso curto? Recarrega usos de descanso curto' + (state.shortRestMana === 'none' ? '.' : ' e recupera mana (' + (state.shortRestMana === 'full' ? 'toda' : 'metade') + ').'))) return;
    restoreBy(['short']);
    if (state.shortRestMana === 'full') state.mana = state.maxMana;
    if (state.shortRestMana === 'half') state.mana = Math.min(state.maxMana, state.mana + Math.floor(state.maxMana / 2));
    afterRest('Descanso curto concluído');
  };
  longBtn.onclick = () => {
    if (!confirm('Fazer um descanso longo? Recupera PV, mana e todos os usos.')) return;
    restoreBy(['short', 'long']);
    state.mana = state.maxMana;
    state.tempHp = 0;
    state.conditions = state.conditions.filter(c => c !== 'Concentrando');
    let detail = 'PV, mana e usos restaurados.';
    if (state.paranoidRest) {
      const d = die(20), bonus = mod(state.attrs[2]) + Number(state.prof);
      const total = d + bonus;
      if (total >= 13) { state.hp = state.maxhp; detail = 'Paranoico · CON d20: ' + d + ' ' + signed(bonus) + ' = ' + total + ' (sucesso) · PV cheios.'; }
      else { state.hp = Math.min(state.maxhp, state.hp + Math.floor(state.maxhp / 2)); detail = 'Paranoico · CON d20: ' + d + ' ' + signed(bonus) + ' = ' + total + ' (falha) · recupera só metade dos PV.'; }
      afterRest('Descanso longo concluído');
      rollResult('Descanso longo', total >= 13 ? 'Sucesso' : 'Falha', detail);
      renderConditions();
      return;
    }
    state.hp = state.maxhp;
    afterRest('Descanso longo concluído · ' + detail);
    renderConditions();
  };

  /* ---------- Usos & recargas ---------- */
  const resourceCard = el('article', undefined, 'card resources-card');
  resourceCard.innerHTML = '<div class="card-label">USOS & RECARGAS <span lang="ja">回</span></div><p class="detail">Clique nos marcadores para gastar. Máximo aceita número, PB ou NIV (ex.: PB+1).</p>';
  const resourceList = el('div', undefined, 'resource-list');
  const resourceAdd = el('form', undefined, 'resource-add');
  const resName = el('input'), resMaxIn = el('input');
  resName.placeholder = 'Novo recurso (ex.: Pulso Regenerativo)'; resName.required = true; resName.setAttribute('aria-label', 'Nome do recurso');
  resMaxIn.placeholder = 'Máx.'; resMaxIn.value = '1'; resMaxIn.setAttribute('aria-label', 'Máximo de usos');
  resourceAdd.append(resName, resMaxIn, el('button', '+ Adicionar'));
  resourceCard.append(resourceList, resourceAdd);
  $('.lower-grid').after(resourceCard);
  resourceAdd.onsubmit = e => {
    e.preventDefault();
    state.resources.push({ name: resName.value.trim(), max: resMaxIn.value.trim() || '1', cur: null, reset: 'long' });
    resName.value = ''; resMaxIn.value = '1';
    save(); renderResources();
  };
  function renderResources() {
    resourceList.replaceChildren();
    if (!state.resources.length) resourceList.append(el('p', 'Nenhum recurso registrado.', 'detail'));
    state.resources.forEach((r, i) => {
      const row = el('div', undefined, 'resource-row');
      const name = el('input');
      name.value = r.name; name.setAttribute('aria-label', 'Nome do recurso');
      name.oninput = () => { r.name = name.value; save(); };
      const max = el('input', undefined, 'resource-max');
      max.value = r.max; max.setAttribute('aria-label', 'Máximo de ' + r.name);
      max.onchange = () => { r.max = max.value.trim() || '1'; save(); renderResources(); };
      const reset = el('select');
      reset.setAttribute('aria-label', 'Recarga de ' + r.name);
      for (const [v, label] of Object.entries(RESET_LABEL)) { const o = el('option', label); o.value = v; reset.append(o); }
      reset.value = r.reset;
      reset.onchange = () => { r.reset = reset.value; save(); };
      const del = el('button', '×', 'icon-btn');
      del.setAttribute('aria-label', 'Remover ' + r.name);
      del.onclick = () => { if (!confirm('Remover “' + r.name + '”?')) return; state.resources.splice(i, 1); save(); renderResources(); };
      const m = resMax(r);
      const counter = el('span', resCur(r) + '/' + m, 'resource-count');
      row.append(name, pips(resCur(r), m, v => { r.cur = v; save(); renderResources(); }, 'res', r.name), counter, max, reset, del);
      resourceList.append(row);
    });
  }

  /* ---------- Armas amaldiçoadas ---------- */
  Object.assign(titles, { arsenal: ['呪 / ARMAS AMALDIÇOADAS', 'Arsenal maldito'] });
  const STAGES = ['Adormecida', 'Inquieta', 'Desperta', 'Liberada', 'Fusão'];
  $('#add-cursed').onclick = () => {
    state.cursedWeapons.push({ name: 'Nova arma amaldiçoada', spirit: '', type: '', rarity: '', stage: 'Adormecida', sigil: '呪', aura: '#9b2c2c', attack: 'FOR+PB', damage: '1d8+FOR', properties: '', powers: '', curse: '', notes: '', corruption: 0, corruptionMax: 6, charges: 0, chargesMax: 0, reset: 'long', manaCost: '', activationCorrupts: false, attuned: false });
    save(); renderCursed();
    $('#cursed-weapons .cursed:last-child .cursed-name')?.select();
  };
  function textField(w, key, label, cls, multiline) {
    const f = labeledField(label, w[key], v => { w[key] = v; save(); }, multiline);
    if (cls) f.classList.add(cls);
    return f;
  }
  function meter(w, key, maxKey, label, cls, rerender) {
    const box = el('div', undefined, 'cursed-meter ' + cls);
    const head = el('div', undefined, 'meter-head');
    const max = el('input');
    max.type = 'number'; max.min = 0; max.max = 30; max.value = w[maxKey];
    max.setAttribute('aria-label', 'Máximo de ' + label);
    max.onchange = () => { w[maxKey] = clamp(num(max.value), 0, 30); w[key] = Math.min(w[key], w[maxKey]); save(); rerender(); };
    head.append(el('span', label.toUpperCase()), el('b', w[key] + ' / ' + w[maxKey]), el('label', 'máx.', 'meter-max'));
    head.lastChild.append(max);
    box.append(head, pips(w[key], w[maxKey], v => { w[key] = v; save(); rerender(); }, cls, label));
    return box;
  }
  function cursedCard(w, i) {
    const card = el('article', undefined, 'card cursed');
    card.style.setProperty('--aura', HEX.test(w.aura) ? w.aura : '#9b2c2c');
    const rerender = () => { const next = cursedCard(w, i); card.replaceWith(next); };
    const overrun = w.corruptionMax > 0 && w.corruption >= w.corruptionMax;
    card.classList.toggle('overrun', overrun);
    card.classList.toggle('attuned', w.attuned);

    const head = el('header', undefined, 'cursed-head');
    const sigil = el('input', undefined, 'cursed-sigil');
    sigil.value = w.sigil || '呪'; sigil.maxLength = 2; sigil.setAttribute('aria-label', 'Selo da arma (1 caractere)');
    sigil.oninput = () => { w.sigil = sigil.value; save(); };
    const names = el('div', undefined, 'cursed-titles');
    const name = el('input', undefined, 'cursed-name');
    name.value = w.name; name.setAttribute('aria-label', 'Nome da arma');
    name.oninput = () => { w.name = name.value; save(); };
    const spirit = el('input', undefined, 'cursed-spirit');
    spirit.value = w.spirit; spirit.placeholder = 'Espírito / entidade selada'; spirit.setAttribute('aria-label', 'Espírito selado');
    spirit.oninput = () => { w.spirit = spirit.value; save(); };
    names.append(name, spirit);
    const attune = el('button', w.attuned ? '◉ Sintonizada' : '○ Sintonizar', 'attune');
    attune.setAttribute('aria-pressed', String(w.attuned));
    attune.onclick = () => { w.attuned = !w.attuned; save(); rerender(); };
    head.append(sigil, names, attune);

    const meta = el('div', undefined, 'cursed-meta');
    meta.append(textField(w, 'type', 'Tipo de arma'), textField(w, 'rarity', 'Raridade'));
    const stageWrap = el('label', 'Estágio de despertar', 'editor-label');
    const stage = el('select');
    const stages = STAGES.includes(w.stage) || !w.stage ? STAGES : [...STAGES, w.stage];
    stages.forEach(s => stage.append(el('option', s)));
    stage.value = w.stage || 'Adormecida';
    stage.onchange = () => { w.stage = stage.value; save(); card.dataset.stage = STAGES.indexOf(w.stage); };
    card.dataset.stage = STAGES.indexOf(w.stage);
    stageWrap.append(stage);
    meta.append(stageWrap);

    const combat = el('div', undefined, 'cursed-combat');
    const atkF = textField(w, 'attack', 'Bônus de ataque');
    const atkBtn = el('button', '⚔ Ataque');
    atkBtn.onclick = () => rollExpr('Ataque · ' + (w.name || 'arma'), '1d20+' + (w.attack || '0'));
    const dmgF = textField(w, 'damage', 'Dano');
    const dmgBtn = el('button', '✶ Dano');
    dmgBtn.onclick = () => {
      const expr = firstDice(w.damage);
      if (!expr) return rollResult('Dano', '?', 'Escreva o dano com dados, ex.: 1d8+FOR.');
      rollExpr('Dano · ' + (w.name || 'arma'), expr);
    };
    const critBtn = el('button', '☠ Crítico');
    critBtn.title = 'Dobra os dados de dano';
    critBtn.onclick = () => {
      const expr = firstDice(w.damage);
      if (!expr) return rollResult('Crítico', '?', 'Escreva o dano com dados, ex.: 1d8+FOR.');
      rollExpr('Crítico · ' + (w.name || 'arma'), expr.replace(/(\d*)d(\d+)/gi, (_, n, s) => (Number(n || 1) * 2) + 'd' + s));
    };
    const atkRow = el('div', undefined, 'roll-field'); atkRow.append(atkF, atkBtn);
    const dmgRow = el('div', undefined, 'roll-field'); dmgRow.append(dmgF, dmgBtn, critBtn);
    combat.append(atkRow, dmgRow, textField(w, 'properties', 'Propriedades'));

    const meters = el('div', undefined, 'cursed-meters');
    meters.append(meter(w, 'corruption', 'corruptionMax', 'Corrupção', 'corrupt', rerender), meter(w, 'charges', 'chargesMax', 'Cargas', 'charge', rerender));
    const chargeReset = el('select');
    chargeReset.setAttribute('aria-label', 'Recarga das cargas');
    for (const [v, label] of Object.entries(RESET_LABEL)) { const o = el('option', 'Cargas: ' + label); o.value = v; chargeReset.append(o); }
    chargeReset.value = w.reset;
    chargeReset.onchange = () => { w.reset = chargeReset.value; save(); };
    meters.lastChild.append(chargeReset);

    const act = el('div', undefined, 'cursed-activate');
    const cost = el('input');
    cost.type = 'number'; cost.min = 0; cost.value = w.manaCost; cost.placeholder = '0';
    cost.setAttribute('aria-label', 'Custo de mana para despertar o poder');
    const costLabel = el('label', 'Custo (PM)'); costLabel.append(cost);
    const corrupts = el('input'); corrupts.type = 'checkbox'; corrupts.checked = w.activationCorrupts;
    const corruptsLabel = el('label', undefined, 'preference'); corruptsLabel.append(corrupts, document.createTextNode('+1 corrupção por uso'));
    corrupts.onchange = () => { w.activationCorrupts = corrupts.checked; save(); };
    const awaken = el('button', 'Despertar poder', 'red awaken');
    const status = el('p', overrun ? 'A maldição domina o portador. Consulte o mestre.' : '', 'session-status cursed-status');
    status.setAttribute('role', 'status');
    const syncCost = () => { awaken.dataset.manaCost = num(w.manaCost); awaken.textContent = 'Despertar poder' + (num(w.manaCost) ? ' · −' + num(w.manaCost) + ' PM' : ''); renderMana(); };
    cost.oninput = () => { w.manaCost = cost.value; save(); syncCost(); };
    syncCost();
    awaken.onclick = () => {
      if (w.chargesMax > 0 && w.charges <= 0) { status.textContent = 'Sem cargas. Recarrega em: ' + RESET_LABEL[w.reset] + '.'; return; }
      if (!spendMana(num(w.manaCost), 'poder de ' + (w.name || 'arma'))) { status.textContent = manaStatus.textContent; return; }
      if (w.chargesMax > 0) w.charges--;
      if (w.activationCorrupts) w.corruption = Math.min(w.corruptionMax || 30, w.corruption + 1);
      save(); rerender();
      const fresh = $('#cursed-weapons').children[i];
      const msg = 'Poder despertado' + (num(w.manaCost) ? ' · −' + num(w.manaCost) + ' PM' : '') + (w.activationCorrupts ? ' · corrupção ' + w.corruption + '/' + w.corruptionMax : '') + '.';
      fresh?.querySelector('.cursed-status') && (fresh.querySelector('.cursed-status').textContent = w.corruptionMax > 0 && w.corruption >= w.corruptionMax ? 'A maldição domina o portador. Consulte o mestre.' : msg);
      fresh?.classList.add('pulse');
    };
    act.append(costLabel, corruptsLabel, awaken);

    const lore = el('div', undefined, 'cursed-texts');
    lore.append(textField(w, 'powers', 'Poderes & técnicas', 'powers', true), textField(w, 'curse', 'Maldição & preço', 'curse', true));
    const more = el('details', undefined, 'cursed-more');
    more.append(el('summary', 'Notas, aura e opções'));
    const aura = el('input'); aura.type = 'color'; aura.value = HEX.test(w.aura) ? w.aura : '#9b2c2c'; aura.setAttribute('aria-label', 'Cor da aura');
    aura.oninput = () => { w.aura = aura.value; card.style.setProperty('--aura', aura.value); save(); };
    const auraLabel = el('label', 'Cor da aura', 'aura-label'); auraLabel.append(aura);
    const toInv = el('button', 'Copiar para o inventário');
    toInv.onclick = () => {
      state.items.push([w.name || 'Arma amaldiçoada', 1, { category: 'Arma amaldiçoada', damage: w.damage, properties: w.properties, description: w.powers, notes: w.curse, equipped: w.attuned }]);
      save(); renderItems(); status.textContent = 'Adicionada ao inventário.';
    };
    const del = el('button', 'Excluir arma');
    del.onclick = () => { if (!confirm('Excluir “' + (w.name || 'arma') + '”?')) return; state.cursedWeapons.splice(i, 1); save(); renderCursed(); };
    const tools = el('div', undefined, 'toolbar'); tools.append(auraLabel, toInv, del);
    more.append(textField(w, 'notes', 'Notas', '', true), tools);

    card.append(head, meta, combat, meters, act, status, lore, more);
    return card;
  }
  function renderCursed() {
    const root = $('#cursed-weapons');
    root.replaceChildren();
    if (!state.cursedWeapons.length) root.append(el('p', 'Nenhuma arma amaldiçoada registrada.', 'footnote'));
    state.cursedWeapons.forEach((w, i) => root.append(cursedCard(w, i)));
  }

  /* ---------- Técnicas com custo de mana ---------- */
  const techniquesRoot = $('#custom-abilities');
  function enhanceTechniques() {
    [...techniquesRoot.children].forEach((card, index) => {
      const entry = state.customAbilities[index];
      if (!entry || card.querySelector('.mana-cast')) return;
      const box = el('div', undefined, 'mana-cast');
      const cost = el('input');
      cost.type = 'number'; cost.min = 0; cost.value = entry.mana || ''; cost.placeholder = '0';
      cost.setAttribute('aria-label', 'Custo de mana de ' + entry.title);
      const label = el('label', 'Custo de mana (PM)'); label.append(cost);
      const cast = el('button', 'Usar técnica');
      const dmg = el('button', 'Rolar dano');
      const status = el('span', '', 'mana-cast-status');
      const sync = () => { cast.dataset.manaCost = num(entry.mana); cast.textContent = 'Usar técnica' + (num(entry.mana) ? ' · −' + num(entry.mana) + ' PM' : ''); dmg.hidden = !firstDice(entry.damage); renderMana(); };
      cost.oninput = () => { entry.mana = cost.value; save(); sync(); };
      card.addEventListener('input', () => { dmg.hidden = !firstDice(entry.damage); });
      cast.onclick = () => { status.textContent = spendMana(num(entry.mana), entry.title || 'técnica') ? 'Usada.' : 'Mana insuficiente.'; };
      dmg.onclick = () => rollExpr('Dano · ' + entry.title, firstDice(entry.damage));
      box.append(label, cast, dmg, status);
      card.append(box);
      sync();
    });
  }
  new MutationObserver(enhanceTechniques).observe(techniquesRoot, { childList: true });
  enhanceTechniques();

  /* ---------- Inventário: rolar dano do item ---------- */
  const baseItemDetail = renderItemDetail;
  renderItemDetail = function () {
    baseItemDetail();
    const item = state.items[selectedItem];
    if (!item) return;
    const panel = $('#item-detail');
    const btn = el('button', 'Rolar dano');
    btn.onclick = () => {
      const expr = firstDice(item[2]?.damage);
      if (!expr) return rollResult('Dano', '?', 'Preencha o campo Dano com dados, ex.: 1d8+FOR.');
      rollExpr('Dano · ' + item[0], expr);
    };
    panel.append(btn);
  };

  /* ---------- Personalização ---------- */
  const originalEpithet = $('.identity h1 + p').innerHTML;
  const originalCrest = $('.crest-script').textContent;
  function mixHex(hex, other, amount) {
    const a = hex.match(/\w\w/g).map(h => parseInt(h, 16)), b = other.match(/\w\w/g).map(h => parseInt(h, 16));
    return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * amount).toString(16).padStart(2, '0')).join('');
  }
  function applyTheme() {
    const t = state.theme, root = document.documentElement.style;
    if (HEX.test(t.accent || '')) { root.setProperty('--shu', t.accent); root.setProperty('--shu-hi', mixHex(t.accent, '#ffffff', 0.35)); root.setProperty('--shu-deep', mixHex(t.accent, '#000000', 0.45)); }
    else ['--shu', '--shu-hi', '--shu-deep'].forEach(p => root.removeProperty(p));
    if (HEX.test(t.manaColor || '')) { root.setProperty('--mana', t.manaColor); root.setProperty('--mana-hi', mixHex(t.manaColor, '#ffffff', 0.35)); }
    else ['--mana', '--mana-hi'].forEach(p => root.removeProperty(p));
    $('.crest-script').textContent = t.crest || originalCrest;
    if (t.epithet) $('.identity h1 + p').textContent = t.epithet; else $('.identity h1 + p').innerHTML = originalEpithet;
    document.querySelectorAll('nav [data-tab]').forEach(b => { b.hidden = t.hidden.includes(b.dataset.tab); });
  }
  const custom = el('fieldset', undefined, 'customize');
  custom.append(el('legend', 'Personalização'));
  const colorRow = el('div', undefined, 'customize-row');
  for (const [key, label, fallback] of [['accent', 'Cor de destaque', '#e8432c'], ['manaColor', 'Cor da mana', '#5b7cff']]) {
    const input = el('input'); input.type = 'color'; input.value = state.theme[key] || fallback;
    input.oninput = () => { state.theme[key] = input.value; applyTheme(); save(); };
    const wrap = el('label', label); wrap.append(input);
    colorRow.append(wrap);
  }
  const resetColors = el('button', 'Cores originais');
  resetColors.type = 'button';
  resetColors.onclick = () => { delete state.theme.accent; delete state.theme.manaColor; colorRow.querySelectorAll('input')[0].value = '#e8432c'; colorRow.querySelectorAll('input')[1].value = '#5b7cff'; applyTheme(); save(); };
  colorRow.append(resetColors);
  custom.append(colorRow);
  for (const [key, label, placeholder, max] of [['epithet', 'Subtítulo da ficha', 'RPG de mesa · O caminho da lâmina', 80], ['crest', 'Texto vertical do estandarte', originalCrest, 12]]) {
    const wrap = el('label', label, 'editor-label');
    const input = el('input'); input.value = state.theme[key] || ''; input.placeholder = placeholder; input.maxLength = max;
    input.oninput = () => { state.theme[key] = input.value; applyTheme(); save(); };
    wrap.append(input); custom.append(wrap);
  }
  const restWrap = el('label', 'Mana no descanso curto', 'editor-label');
  const restSel = el('select');
  for (const [v, label] of [['half', 'Recupera metade'], ['full', 'Recupera tudo'], ['none', 'Não recupera']]) { const o = el('option', label); o.value = v; restSel.append(o); }
  restSel.value = state.shortRestMana;
  restSel.onchange = () => { state.shortRestMana = restSel.value; save(); };
  restWrap.append(restSel); custom.append(restWrap);
  const tabsBox = el('div', undefined, 'customize-tabs');
  tabsBox.append(el('span', 'Abas visíveis', 'eyebrow'));
  document.querySelectorAll('nav [data-tab]').forEach(b => {
    if (b.dataset.tab === 'ficha') return;
    const box = el('input'); box.type = 'checkbox'; box.checked = !state.theme.hidden.includes(b.dataset.tab);
    box.onchange = () => { state.theme.hidden = box.checked ? state.theme.hidden.filter(h => h !== b.dataset.tab) : [...state.theme.hidden, b.dataset.tab]; applyTheme(); save(); };
    const label = el('label', undefined, 'preference'); label.append(box, document.createTextNode(b.textContent.replace(b.querySelector('i')?.textContent || '', '')));
    tabsBox.append(label);
  });
  custom.append(tabsBox);
  $('#preferences .music').before(custom);

  /* ---------- Exportação com nome do personagem ---------- */
  $('#export').onclick = () => {
    const backup = { format: 'ronin-ficha', version: 2, exportedAt: new Date().toISOString(), data: state };
    const slug = (state.name || 'ficha').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'ficha';
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
    const a = el('a'); a.href = url; a.download = slug + '-ficha-' + new Date().toISOString().slice(0, 10) + '.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  /* ---------- Inicialização ---------- */
  if ($('#name').value !== state.name) $('#name').value = state.name;
  applyTheme();
  renderConditions();
  renderResources();
  renderCursed();
  summary();
  save();
})();
