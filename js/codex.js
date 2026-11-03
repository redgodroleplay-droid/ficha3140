Object.assign(titles, {
  ficha: ['01 / 概要', 'Visão geral'],
  historia: ['02 / 歴史', 'História'],
  habilidades: ['03 / 技能', 'Habilidades'],
  inventario: ['04 / 装備', 'Inventário'],
  tecnicas: ['05 / 剣技', 'Técnicas'],
  relacoes: ['06 / 関係', 'Relações'],
  diario: ['07 / 日記', 'Diário'],
  besta: ['封印 / ENTIDADE', 'A besta selada']
});

const openChapter = openTab;
openTab = function (id) {
  document.querySelectorAll(".custom-nav.active").forEach(button => button.classList.remove("active"));
  openChapter(id);
  const topicMenu = $(".topic-menu");
  if (topicMenu && id !== "custom-topic") topicMenu.open = false;
  document.body.dataset.chapter = id;
  document.querySelectorAll('nav [data-tab]').forEach(button => {
    if (button.dataset.tab === id || (id === 'besta' && button.dataset.tab === 'relacoes')) {
      button.setAttribute('aria-current', 'page');
    } else {
      button.removeAttribute('aria-current');
    }
  });
  if (id !== 'historia') document.body.classList.remove('reading');
};
$('.mark').onclick = event => { event.preventDefault(); openTab('ficha'); };
openTab('ficha');

const settings = $('#preferences');
$('#settings').onclick = () => settings.showModal();


const sheet = $('.fields');
for (const [key, label] of [['race', 'Raça'], ['characterClass', 'Classe'], ['speed', 'Deslocamento']]) {
  const wrapper = el('label', label);
  const input = el('input');
  input.value = state[key];
  input.placeholder = 'A registrar';
  input.oninput = () => { state[key] = input.value; syncIdentity(); save(); };
  wrapper.append(input);
  sheet.append(wrapper);
}

function syncIdentity() {
  const tags = $('.identity-tags').children;
  tags[0].textContent = state.race || 'Raça a registrar';
  tags[1].textContent = state.characterClass || 'Classe a registrar';
}
syncIdentity();

let activeLore = 0;
function renderLore() {
  const index = $('#lore-index');
  const content = $('#lore-content');
  index.replaceChildren();
  content.replaceChildren();
  state.lore.forEach((entry, i) => {
    const button = el('button', String(i + 1).padStart(2, '0') + ' · ' + (entry.title || 'Sem título'));
    button.classList.toggle('active', i === activeLore);
    button.onclick = () => { activeLore = i; renderLore(); };
    index.append(button);
  });
  const entry = state.lore[activeLore];
  if (!entry) {
    content.append(el('p', 'Os capítulos da campanha podem ser registrados aqui.'));
    return;
  }
  const heading = el('h3', entry.title || 'Sem título');
  const subtitle = el('p', entry.subtitle, 'eyebrow');
  const paragraph = el('p', entry.text || 'Capítulo em branco.', 'lore-text');
  const edit = el('button', 'Editar capítulo');
  edit.onclick = () => {
    content.replaceChildren();
    for (const [key, label] of [['title', 'Título'], ['subtitle', 'Subtítulo'], ['text', 'Texto do capítulo']]) {
      const control = labeledField(label, entry[key], value => {
        entry[key] = value;
        save();
      }, key === 'text');
      content.append(control);
    }
    const done = el('button', 'Concluir edição');
    done.onclick = renderLore;
    const remove = el('button', 'Excluir capítulo');
    remove.onclick = () => {
      if (!confirm('Excluir este capítulo?')) return;
      state.lore.splice(activeLore, 1);
      activeLore = Math.max(0, activeLore - 1);
      save();
      renderLore();
    };
    content.append(done, remove);
  };
  const controls = el('div', undefined, 'toolbar');
  const previous = el('button', '← Anterior');
  const next = el('button', 'Próximo →');
  previous.disabled = activeLore === 0;
  next.disabled = activeLore === state.lore.length - 1;
  previous.onclick = () => { activeLore--; renderLore(); };
  next.onclick = () => { activeLore++; renderLore(); };
  controls.append(previous, edit, next);
  content.append(subtitle, heading, paragraph, controls);
}
$('#add-lore').onclick = () => {
  state.lore.push({ title: 'Novo capítulo', subtitle: '', text: '' });
  activeLore = state.lore.length - 1;
  save();
  renderLore();
  $('#lore-content button:nth-child(2)').click();
};
$('#reading').onclick = () => {
  const active = document.body.classList.toggle('reading');
  $('#reading').textContent = active ? 'Sair do modo de leitura' : 'Modo de leitura';
  $('#reading').setAttribute('aria-pressed', String(active));
};
renderLore();

