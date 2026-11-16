/* Ame no Habakiri — a espada sedenta de sangue.
   Painel próprio dentro do cartão da arma no Arsenal: bainha × lâmina, condições de
   despertar, Preço do Sangue por turno, Frenesi Carmesim e o texto como códex formatado.
   Desembainhar coloca a arma em "Liberada" (liga o Modo Fera); 0 PV silencia a espada. */
(() => {
  const MATCH = /ha?bakiri/i;
  const CODEX = 'habakiri-1';

  const POWERS = `“Uma espada que não deseja vencer batalhas. Deseja apenas que, ao final delas, não reste ninguém de pé.”

A Ame no Habakiri é uma katana de natureza maldita, cuja lâmina possui uma sede de sangue impossível de satisfazer. Sua bainha não serve apenas para proteger o fio, mas para aprisionar a entidade sanguinária que habita seu interior.

I — A ESPADA ADORMECIDA
Enquanto a espada permanecer embainhada, você utiliza a bainha como arma corpo a corpo.
Dano: 1d6 de concussão (1d8 com duas mãos).
Bônus Mágico: +1 nas jogadas de ataque e dano.
Propriedade: Versátil.
Natureza: Seus ataques com a bainha são mágicos.
Selo da Bainha. A espada não pode ser desembainhada voluntariamente enquanto as condições de despertar não forem satisfeitas.

II — O DESPERTAR DA LÂMINA
A espada somente pode ser desembainhada quando ambas as condições forem satisfeitas simultaneamente:
• Sangue do Portador: Seus PV atuais devem ser iguais ou inferiores à metade de seus PV máximos.
• Sangue do Adversário: Uma criatura hostil que você consiga enxergar a até 9 metros deve estar com PV iguais ou inferiores à metade de seus próprios PV máximos.
Quando essas condições forem satisfeitas, você poderá utilizar uma ação bônus para desembainhar a espada.
Uma vez desembainhada, ela não poderá ser guardada novamente até seu portador ficar inconsciente.

III — A LÂMINA DESEMBAINHADA
Dano: 1d10 cortante (1d12 com duas mãos).
Bônus Mágico: +2 nas jogadas de ataque e dano.
Dano Adicional: 2d8 necrótico por ataque que atingir.
Propriedade: Versátil.
Fio Carmesim. Seus ataques ignoram resistência a dano cortante não mágico. Ao obter um acerto crítico, você causa 2d8 de dano necrótico adicional, além dos dados normalmente duplicados pelo crítico.
Sede de Sangue. Uma criatura atingida pela lâmina começa a sangrar, sofrendo 1d8 de dano necrótico no início de cada turno dela.
O efeito permanece enquanto a espada estiver desembainhada, por até 1 minuto após o último golpe. Novos acertos renovam a duração, mas não acumulam o dano. Uma ação e um teste de Sabedoria (Medicina) CD 17, ou receber cura mágica, encerram o sangramento. Criaturas sem sangue ou fluidos vitais são imunes a esse efeito.`;

  const CURSE = `IV — O PREÇO DO SANGUE
No início de cada turno do portador após desembainhar, a espada absorve sua força vital.
1º turno: 1d8 de dano necrótico.
2º turno: 2d8 de dano necrótico.
3º turno: 3d8 de dano necrótico.
4º turno: 4d8 de dano necrótico.
5º turno em diante: 5d8 de dano necrótico.
Sangue Inevitável. Esse dano ignora resistências, imunidades e pontos de vida temporários, não podendo ser reduzido ou transferido.

V — FRENESI CARMESIM
Ao desembainhar a Ame no Habakiri, você entra imediatamente em Frenesi Carmesim, permanecendo nesse estado até ficar inconsciente.
Consciência Despedaçada. Você perde o controle de suas ações, não distingue aliados de inimigos, não pode conjurar magias, manter concentração, guardar a espada ou abandonar voluntariamente o combate.
Instinto Assassino. No início de cada turno, você persegue a criatura mais próxima que consiga perceber. Deve utilizar seu deslocamento para alcançá-la e realizar o maior número possível de ataques. Se não conseguir alcançá-la, utiliza Disparada para persegui-la. Empates de distância são resolvidos aleatoriamente.
Sede Insaciável. Você não pode poupar criaturas, realizar ataques não letais ou interromper voluntariamente seus ataques. Quando seu alvo morrer ou ficar inconsciente, você perseguirá a próxima criatura mais próxima.
Último Sacrifício. Quando não houver nenhuma outra criatura que você consiga perceber ou perseguir, você sofre 2d8 de dano necrótico adicional ao final de cada turno, ignorando resistências, imunidades e pontos de vida temporários.
Mãos Amaldiçoadas. A espada não pode ser largada voluntariamente. Se for arrancada de suas mãos, retornará magicamente à sua empunhadura no início do próximo turno, desde que você permaneça consciente.

VI — O SILÊNCIO DA ESPADA
Quando o portador ficar inconsciente ou for reduzido a 0 PV:
• O Frenesi Carmesim termina.
• A lâmina retorna magicamente à bainha.
• O dano progressivo da maldição termina.
• Os sangramentos provocados pela espada terminam.
• Se estiver com 0 PV, o portador realiza salvaguardas contra a morte normalmente.

VII — MALDIÇÃO: A PROMESSA DO ÚLTIMO SANGUE
A Ame no Habakiri não reconhece lealdade, misericórdia ou vitória.
Enquanto estiver desembainhada, seu único propósito será continuar matando até que seu portador perca a consciência.
Sua sintonização não pode ser encerrada voluntariamente enquanto estiver amaldiçoada. Remover Maldição permite encerrar a sintonização quando a espada estiver embainhada, mas não interrompe um Frenesi Carmesim ativo.

“A primeira gota de sangue abre o caminho. A última pertence àquele que ousou empunhá-la.”`;

  const IMAGE = 'assets/images/ame-no-habakiri.webp';
  const APPEARANCE = `“天の羽々斬り — a lâmina que corta até o céu.”

A Lâmina. Fio carmesim, herança de gerações. Veios vermelhos correm pelo aço negro como sangue vivo: uma lâmina que corta além do físico, atravessando o próprio destino.
A Bainha. Mais que proteção, um registro. Laca negra trabalhada em prata, com o nome ADRITCH gravado entre luas, nuvens e flores. Cada marca, uma geração. Cada gravura, uma história.
A Empunhadura. Tsuka trançada em preto e vermelho, tsuba de prata lavrada e uma longa borla carmesim pendendo do cabo.
O Símbolo da Linhagem. A lua crescente, símbolo dos Adritch. Um farol na escuridão, um corte na história.
A Marca da Maldição. A flor que sangra, lembrando que a Ame no Habakiri jamais saciará sua fome.

As gravuras da bainha:
• I — A Origem: O primeiro Adritch. O início de uma linhagem.
• II — O Confronto: A família que enfrentou o impossível.
• III — A Traição: O nome que foi apagado.
• IV — O Sacrifício: O sangue que selou o legado.
• V — O Último Portador: A promessa que não se cumpriu.
• VI — O Legado: E agora... a história continua.`;

  const FORMS = {
    sheathed: { atk: 'FOR+PB+1', die: 6, die2: 8, bonus: 1, type: 'concussão', extra: '' },
    drawn: { atk: 'FOR+PB+2', die: 10, die2: 12, bonus: 2, type: 'cortante', extra: '2d8' }
  };

  /* ---------- dados ---------- */
  function hk(w) {
    if (!w.habakiri || typeof w.habakiri !== 'object') w.habakiri = {};
    const h = w.habakiri;
    h.drawn = h.drawn === true;
    h.twoHands = h.twoHands === true;
    h.enemyHalf = h.enemyHalf === true;
    h.alone = h.alone === true;
    h.humanTarget = h.humanTarget === true;
    h.turn = Math.max(0, Math.min(99, Number(h.turn) || 0));
    return h;
  }
  function damageExpr(w) {
    const h = hk(w), f = h.drawn ? FORMS.drawn : FORMS.sheathed;
    return '1d' + (h.twoHands ? f.die2 : f.die) + '+FOR+' + f.bonus + (f.extra ? '+' + f.extra : '');
  }
  function syncWeapon(w) {
    const h = hk(w);
    w.attack = (h.drawn ? FORMS.drawn : FORMS.sheathed).atk;
    w.damage = damageExpr(w);
    w.stage = h.drawn ? 'Liberada' : 'Adormecida';
  }

  function migrate() {
    if (!Array.isArray(state.cursedWeapons)) return;
    let w = state.cursedWeapons.find(x => MATCH.test(x.name || ''));
    if (!w) { w = { corruption: 0, corruptionMax: 0, charges: 0, chargesMax: 0, reset: 'long', manaCost: '', activationCorrupts: false, attuned: true, notes: '' }; state.cursedWeapons.unshift(w); }
    if (typeof w.appearance !== 'string' || !w.appearance.trim()) { w.appearance = APPEARANCE; if (w.codex === CODEX) save(); }
    if (w.codex === CODEX) { hk(w); return; }
    Object.assign(w, {
      name: 'Ame no Habakiri', spirit: 'A Espada Sedenta de Sangue', type: 'Katana', rarity: 'Muito rara · requer sintonização',
      sigil: '血', aura: '#c3122f', properties: 'Versátil · mágica', powers: POWERS, curse: CURSE,
      corruption: 0, corruptionMax: 0, codex: CODEX
    });
    if (/^Registrada a partir das Relações/.test(w.notes || '')) w.notes = '';
    hk(w); syncWeapon(w);
    save();
  }
  migrate();

  /* o backup do Arsenal não conhece estes campos: preserva-os */
  const previousExtend = window.extendBackup;
  window.extendBackup = (data, clean) => {
    previousExtend?.(data, clean);
    if (!Array.isArray(data.cursedWeapons) || !Array.isArray(clean.cursedWeapons)) return;
    const src = data.cursedWeapons.filter(w => w && typeof w === 'object');
    clean.cursedWeapons.forEach((w, i) => {
      const s = src[i];
      if (!s || !MATCH.test(w.name || '')) return;
      if (s.codex === CODEX) w.codex = CODEX;
      if (typeof s.appearance === 'string') w.appearance = s.appearance.slice(0, 20000);
      if (s.habakiri && typeof s.habakiri === 'object') w.habakiri = {
        drawn: s.habakiri.drawn === true, twoHands: s.habakiri.twoHands === true,
        enemyHalf: s.habakiri.enemyHalf === true, alone: s.habakiri.alone === true, humanTarget: s.habakiri.humanTarget === true,
        turn: Math.max(0, Math.min(99, Number(s.habakiri.turn) || 0))
      };
    });
  };

  /* ---------- códex formatado ---------- */
  function codex(text) {
    const root = el('div', undefined, 'hk-codex');
    let sec = null, list = null;
    const target = () => sec || root;
    String(text || '').split('\n').forEach(raw => {
      const line = raw.trim();
      if (!line) { list = null; return; }
      let m;
      if ((m = line.match(/^([IVX]+)\s+—\s+(.+)$/))) {
        sec = el('section', undefined, 'hk-sec');
        const h = el('h4');
        h.append(el('span', m[1], 'hk-num'), document.createTextNode(m[2]));
        sec.append(h); root.append(sec); list = null; return;
      }
      if (/^“.*”$/.test(line)) { target().append(el('blockquote', line, 'hk-quote')); list = null; return; }
      if ((m = line.match(/^•\s*(?:([^:]{2,40}):\s*)?(.+)$/))) {
        if (!list) { list = el('ul', undefined, 'hk-list'); target().append(list); }
        const li = el('li');
        if (m[1]) li.append(el('b', m[1] + ': '));
        li.append(document.createTextNode(m[2]));
        list.append(li); return;
      }
      list = null;
      if ((m = line.match(/^([^:.]{2,32}):\s+(.+)$/))) {
        const row = el('div', undefined, 'hk-stat');
        row.append(el('dt', m[1]), el('dd', m[2]));
        target().append(row); return;
      }
      if ((m = line.match(/^([A-ZÀ-Ú][\wÀ-ú ]{2,36})\.\s+(.+)$/)) && m[1].split(' ').length <= 4) {
        const p = el('p', undefined, 'hk-trait');
        p.append(el('b', m[1] + '. '), document.createTextNode(m[2]));
        target().append(p); return;
      }
      target().append(el('p', line));
    });
    return root;
  }

  /* ---------- painel ---------- */
  const signedNum = n => (n >= 0 ? '+' : '') + n;
  const isHuman = () => /human/i.test(state.race || '');

  /* rolagem de dano separando físico e necrótico (o necrótico dobra em alvo humano) */
  function rollSplit(title, physical, necro, flat, doubleNecro) {
    const roll = (n, s) => Array.from({ length: n }, () => die(s));
    const p = physical ? roll(physical[0], physical[1]) : [];
    const nd = necro[0] ? roll(necro[0], necro[1]) : [];
    const pSum = p.reduce((a, b) => a + b, 0) + flat;
    const nRaw = nd.reduce((a, b) => a + b, 0);
    const nSum = doubleNecro ? nRaw * 2 : nRaw;
    const parts = [];
    if (physical) parts.push(physical[0] + 'd' + physical[1] + ' [' + p.join(', ') + '] ' + signedNum(flat) + ' = ' + pSum + ' ' + physical[2]);
    if (nd.length) parts.push(necro[0] + 'd' + necro[1] + ' [' + nd.join(', ') + ']' + (doubleNecro ? ' ×2 (humano)' : '') + ' = ' + nSum + ' necrótico');
    rollResult(title, pSum * (physical ? 1 : 0) + nSum, parts.join(' · '));
  }
  let lastMessage = '';
  function panel(w, card) {
    const h = hk(w);
    const box = el('section', undefined, 'hk ' + (h.drawn ? 'is-drawn' : 'is-sheathed'));
    const half = Math.floor((Number(state.maxhp) || 1) / 2);
    const ownBlood = Number(state.hp) <= half;
    const refresh = () => { syncWeapon(w); save(); enhance(); };

    /* faixa de estado */
    const ribbon = el('div', undefined, 'hk-ribbon');
    ribbon.append(el('b', h.drawn ? '血' : '鞘', 'hk-ribbon-glyph'));
    const rt = el('div');
    rt.append(el('strong', h.drawn ? 'Desembainhada' : 'Adormecida na bainha'),
      el('span', h.drawn ? 'Frenesi Carmesim · ' + (h.turn ? h.turn + 'º turno' : 'aguardando o 1º turno') : 'O selo segura a entidade. Por enquanto.'));
    ribbon.append(rt);
    box.append(ribbon);

    /* duas formas lado a lado */
    const forms = el('div', undefined, 'hk-forms');
    const formCard = (key, title, glyph) => {
      const f = FORMS[key], active = (key === 'drawn') === h.drawn;
      const c = el('div', undefined, 'hk-form' + (active ? ' active' : ''));
      const head = el('div', undefined, 'hk-form-head');
      head.append(el('i', glyph), el('b', title));
      c.append(head);
      const rows = [
        ['Dano', '1d' + f.die + ' ' + f.type + ' (1d' + f.die2 + ' duas mãos)'],
        ['Bônus', signedNum(f.bonus) + ' ataque e dano']
      ];
      if (f.extra) rows.push(['Adicional', f.extra + ' necrótico por acerto']);
      rows.push(['Natureza', key === 'drawn' ? 'Ignora resistência a cortante não mágico' : 'Ataques mágicos']);
      rows.forEach(([a, b]) => { const r = el('div', undefined, 'hk-row'); r.append(el('span', a), el('span', b)); c.append(r); });
      return c;
    };
    forms.append(formCard('sheathed', 'Bainha', '鞘'), formCard('drawn', 'Lâmina', '刃'));
    box.append(forms);

    /* combate */
    const combat = el('div', undefined, 'hk-actions');
    const name = w.name || 'Ame no Habakiri';
    const atk = el('button', '⚔ Ataque ' + signedNum((h.drawn ? 2 : 1)));
    atk.onclick = () => window.rollExpr('Ataque · ' + name, '1d20+' + w.attack);
    const f = h.drawn ? FORMS.drawn : FORMS.sheathed;
    const dieSize = h.twoHands ? f.die2 : f.die;
    const flat = mod(state.attrs[0]) + f.bonus;
    const humanTarget = h.drawn && h.humanTarget;
    const dmg = el('button', '✶ Dano');
    dmg.onclick = () => h.drawn
      ? rollSplit('Dano · ' + name + (humanTarget ? ' · alvo humano' : ''), [1, dieSize, f.type], [2, 8], flat, humanTarget)
      : window.rollExpr('Dano · ' + name, damageExpr(w));
    const crit = el('button', '☠ Crítico');
    crit.title = h.drawn ? 'Dados dobrados + 2d8 necrótico do Fio Carmesim' : 'Dados dobrados';
    crit.onclick = () => h.drawn
      ? rollSplit('Crítico · ' + name + (humanTarget ? ' · alvo humano' : ''), [2, dieSize, f.type], [6, 8], flat, humanTarget)
      : window.rollExpr('Crítico · ' + name, '2d' + dieSize + '+FOR+' + f.bonus);
    const hands = el('label', undefined, 'preference hk-hands');
    const handsBox = el('input'); handsBox.type = 'checkbox'; handsBox.checked = h.twoHands;
    handsBox.onchange = () => { h.twoHands = handsBox.checked; refresh(); };
    hands.append(handsBox, document.createTextNode('Duas mãos'));
    combat.append(atk, dmg, crit);
    if (h.drawn) {
      const bleed = el('button', '滴 Sangramento 1d8');
      bleed.title = 'Sede de Sangue: no início do turno da criatura atingida';
      bleed.onclick = () => rollSplit('Sede de Sangue · sangramento' + (humanTarget ? ' · alvo humano' : ''), null, [1, 8], 0, humanTarget);
      combat.append(bleed);
    }
    combat.append(hands);
    if (h.drawn) {
      const human = el('label', undefined, 'preference hk-human');
      const humanBox = el('input'); humanBox.type = 'checkbox'; humanBox.checked = h.humanTarget === true;
      humanBox.onchange = () => { h.humanTarget = humanBox.checked; save(); enhance(); };
      human.append(humanBox, document.createTextNode('Alvo humano (necrótico ×2)'));
      combat.append(human);
    }
    box.append(combat);

    const status = el('p', '', 'hk-status');
    status.setAttribute('role', 'status');

    if (!h.drawn) {
      /* condições de despertar */
      const wake = el('div', undefined, 'hk-wake');
      wake.append(el('p', 'Condições de despertar', 'hk-label'));
      const cond1 = el('div', undefined, 'hk-cond' + (ownBlood ? ' ok' : ''));
      cond1.append(el('i', ownBlood ? '◆' : '◇'), el('span', 'Sangue do portador · ' + state.hp + ' / ' + state.maxhp + ' PV (precisa ≤ ' + half + ')'));
      const cond2 = el('label', undefined, 'hk-cond' + (h.enemyHalf ? ' ok' : ''));
      const enemy = el('input'); enemy.type = 'checkbox'; enemy.checked = h.enemyHalf;
      enemy.onchange = () => { h.enemyHalf = enemy.checked; save(); enhance(); };
      cond2.append(enemy, el('span', 'Sangue do adversário · hostil visível a até 9 m com ≤ metade dos PV'));
      const ready = ownBlood && h.enemyHalf;
      const draw = el('button', '血 Desembainhar · ação bônus', 'red hk-draw' + (ready ? '' : ' locked'));
      draw.title = ready ? 'Não há volta até ficar inconsciente.' : 'O selo ainda segura a lâmina.';
      draw.onclick = () => {
        if (!ready) {
          const missing = [];
          if (!ownBlood) missing.push('seus PV precisam estar em ' + half + ' ou menos (agora: ' + state.hp + ')');
          if (!h.enemyHalf) missing.push('marque um inimigo a até 9 m com metade dos PV ou menos');
          lastMessage = 'O selo ainda segura a lâmina: ' + missing.join('; ') + '.';
          status.textContent = lastMessage;
          if (!confirm('As condições de despertar não foram cumpridas:\n• ' + missing.join('\n• ') + '\n\nDesembainhar mesmo assim (o mestre permitiu)?')) return;
        } else if (!confirm('Desembainhar a Ame no Habakiri?\nVocê entra em Frenesi Carmesim e não pode guardá-la até ficar inconsciente.')) return;
        h.drawn = true; h.turn = 0; h.enemyHalf = false; h.alone = false; lastMessage = '';
        refresh();
        document.body.classList.add('hk-unsheathe');
        setTimeout(() => document.body.classList.remove('hk-unsheathe'), 1400);
      };
      wake.append(cond1, cond2, draw);
      box.append(wake);
    } else {
      /* preço do sangue */
      const price = el('div', undefined, 'hk-price');
      price.append(el('p', 'O preço do sangue', 'hk-label'));
      const track = el('div', undefined, 'hk-track');
      for (let t = 1; t <= 5; t++) {
        const step = el('span', t + 'd8', 'hk-step' + (h.turn >= t ? ' paid' : '') + (Math.min(h.turn + 1, 5) === t ? ' next' : ''));
        step.title = (t === 5 ? '5º turno em diante' : t + 'º turno') + ': ' + t + 'd8 necrótico';
        track.append(step);
      }
      price.append(track);
      const apply = (title, expr) => {
        let total = window.rollExpr(title, expr);
        if (total === null || total === undefined) return null;
        if (isHuman()) {
          /* dano necrótico dobra em humanos */
          const rolled = total;
          total *= 2;
          document.getElementById('roll-total').textContent = total;
          document.getElementById('roll-detail').textContent += ' · ×2 necrótico (humano): ' + rolled + ' → ' + total;
        }
        state.hp = Math.max(0, Number(state.hp) - total);
        if (typeof summary === 'function') summary();
        if (state.hp <= 0) silence('Reduzido a 0 PV. A espada silencia. Faça salvaguardas contra a morte.');
        return total;
      };
      const turnBtn = el('button', '⟳ Início do turno · ' + Math.min(h.turn + 1, 5) + 'd8', 'red');
      turnBtn.onclick = () => {
        const n = Math.min(h.turn + 1, 5);
        h.turn += 1;
        const total = apply('Preço do sangue · ' + h.turn + 'º turno', n + 'd8');
        if (total !== null && h.drawn) { save(); enhance(); }
      };
      const alone = el('label', undefined, 'preference');
      const aloneBox = el('input'); aloneBox.type = 'checkbox'; aloneBox.checked = h.alone;
      aloneBox.onchange = () => { h.alone = aloneBox.checked; save(); enhance(); };
      alone.append(aloneBox, document.createTextNode('Ninguém mais para perseguir'));
      const row = el('div', undefined, 'hk-price-row');
      row.append(turnBtn);
      if (h.alone) {
        const last = el('button', '✝ Fim do turno · Último Sacrifício 2d8');
        last.onclick = () => { if (apply('Último Sacrifício', '2d8') !== null && h.drawn) { save(); enhance(); } };
        row.append(last);
      }
      row.append(alone);
      price.append(row, el('p', 'Ignora resistências, imunidades e PV temporários. Desconta direto dos PV.' + (isHuman() ? ' Você é humano: o necrótico chega dobrado.' : ''), 'hk-note'));
      const out = el('button', '鞘 Portador inconsciente · a espada silencia');
      out.className = 'hk-silence';
      out.onclick = () => { if (confirm('O portador ficou inconsciente? A lâmina volta à bainha.')) silence('A lâmina retornou à bainha. O frenesi terminou.'); };
      price.append(out);
      box.append(price);
    }
    box.append(status);

    status.textContent = lastMessage;
    function silence(msg) {
      h.drawn = false; h.turn = 0; h.alone = false;
      lastMessage = msg;
      syncWeapon(w); save(); enhance();
    }
    return box;
  }

  /* ---------- imagem da espada ---------- */
  let lightbox;
  function hero(w) {
    const fig = el('figure', undefined, 'hk-hero');
    const img = el('img');
    img.src = IMAGE;
    img.alt = 'Ame no Habakiri: katana de lâmina negra com veios carmesins e bainha de laca gravada com o nome Adritch, luas crescentes e flores vermelhas.';
    img.loading = 'lazy';
    img.decoding = 'async';
    const cap = el('figcaption');
    cap.append(el('span', '天の羽々斬り', 'hk-hero-jp'), el('span', 'Toque para ampliar'));
    const open = el('button', undefined, 'hk-hero-open');
    open.type = 'button';
    open.setAttribute('aria-label', 'Ampliar a imagem da ' + (w.name || 'espada'));
    open.append(img, cap);
    open.onclick = () => {
      if (!lightbox) {
        lightbox = el('dialog', undefined, 'hk-lightbox');
        const big = el('img');
        big.alt = img.alt;
        const close = el('button', '×', 'hk-lightbox-close');
        close.type = 'button'; close.setAttribute('aria-label', 'Fechar');
        close.onclick = () => lightbox.close();
        lightbox.append(close, big);
        lightbox.onclick = e => { if (e.target === lightbox || e.target === big) lightbox.close(); };
        document.body.append(lightbox);
      }
      lightbox.querySelector('img').src = IMAGE;
      lightbox.showModal();
    };
    fig.append(open);
    return fig;
  }

  /* ---------- montar no cartão ---------- */
  let busy = false;
  function enhance() {
    if (busy) return;
    busy = true;
    try {
      const root = document.getElementById('cursed-weapons');
      if (!root) return;
      [...root.children].forEach((card, i) => {
        const w = state.cursedWeapons[i];
        if (!w || !MATCH.test(w.name || '') || !card.classList.contains('cursed')) return;
        const h = hk(w);
        /* 0 PV com a espada fora: silêncio automático */
        if (h.drawn && Number(state.hp) <= 0) { h.drawn = false; h.turn = 0; h.alone = false; lastMessage = 'Reduzido a 0 PV. A espada silencia. Faça salvaguardas contra a morte.'; syncWeapon(w); save(); }
        if (card.dataset.hkSynced !== '1') {
          /* o Arsenal pode ter desenhado o cartão antes da atualização dos dados */
          card.dataset.hkSynced = '1';
          const set = (sel, v) => { const n = card.querySelector(sel); if (n && n.value !== v) n.value = v || ''; };
          set('.cursed-name', w.name); set('.cursed-spirit', w.spirit); set('.cursed-sigil', w.sigil);
          const metaInputs = card.querySelectorAll('.cursed-meta input');
          if (metaInputs[0]) metaInputs[0].value = w.type || '';
          if (metaInputs[1]) metaInputs[1].value = w.rarity || '';
          card.style.setProperty('--aura', /^#[0-9a-f]{6}$/i.test(w.aura) ? w.aura : '#c3122f');
          const aura = card.querySelector('.cursed-more input[type=color]');
          if (aura) aura.value = w.aura;
          const notes = card.querySelector('.cursed-more textarea');
          if (notes) notes.value = w.notes || '';
          card.querySelectorAll('.cursed-texts textarea').forEach((t, k) => { t.value = k ? w.curse : w.powers; });
        }
        card.classList.add('hk-card');
        card.classList.toggle('hk-drawn', h.drawn);
        card.dataset.stage = h.drawn ? 3 : 0;
        const stageSel = card.querySelector('.cursed-meta select');
        if (stageSel) { stageSel.value = w.stage; stageSel.disabled = true; stageSel.title = 'Controlado pelo painel da espada'; }
        card.querySelector(':scope > .hk')?.remove();
        if (!card.querySelector(':scope > .hk-hero')) card.querySelector('.cursed-head').after(hero(w));
        card.querySelector(':scope > .hk-hero').after(panel(w, card));

        const texts = card.querySelector('.cursed-texts');
        if (texts && !card.querySelector('.hk-lore')) {
          const lore = el('div', undefined, 'hk-lore');
          const bar = el('div', undefined, 'hk-lore-bar');
          bar.append(el('p', '書 / CÓDEX DA ESPADA', 'eyebrow'));
          const edit = el('button', 'Editar texto');
          edit.type = 'button';
          const view = el('div', undefined, 'hk-lore-view');
          const draw = () => {
            const look = el('section', undefined, 'hk-sec hk-look');
            const h = el('h4');
            h.append(el('span', '外見', 'hk-num hk-jp'), document.createTextNode('APARÊNCIA'));
            look.append(h, codex(w.appearance));
            view.replaceChildren(look, codex(w.powers), codex(w.curse));
          };
          if (!texts.querySelector('.hk-appearance-field')) {
            const field = labeledField('Aparência', w.appearance, v => { w.appearance = v; save(); }, true);
            field.classList.add('hk-appearance-field');
            texts.prepend(field);
          }
          edit.onclick = () => {
            const editing = texts.classList.toggle('hk-editing');
            edit.textContent = editing ? 'Ver códex' : 'Editar texto';
            view.hidden = editing;
            if (!editing) draw();
          };
          bar.append(edit);
          draw();
          lore.append(bar, view);
          texts.before(lore);
        }
      });
    } finally { busy = false; }
  }

  const root = document.getElementById('cursed-weapons');
  if (root) new MutationObserver(enhance).observe(root, { childList: true });
  enhance();

  /* vida mudou em outro lugar (dano/cura): atualiza as condições */
  const baseSave = save;
  save = function (...args) {
    const r = baseSave(...args);
    if (!busy) queueMicrotask(() => {
      const w = (state.cursedWeapons || []).find(x => MATCH.test(x.name || ''));
      const card = document.querySelector('#cursed-weapons .hk-card');
      if (!w || !card) return;
      const key = state.hp + '/' + state.maxhp + '/' + hk(w).drawn;
      if (card.dataset.hkKey !== key) { card.dataset.hkKey = key; enhance(); }
    });
    return r;
  };
})();
