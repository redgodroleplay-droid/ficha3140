/* =========================================================
   和御魂 Nigimitama — Laço da Amizade (modo escondido)
   Magia de 2º círculo de um aliado que cria um vínculo com a Lucy.
   O modo fica escondido até ser descoberto:
   - digitar "nigimitama" (ou "nigitama" / "ninjatama") fora dos campos, ou
   - tocar 5 vezes seguidas no 生命 do cartão de Vitalidade.
   Depois disso aparece o botão 蓮, que abre o painel do laço com os
   benefícios que valem para a Lucy, e a ficha ganha o clima azul
   enquanto o laço está ativo.
   Dados em state.nigi; vai no backup.
   ========================================================= */
(() => {
  const ROUNDS = 10; // concentração, até 1 minuto
  const USES = ['protecao', 'harmonia', 'elo', 'reencontro'];
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const int = (v, min, max, fb) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fb; };

  function clean(v) {
    v = v && typeof v === 'object' ? v : {};
    const used = {};
    USES.forEach(k => { used[k] = v.used?.[k] === true; });
    return {
      unlocked: v.unlocked === true,
      active: v.active === true,
      ally: typeof v.ally === 'string' ? v.ally.slice(0, 60) : '',
      circle: int(v.circle, 2, 9, 2),
      castMod: int(v.castMod, -5, 10, 3),
      rounds: int(v.rounds, 0, ROUNDS, ROUNDS),
      transfer: typeof v.transfer === 'string' ? v.transfer.slice(0, 200) : '',
      giveUp: v.giveUp === true, // Não Desista: gasto até o próximo descanso longo
      used
    };
  }
  state.nigi = clean(state.nigi);
  const N = () => state.nigi;

  const previousExtend = window.extendBackup;
  window.extendBackup = (data, cleanData) => {
    previousExtend?.(data, cleanData);
    if (data.nigi) cleanData.nigi = clean(data.nigi);
  };

  /* regras que dependem do círculo usado pelo aliado */
  const healDice = () => Math.min(5, 2 + Math.max(0, N().circle - 2));
  const range = () => (N().circle >= 3 ? 24 : 18);
  const allyName = () => N().ally.trim() || 'o aliado';

  /* ---------- camadas visuais ---------- */
  const layer = el('div', undefined, 'nigi-layer');
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = '<i class="nigi-ring a"></i><i class="nigi-ring b"></i><i class="nigi-ring c"></i>';
  const petals = el('div', undefined, 'nigi-petals');
  petals.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 18; i++) {
    const p = el('i');
    p.style.setProperty('--x', Math.random() * 100 + '%');
    p.style.setProperty('--size', 6 + Math.random() * 9 + 'px');
    p.style.setProperty('--time', 9 + Math.random() * 9 + 's');
    p.style.setProperty('--delay', -Math.random() * 18 + 's');
    p.style.setProperty('--drift', (Math.random() * 140 - 70) + 'px');
    p.style.setProperty('--spin', (Math.random() * 540 - 270) + 'deg');
    petals.append(p);
  }
  const bloom = el('div', undefined, 'nigi-bloom');
  bloom.setAttribute('aria-hidden', 'true');

  const fab = el('button', undefined, 'nigi-fab');
  fab.type = 'button';
  fab.append(el('b', '蓮'), el('span', 'Nigimitama'));
  document.body.append(layer, petals, bloom, fab);

  /* ---------- painel ---------- */
  const dialog = el('dialog', undefined, 'nigi-dialog');
  dialog.id = 'nigi-dialog';
  dialog.setAttribute('aria-labelledby', 'nigi-title');
  dialog.onclick = e => { if (e.target === dialog) dialog.close(); };
  document.body.append(dialog);

  const status = el('p', '', 'nigi-status');
  status.setAttribute('role', 'status');
  const say = text => { status.textContent = text; };

  function setTemp(amount, reason) {
    const before = state.tempHp || 0;
    state.tempHp = Math.max(before, amount);
    summary(); save();
    return before >= amount
      ? reason + ': ' + amount + ' PV temporários, mas a Lucy já tinha ' + before + ' (não acumulam; ficou o maior).'
      : reason + ': PV temporários agora em ' + state.tempHp + '.';
  }
  function use(key) { N().used[key] = true; save(); draw(); }

  function block(glyph, title, rule, { key, needs, extra } = {}) {
    const box = el('section', undefined, 'nigi-buff');
    const locked = needs && N().circle < needs;
    const spent = key && N().used[key];
    box.classList.toggle('spent', Boolean(spent));
    box.classList.toggle('locked', Boolean(locked));
    const head = el('div', undefined, 'nigi-buff-head');
    head.append(el('i', glyph, 'nigi-glyph'), el('h3', title));
    if (key) head.append(el('small', locked ? 'a partir do ' + needs + 'º círculo' : spent ? 'usado' : 'disponível', 'nigi-tag'));
    box.append(head, el('p', rule, 'nigi-rule'));
    if (extra && !locked) box.append(extra);
    return box;
  }
  function btn(text, onclick, disabled) {
    const b = el('button', text);
    b.type = 'button'; b.onclick = onclick; b.disabled = Boolean(disabled);
    return b;
  }

  function draw() {
    const n = N();
    dialog.replaceChildren();

    const head = el('div', undefined, 'dialog-heading nigi-head');
    const titles = el('div');
    const h = el('h2', 'Nigimitama');
    h.id = 'nigi-title';
    titles.append(el('span', '和御魂 · Laço da Amizade', 'nigi-kicker'), h);
    const close = el('button', '×');
    close.type = 'button'; close.setAttribute('aria-label', 'Fechar'); close.onclick = () => dialog.close();
    head.append(titles, close);

    const meta = el('p', 'Magia de 2º círculo · Abjuração espiritual · 1 ação · ' + range() + ' m · V, S · Concentração, até 1 minuto · 5 PM (do conjurador)', 'nigi-meta');
    const quote = el('blockquote', '“Mesmo em meio à escuridão, um laço pode nos manter vivos.”', 'nigi-quote');

    /* configuração */
    const setup = el('div', undefined, 'nigi-setup');
    const allyLabel = el('label', 'Aliado (quem conjura)');
    const allyInput = el('input');
    allyInput.value = n.ally; allyInput.placeholder = 'Nome do aliado'; allyInput.maxLength = 60;
    allyInput.oninput = () => { n.ally = allyInput.value; save(); };
    allyLabel.append(allyInput);
    const circleLabel = el('label', 'Círculo usado');
    const circleSel = el('select');
    for (let c = 2; c <= 9; c++) { const o = el('option', c + 'º círculo'); o.value = c; circleSel.append(o); }
    circleSel.value = n.circle;
    circleSel.onchange = () => { n.circle = int(circleSel.value, 2, 9, 2); save(); draw(); };
    circleLabel.append(circleSel);
    const modLabel = el('label', 'Mod. de conjuração do aliado');
    const modInput = el('input');
    modInput.type = 'number'; modInput.min = -5; modInput.max = 10; modInput.value = n.castMod;
    modInput.oninput = () => { n.castMod = int(modInput.value, -5, 10, 0); save(); };
    modLabel.append(modInput);
    setup.append(allyLabel, circleLabel, modLabel);

    /* estado do laço */
    const bond = el('div', undefined, 'nigi-bond');
    if (n.active) {
      const clock = el('div', undefined, 'nigi-clock');
      clock.append(el('b', String(n.rounds)), el('span', n.rounds === 1 ? 'rodada restante' : 'rodadas restantes'));
      const pass = btn('Passar 1 rodada', () => {
        n.rounds = Math.max(0, n.rounds - 1);
        if (n.rounds === 0) { n.active = false; say('O minuto acabou. O laço se desfaz.'); } else say('');
        save(); draw();
      });
      const end = btn('Romper o laço', () => { n.active = false; save(); draw(); say('Laço rompido.'); }, false);
      end.classList.add('nigi-end');
      bond.append(clock, pass, end);
    } else {
      const start = btn('🪷 Laço ativado pelo aliado', () => {
        n.active = true; n.rounds = ROUNDS; USES.forEach(k => { n.used[k] = false; });
        save(); draw(); say('Laço estabelecido com ' + allyName() + '. 10 rodadas, enquanto durar a concentração.');
      });
      start.classList.add('nigi-start');
      bond.append(start, el('small', 'Ativar zera os usos e conta 10 rodadas (1 minuto).', 'nigi-hint'));
    }

    /* benefícios */
    const buffs = el('div', undefined, 'nigi-buffs');

    const transferInput = el('input');
    transferInput.value = n.transfer; transferInput.placeholder = 'Efeito recebido (ex.: Escudo da Fé, 6 rodadas)'; transferInput.maxLength = 200;
    transferInput.oninput = () => { n.transfer = transferInput.value; save(); };
    buffs.append(block('移', 'Transferência Espiritual',
      'Uma vez por turno, com uma ação bônus, ' + allyName() + ' passa para a Lucy (ou tira dela) um efeito benéfico de magia de 1º círculo ou menor, sem concentração e de alvo único. O efeito mantém a duração restante.',
      { extra: transferInput }));

    const prot = el('div', undefined, 'nigi-actions');
    const dmg = el('input');
    dmg.type = 'number'; dmg.min = 0; dmg.placeholder = 'Dano'; dmg.setAttribute('aria-label', 'Dano recebido antes da resistência');
    const superior = n.circle >= 3;
    prot.append(dmg,
      btn('Aliado me protege (½ dano)', () => {
        const raw = Math.max(0, Math.round(Number(dmg.value) || 0));
        if (!raw) { say('Informe o dano antes da resistência.'); return; }
        let msg = '';
        if (superior) msg = setTemp(Math.max(1, n.castMod), 'Proteção Superior') + ' ';
        const half = Math.floor(raw / 2);
        const absorbed = Math.min(state.tempHp || 0, half);
        state.tempHp = (state.tempHp || 0) - absorbed;
        state.hp = Math.max(0, state.hp - (half - absorbed));
        summary(); use('protecao');
        say(msg + 'Resistência: ' + raw + ' → ' + half + ' de dano' + (absorbed ? ' (' + absorbed + ' nos PV temporários)' : '') + '.');
      }, n.used.protecao || !n.active),
      btn('Eu protejo ' + allyName(), () => { use('protecao'); say('Reação da Lucy: ' + allyName() + ' tem resistência ao dano deste ataque' + (superior ? ' e recebe ' + Math.max(1, n.castMod) + ' PV temporários' : '') + '.'); }, n.used.protecao || !n.active));
    buffs.append(block('護', 'Proteção Compartilhada',
      'Quando uma de vocês sofre dano, a outra pode usar a reação para dar resistência àquele tipo de dano contra o ataque ou efeito. Declare antes de aplicar o dano. Uma vez durante a magia.' +
      (superior ? ' Proteção Superior (3º círculo): a protegida também recebe PV temporários iguais ao modificador de conjuração do aliado (mín. 1).' : ''),
      { key: 'protecao', extra: prot }));

    const heal = el('div', undefined, 'nigi-actions');
    heal.append(btn('Receber cura (' + healDice() + 'd8)', () => {
      const total = window.rollExpr ? window.rollExpr('Harmonia Vital · Nigimitama', healDice() + 'd8') : null;
      if (total == null) return;
      const before = state.hp;
      state.hp = Math.min(state.maxhp, state.hp + total);
      const got = state.hp - before;
      summary(); use('harmonia');
      say('Harmonia Vital: rolou ' + total + ', a Lucy recuperou ' + got + ' PV. ' + allyName().replace(/^o /, 'O ') + ' perde ' + Math.floor(got / 2) + ' PV (não pode ser reduzido).');
    }, n.used.harmonia || !n.active));
    buffs.append(block('癒', 'Harmonia Vital',
      'Com uma ação, ' + allyName() + ' restaura ' + healDice() + 'd8 PV da Lucy' + (n.circle > 2 ? ' (Harmonia Aprimorada: +1d8 por círculo acima do 2º, máx. 5d8)' : '') + ' e perde metade do que ela realmente recuperou, arredondado para baixo. Uma vez por conjuração.',
      { key: 'harmonia', extra: heal }));

    const elo = el('div', undefined, 'nigi-actions');
    elo.append(
      btn(allyName().replace(/^o /, 'O ') + ' caiu (0 PV)', () => {
        const t = window.rollExpr ? window.rollExpr('Último Elo · Nigimitama', '1d8') : null;
        if (t == null) return;
        use('elo');
        say(setTemp(t, 'Último Elo') + ' A Lucy pode usar a reação para andar até metade do deslocamento sem provocar ataques de oportunidade.');
      }, n.used.elo || !n.active),
      btn('A Lucy caiu', () => {
        const t = window.rollExpr ? window.rollExpr('Último Elo · ' + allyName(), '1d8') : null;
        if (t == null) return;
        use('elo');
        say('Último Elo: ' + allyName() + ' recebe ' + t + ' PV temporários e pode se mover até metade do deslocamento com a reação.');
      }, n.used.elo || !n.active));
    buffs.append(block('結', 'Último Elo',
      'Quando uma de vocês chega a 0 PV, a outra recebe 1d8 PV temporários e pode usar a reação para se mover até metade do deslocamento, sem provocar ataques de oportunidade. Uma vez por conjuração.',
      { key: 'elo', extra: elo }));

    const swap = el('div', undefined, 'nigi-actions');
    swap.append(btn('Trocar de posição', () => { use('reencontro'); say('Reencontro Espiritual: Lucy e ' + allyName() + ' trocam de lugar (teletransporte).'); }, n.used.reencontro || !n.active));
    buffs.append(block('転', 'Reencontro Espiritual',
      'Uma vez durante a magia, com uma ação bônus, uma de vocês troca de posição com a outra na hora, se as duas estiverem conscientes e dentro do alcance. Conta como teletransporte.',
      { key: 'reencontro', needs: 4, extra: swap }));

    /* Não Desista: 1 vez por descanso longo, não depende do laço estar ativo */
    const wisMod = Math.floor(((Number(state.attrs?.[4]) || 10) - 10) / 2); // SAB
    const low = state.hp < state.maxhp / 2;
    const never = el('div', undefined, 'nigi-actions');
    never.append(btn('Usar (2d6 ' + (wisMod < 0 ? '− ' + -wisMod : '+ ' + wisMod) + ')', () => {
      const t = window.rollExpr ? window.rollExpr('Não Desista', '2d6' + (wisMod < 0 ? wisMod : '+' + wisMod)) : null;
      if (t == null) return;
      n.giveUp = true;
      say(setTemp(Math.max(1, t), 'Não Desista') + ' Duram 1 minuto ou até acabarem.');
      draw();
    }, n.giveUp || !low));
    const giveUp = block('忍', 'Não Desista',
      'Com os PV abaixo da metade do máximo, use uma ação bônus para receber PV temporários iguais a 2d6 + modificador de Sabedoria (mín. 1). Duram 1 minuto ou até serem consumidos. Uma vez por descanso longo.' +
      (low ? '' : ' Agora a Lucy está com ' + state.hp + ' de ' + state.maxhp + ' PV, então ainda não pode usar.'),
      { extra: never });
    giveUp.classList.add('nigi-violet');
    giveUp.classList.toggle('spent', n.giveUp);
    giveUp.querySelector('.nigi-buff-head').append(el('small', n.giveUp ? 'usado até o descanso longo' : '1× por descanso longo', 'nigi-tag'));
    buffs.append(giveUp);

    const limits = el('details', undefined, 'nigi-limits');
    limits.append(el('summary', 'Limitações do vínculo'));
    const ul = el('ul');
    ['A magia termina se uma das duas morrer, se ' + allyName() + ' perder a concentração ou se vocês terminarem um turno a mais de ' + range() + ' m uma da outra.',
     'Não transfere condições, maldições, níveis de exaustão nem efeitos ruins.',
     'Os benefícios não se aplicam mais de uma vez ao mesmo evento.',
     'Uma criatura só participa de um Laço Espiritual por vez.'].forEach(t => ul.append(el('li', t)));
    limits.append(ul);

    dialog.append(head, meta, quote, setup, bond, status, buffs, limits);
    applyMode();
  }

  /* ---------- aplicar o clima ---------- */
  let wasActive = null;
  function applyMode() {
    const n = N();
    fab.hidden = !n.unlocked;
    const on = n.unlocked && n.active;
    document.body.classList.toggle('mood-nigi', on);
    fab.classList.toggle('on', on);
    fab.querySelector('span').textContent = on ? 'Laço · ' + n.rounds + ' rod.' : 'Nigimitama';
    fab.title = on ? 'Nigimitama ativa com ' + allyName() + ' (' + n.rounds + ' rodadas)' : 'Nigimitama — Laço da Amizade';
    fab.setAttribute('aria-label', fab.title);
    if (wasActive === false && on) blossom('絆', 'Laço estabelecido');
    wasActive = on;
  }

  function blossom(glyph, text) {
    bloom.replaceChildren(el('b', glyph), el('span', text));
    bloom.classList.remove('go'); void bloom.offsetWidth;
    bloom.classList.add('go');
  }

  fab.onclick = () => { draw(); say(''); dialog.showModal(); };

  /* ---------- descoberta ---------- */
  function unlock() {
    if (N().unlocked) { draw(); dialog.showModal(); return; }
    N().unlocked = true; save();
    blossom('蓮', 'Modo escondido: Nigimitama');
    setTimeout(() => { draw(); say('Você encontrou o Laço da Amizade. O botão 蓮 fica no canto da tela daqui em diante.'); dialog.showModal(); }, calm ? 0 : 1400);
  }
  const typing = t => t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  let buffer = '';
  document.addEventListener('keydown', e => {
    if (typing(e.target) || e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
    buffer = (buffer + e.key.toLowerCase()).slice(-12);
    if (['nigimitama', 'nigitama', 'ninjatama'].some(w => buffer.endsWith(w))) { buffer = ''; unlock(); }
  });
  const life = document.querySelector('.health .card-label span');
  if (life) {
    let taps = [];
    life.addEventListener('click', () => {
      const now = Date.now();
      taps = taps.filter(t => now - t < 3000);
      taps.push(now);
      if (taps.length >= 5) { taps = []; unlock(); }
    });
  }

  /* descanso longo devolve o Não Desista (mesmo aviso que os outros módulos leem) */
  const saved = document.getElementById('saved');
  if (saved) new MutationObserver(() => {
    if (/Descanso longo conclu/i.test(saved.textContent) && N().giveUp) {
      N().giveUp = false;
      setTimeout(() => { save(); if (dialog.open) draw(); }, 0);
    }
  }).observe(saved, { childList: true, characterData: true, subtree: true });

  const baseSave = save;
  save = function (...args) { const r = baseSave(...args); applyMode(); return r; };

  applyMode();
})();