function labeledField(label, value, update, multiline = false) {
  const wrapper = el('label', label, 'editor-label');
  const input = el(multiline ? 'textarea' : 'input');
  input.value = value || '';
  input.oninput = () => update(input.value);
  wrapper.append(input);
  return wrapper;
}

function renderRelations() {
  const container = $('#relations');
  container.replaceChildren();
  state.relations.forEach((relation, i) => {
    const card = el('article', undefined, 'card');
    for (const [key, label] of [['title', 'Nome'], ['category', 'Tipo de relação'], ['status', 'Estado'], ['history', 'Histórico'], ['text', 'Descrição e observações']]) {
      card.append(labeledField(label, relation[key], value => { relation[key] = value; save(); }, ['text','history'].includes(key)));
    }
    const remove = el('button', 'Remover relação');
    remove.onclick = () => {
      if (!confirm('Remover esta relação?')) return;
      state.relations.splice(i, 1);
      save();
      renderRelations();
    };
    card.append(remove);
    container.append(card);
  });
}
$('#add-relation').onclick = () => {
  state.relations.push({title: '', category: '', status: '', history: '', text: ''});
  save();
  renderRelations();
  $('#relations article:last-child input')?.focus();
};
renderRelations();

const skillCards = [...$('#abilities').children];
const fightingSkills = new Set(['Armas brancas', 'Luta contra a desonra', 'Experiência oriental']);
const techniqueCards = skillCards.filter(card => fightingSkills.has(card.querySelector('h3').textContent));
skillCards.filter(card => !techniqueCards.includes(card)).forEach(card => $('#skill-archive').append(card));
const proficiencies = $('.lower-grid article:nth-child(2)').cloneNode(true);
proficiencies.querySelectorAll('[data-skill]').forEach(button => {
  button.onclick = () => roll(button.dataset.skill, mod(state.attrs[Number(button.dataset.attr)]) + Number(state.prof));
});
$('#skill-archive').append(proficiencies);
const diceControls = el('form', undefined, 'dice-controls');
const diceType = el('select');
diceType.setAttribute('aria-label', 'Tipo de dado');
for (const sides of [4, 6, 8, 10, 12, 20, 100]) {
  const option = el('option', 'd' + sides);
  option.value = sides;
  diceType.append(option);
}
diceType.value = 20;
const bonus = el('input');
bonus.type = 'number';
bonus.value = 0;
bonus.setAttribute('aria-label', 'Modificador da rolagem');
diceControls.append(diceType, bonus, el('button', 'Rolar'));
$('#roll-detail').after(diceControls);
diceControls.onsubmit = event => {
  event.preventDefault();
  roll('Rolagem livre', Number(bonus.value) || 0, Number(diceType.value));
};
$('#dice').onclick = () => {
  $('#roll-title').textContent = 'MESA DE DADOS';
  $('#roll-total').textContent = '⚄';
  $('#roll-detail').textContent = 'Escolha um dado e ajuste o modificador.';
  $('#roll-dialog').showModal();
};

let selectedItem = -1;
function enhanceItems() {
  const query = $('#item-search').value.trim().toLocaleLowerCase();
  [...$('#items').children].forEach((row, i) => {
    const item = state.items[i];
    const meta = item[2] || {};
    row.hidden = ![item[0], meta.category, meta.notes].join(' ').toLocaleLowerCase().includes(query);
    const label = row.firstElementChild;
    const button = el('button', item[0], 'inventory-name');
    button.onclick = () => { selectedItem = i; renderItemDetail(); };
    label.replaceWith(button);
  });
}
function renderItemDetail() {
  const panel = $('#item-detail');
  const item = state.items[selectedItem];
  panel.hidden = !item;
  panel.replaceChildren();
  if (!item) return;
  const meta = item[2] ||= {};
  panel.append(el('h3', item[0]));
  for (const [key, label] of [['category','Categoria'],['weight','Peso unitário'],['damage','Dano'],['properties','Propriedades'],['description','Descrição'],['notes','Observações']]) {
    panel.append(labeledField(label, meta[key], value => {
      meta[key] = value;
      save();
    }, ['description', 'notes'].includes(key)));
  }
  const equip = el('button', meta.equipped ? 'Desequipar' : 'Equipar');
  equip.onclick = () => { meta.equipped = !meta.equipped; save(); renderItemDetail(); };
  panel.append(equip);
}
const baseRenderItems = renderItems;
renderItems = function () {
  baseRenderItems();
  selectedItem = -1;
  renderItemDetail();
  enhanceItems();
};
$('#item-search').oninput = enhanceItems;
renderItems();

