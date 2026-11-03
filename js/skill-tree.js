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
  const sample = el('button', 'Adicionar Combustão Absoluta');
  sample.onclick = () => {
    let entry = state.customAbilities.find(ability => ability.title.trim().toLocaleLowerCase() === 'combustão absoluta');
    if (!entry) {
      entry = {"title": "Combustão Absoluta", "category": "Truque de Evocação", "text": "Combustão Absoluta\n\nTruque de Evocação\n\nTempo de Conjuração: 1 ação\nAlcance: 18 metros\nComponentes: V, S\nDuração: Instantânea\n\nVocê não simplesmente cria fogo.\n\nVocê reproduz uma combustão mágica considerando energia térmica residual, oxigenação, combustível, distância, estabilidade e eficiência da reação antes de liberar uma esfera flamejante.\n\nFaça um ataque mágico à distância contra uma criatura.\n\nAcerto: causa 1d6 de dano de fogo.\n\nDepois disso, determine o Índice de Combustão (IC).\n\nEQUAÇÃO PRINCIPAL\n\nO Índice de Combustão é:\n\nIC = ⌊[(T × O × C) + R + ΔT] ÷ (D + E)⌋\n\nOnde:\n\nT = Temperatura\n\nO = Oxigenação\n\nC = Combustível\n\nR = Ressonância Térmica\n\nΔT = Variação Térmica\n\nD = Dissipação pela Distância\n\nE = Entropia\n\nDepois de calcular tudo, o IC mínimo é 0 e o máximo considerado para o dano é 8.\n\nTemperatura — T\n\nPrimeiro determine a condição térmica da área imediatamente ao redor do alvo.\n\nFrio intenso: T = 1\n\nFrio: T = 2\n\nTemperatura comum: T = 3\n\nQuente: T = 4\n\nMuito quente ou próximo de uma grande chama: T = 5\n\nPorém, existe uma regra adicional.\n\nCada vez que o alvo sofrer dano de fogo, recebe 1 ponto de Calor Residual até o começo do seu próximo turno.\n\nMáximo de 3.\n\nPara cada ponto:\n\nT = T + 1\n\nPortanto, um alvo em ambiente comum com 2 Calores Residuais possui:\n\nT = 3 + 2 = 5\n\nOxigenação — O\n\nDetermine a disponibilidade de ar ao redor da combustão.\n\nAmbiente quase sem ar: O = 0,5\n\nAmbiente fechado: O = 1\n\nAmbiente normal: O = 1,25\n\nÁrea aberta: O = 1,5\n\nCorrente forte de ar alimentando diretamente as chamas: O = 2\n\nSe estiver completamente sem oxigênio e nenhuma característica mágica permitir a combustão:\n\nO = 0\n\nCombustível — C\n\nAgora determine quanto material combustível existe diretamente no alvo ou imediatamente ao seu redor.\n\nNenhum combustível relevante: C = 1\n\nPouco combustível: C = 1,25\n\nMaterial inflamável: C = 1,5\n\nMuito combustível: C = 1,75\n\nAlvo coberto por substância altamente inflamável: C = 2\n\nUma criatura não conta automaticamente como combustível apenas por possuir roupas.\n\nRessonância Térmica — R\n\nVocê pode aproveitar fogo que já existe.\n\nConte quantas fontes significativas de fogo existem a até 6 metros do alvo.\n\nCada fonte fornece:\n\nR = +1\n\nMáximo:\n\nR = +3\n\nUma fogueira, criatura em chamas ou área flamejante pode contar.\n\nPequenas velas não contam individualmente.\n\nVariação Térmica — ΔT\n\nAqui começa a parte desagradável.\n\nCompare a Temperatura T atual com a Temperatura que o alvo possuía no começo da rodada.\n\nCalcule:\n\nΔT = |T atual − T inicial| × 2\n\nAs barras \"| |\" significam valor absoluto.\n\nPortanto, uma diferença negativa também vira positiva.\n\nExemplo\n\nT inicial = 2\n\nT atual = 5\n\nΔT = |5 − 2| × 2\n\nΔT = 3 × 2\n\nΔT = 6\n\nUma mudança térmica brusca favorece a explosão.\n\nDissipação — D\n\nAgora determine quanta energia se perde até atingir o alvo.\n\nD = 1 + ⌊Distância em metros ÷ 6⌋\n\nAssim:\n\n0–5,9 m → D = 1\n\n6–11,9 m → D = 2\n\n12–17,9 m → D = 3\n\n18 m → D = 4\n\nEntropia — E\n\nToda combustão perde energia.\n\nNo momento em que conjura a magia, role 1d4.\n\nEsse resultado é sua Entropia.\n\nE = resultado do d4\n\nPortanto, mesmo uma combustão perfeitamente planejada possui uma pequena quantidade de imprevisibilidade.\n\nÍNDICE DE COMBUSTÃO\n\nAgora finalmente utilize:\n\nIC = ⌊[(T × O × C) + R + ΔT] ÷ (D + E)⌋\n\nDepois aplique o resultado.\n\nIC 0–1: nenhum dano adicional.\n\nIC 2–3: +1d4 de fogo\n\nIC 4–5: +1d6 de fogo\n\nIC 6–7: +1d8 de fogo\n\nIC 8+: +1d8 de fogo e ocorre Combustão Perfeita.\n\nCombustão Perfeita\n\nSe o IC alcançar 8, calcule seu Excedente Térmico (ET):\n\nET = IC bruto − 8\n\nO IC bruto é o resultado antes de aplicar o limite de 8.\n\nO ET máximo considerado é igual ao seu Bônus de Proficiência.\n\nEscolha como converter o ET.\n\nPressão\n\nCada 2 ET causam:\n\n+1 de dano de fogo\n\nPersistência\n\nCada 2 ET podem aumentar em 1 o Calor Residual aplicado ao alvo.\n\nAinda respeita o limite normal.\n\nTransferência\n\nVocê pode transferir ET para outra criatura a até:\n\n1,5 m × ET\n\ndo alvo.\n\nEla recebe 1 de dano de fogo por ET transferido.\n\nEsse dano não gera Calor Residual.\n\nCOEFICIENTE DE EFICIÊNCIA TÉRMICA\n\nAgora existe uma segunda equação.\n\nDepois de determinar seu IC, calcule:\n\nη = IC ÷ (T + R + 1)\n\n\"η\" representa a eficiência da combustão.\n\nSe η < 0,5\n\nA reação foi Ineficiente.\n\nNada adicional acontece.\n\nSe η estiver entre 0,5 e 0,99\n\nA reação foi Estável.\n\nO alvo recebe +1 Calor Residual.\n\nSe η estiver entre 1 e 1,49\n\nA reação foi Eficiente.\n\nVocê pode mover a chama 1,5 metro depois do impacto, incendiando um objeto inflamável desprotegido.\n\nSe η ≥ 1,5\n\nVocê alcança Eficiência Termodinâmica Máxima.\n\nO dado adicional de IC é considerado como tendo obtido pelo menos metade de seu valor máximo.\n\nSATURAÇÃO TÉRMICA\n\nExiste um problema.\n\nQuanto mais você aquece o alvo, mais difícil fica continuar transferindo energia eficientemente.\n\nDepois de calcular o IC, determine:\n\nST = Calor Residual²\n\nCom:\n\n1 Calor → ST = 1\n\n2 Calores → ST = 4\n\n3 Calores → ST = 9\n\nSe o alvo já possuía Calor Residual antes do ataque, calcule:\n\nIC Final = IC − ⌊ST ÷ 4⌋\n\nPortanto:\n\n1 Calor → −0\n\n2 Calores → −1 IC\n\n3 Calores → −2 IC\n\nIsso impede simplesmente acumular calor infinitamente para aumentar a magia.\n\nREAÇÃO EM CADEIA\n\nSe houver outra criatura com Calor Residual a até 3 metros do alvo, calcule:\n\nRC = √(CR₁ × CR₂)\n\nOnde CR₁ e CR₂ são os Calores Residuais das duas criaturas.\n\nArredonde para baixo.\n\nAdicione RC ao seu IC antes da Saturação Térmica.\n\nExemplo\n\nAlvo A possui 3 Calores.\n\nAlvo B possui 2.\n\nRC = √(3 × 2)\n\nRC = √6\n\nRC ≈ 2,44\n\nArredondando:\n\nRC = +2 IC\n\nPONTO DE IGNIÇÃO\n\nSe simultaneamente:\n\nT ≥ 5\n\nO ≥ 1,5\n\nC ≥ 1,5\n\nΔT ≥ 4\n\ne\n\nIC Final ≥ 8\n\nvocê alcança o Ponto de Ignição.\n\nNesse caso, o alvo sofre Combustão Secundária no começo do próximo turno.\n\nO dano é:\n\nCS = ⌈(T × C + ET) ÷ (E + 1)⌉\n\nde dano de fogo.\n\nA Combustão Secundária não pode causar mais dano que seu Bônus de Proficiência + 2.\n\nEla não pode ativar outra Combustão Secundária.\n\nPROGRESSÃO\n\nO dano base aumenta normalmente:\n\n5º nível: 2d6\n\n11º nível: 3d6\n\n17º nível: 4d6\n\nO dado adicional continua limitado a 1d8.\n\nAs outras equações não aumentam diretamente com o nível.\n\nEXEMPLO\n\nUm inimigo está a 5 metros.\n\nO ambiente está quente:\n\nT base = 4\n\nEle possui 1 Calor Residual:\n\nT = 5\n\nEstá em área aberta:\n\nO = 1,5\n\nEstá coberto por material inflamável:\n\nC = 2\n\nExistem duas fontes de fogo próximas:\n\nR = 2\n\nNo começo da rodada sua temperatura era T = 3.\n\nLogo:\n\nΔT = |5 − 3| × 2\n\nΔT = 4\n\nDistância de 5 metros:\n\nD = 1\n\nVocê rola Entropia:\n\nE = 2\n\nAgora:\n\nIC = ⌊[(5 × 1,5 × 2) + 2 + 4] ÷ (1 + 2)⌋\n\nPrimeiro:\n\n5 × 1,5 × 2 = 15\n\nDepois:\n\n15 + 2 + 4 = 21\n\nDenominador:\n\n1 + 2 = 3\n\nPortanto:\n\nIC = 21 ÷ 3\n\nIC = 7\n\nAgora verificamos Saturação.\n\nO alvo possuía 1 Calor:\n\nST = 1² = 1\n\n⌊1 ÷ 4⌋ = 0\n\nLogo:\n\nIC Final = 7\n\nO ataque causa:\n\n1d6 + 1d8 de dano de fogo.\n\nE ainda precisamos calcular a eficiência:\n\nη = 7 ÷ (5 + 2 + 1)\n\nη = 7 ÷ 8\n\nη = 0,875\n\nA combustão é Estável.\n\nPortanto, o alvo recebe +1 Calor Residual.", "cost": "1 ação", "range": "18 metros", "damage": "1d6 de fogo em acerto, mais o dado de IC quando aplicável"};
      state.customAbilities.push(entry);
      save();
    }
    render(entry);
  };
  const actions = el('div', undefined, 'skill-editor-tools');
  actions.append(add, sample);
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