const baseRenderPage = renderPage;
renderPage = function () {
  baseRenderPage();
  const entry = state.pages[page];
  $('#journal-category').value = entry.category || 'Registro';
  $('#journal-date').value = entry.date || '';
  filterJournal();
};
function filterJournal() {
  const term = $('#journal-search').value.trim().toLocaleLowerCase();
  [...$('#page-index').children].forEach((button, i) => {
    const entry = state.pages[i];
    button.hidden = ![entry.title, entry.text, entry.category, entry.date].join(' ').toLocaleLowerCase().includes(term);
  });
}
$('#journal-search').oninput = filterJournal;
for (const [id, key] of [['journal-category','category'],['journal-date','date']]) {
  $('#' + id).onchange = event => { state.pages[page][key] = event.target.value; save(); filterJournal(); };
}
renderPage();

const journalPreview = el('div');
journalPreview.id = 'journal-preview';
journalPreview.hidden = true;
$('#page-text').after(journalPreview);
const previewButton = el('button', 'Visualizar texto');
$('.journal-meta').after(previewButton);
function displayJournalText() {
  journalPreview.replaceChildren();
  for (const paragraph of state.pages[page].text.split(/\n\s*\n/)) {
    const lines = paragraph.split('\n');
    if (lines.every(line => /^[-*] /.test(line))) {
      const list = el('ul');
      lines.forEach(line => list.append(el('li', line.slice(2))));
      journalPreview.append(list);
    } else if (paragraph.startsWith('# ')) {
      journalPreview.append(el('h3', paragraph.slice(2)));
    } else {
      journalPreview.append(el('p', paragraph));
    }
  }
}
previewButton.onclick = () => {
  const show = journalPreview.hidden;
  if (show) displayJournalText();
  journalPreview.hidden = !show;
  $('#page-text').hidden = show;
  previewButton.textContent = show ? 'Editar texto' : 'Visualizar texto';
};
const journalRender = renderPage;
renderPage = function () {
  journalRender();
  if (!journalPreview.hidden) displayJournalText();
};
const help = el('small', 'Use # para títulos, linhas em branco para parágrafos e - para listas.');
$('.journal-meta').after(help);

const techniquesRoot = $('#custom-abilities');
function renderTechniqueDetails() {
  [...techniquesRoot.children].forEach((card, index) => {
    const entry = state.customAbilities[index];
    if (!entry || card.querySelector('.technique-brief')) return;
    const details = el('div', undefined, 'technique-brief');
    for (const [key, label] of [['requirements','Requisitos'], ['cost','Custo'], ['range','Alcance'], ['damage','Dano'], ['status','Disponibilidade']]) {
      details.append(labeledField(label, entry[key], value => { entry[key] = value; save(); }));
    }
    card.append(details);
  });
}
new MutationObserver(renderTechniqueDetails).observe(techniquesRoot,{childList:true});
renderTechniqueDetails();

const healthForm = el('form', undefined, 'session-health');
const healthAmount = el('input');
healthAmount.type = 'number';
healthAmount.min = '1';
healthAmount.step = '1';
healthAmount.value = '1';
healthAmount.required = true;
healthAmount.setAttribute('aria-label', 'Quantidade de dano ou cura');
const damageButton = el('button', 'Dano');
const healButton = el('button', 'Cura');
damageButton.value = '-1';
healButton.value = '1';
healthForm.append(healthAmount, damageButton, healButton);
$('.health-actions').replaceWith(healthForm);
const healthStatus = el('p', '', 'session-status');
healthStatus.setAttribute('role', 'status');
healthForm.after(healthStatus);
healthForm.onsubmit = event => {
  event.preventDefault();
  const previous = state.hp;
  state.hp += Number(healthAmount.value) * Number(event.submitter?.value || -1);
  summary();
  save();
  const change = state.hp - previous;
  healthStatus.textContent = change ? signed(change) + ' PV' : 'PV já no limite.';
};
const quickRolls = el('div', undefined, 'quick-rolls');
quickRolls.append(el('span', 'ATALHOS DE MESA'));
for (const [label, action] of [
  ['d20 livre', () => roll('Rolagem livre', 0)],
  ['Iniciativa', () => roll('Iniciativa', mod(state.attrs[1]) + 5)],
  ['Percepção', () => $('.chips [data-skill="Percepção"]').click()]
]) {
  const button = el('button', label);
  button.onclick = action;
  quickRolls.append(button);
}
$('.top-grid').after(quickRolls);

document.addEventListener('click', event => {
  const menu = $('.topic-menu[open]');
  if (menu && !menu.contains(event.target)) menu.open = false;
});
