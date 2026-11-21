/* =========================================================
   Navegação em 4 grupos (人 Personagem · 戦 Combate · 装 Equipamento · 記 Diário).
   Os botões originais (nav [data-tab]) continuam existindo e funcionando:
   este módulo só os move para sub-abas e mostra o grupo ativo.
   Carregar por último, depois de codex.js e sumi.js.
   ========================================================= */
(() => {
  const nav = document.querySelector('nav');
  if (!nav) return;

  const GROUPS = [
    { id: 'pessoa', kanji: '人', label: 'Personagem', tabs: ['ficha', 'historia', 'relacoes', 'titulos', 'besta'] },
    { id: 'combate', kanji: '戦', label: 'Combate', tabs: ['tecnicas', 'habilidades', 'skilltree'] },
    { id: 'equipo', kanji: '装', label: 'Equipamento', tabs: ['inventario', 'arsenal'] },
    { id: 'registro', kanji: '記', label: 'Diário', tabs: ['diario', 'custom-topic'] }
  ];
  const groupOf = tab => GROUPS.find(g => g.tabs.includes(tab)) || GROUPS[0];
  const lastTab = {};

  const bar = document.createElement('div');
  bar.className = 'nav-groups';
  bar.setAttribute('role', 'tablist');
  bar.setAttribute('aria-label', 'Grupos da ficha');

  const subs = {};
  for (const g of GROUPS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.group = g.id;
    b.setAttribute('role', 'tab');
    b.innerHTML = '<i lang="ja" aria-hidden="true">' + g.kanji + '</i><span>' + g.label + '</span>';
    b.addEventListener('click', () => {
      const target = lastTab[g.id] && !nav.querySelector('[data-tab="' + lastTab[g.id] + '"]')?.hidden
        ? lastTab[g.id]
        : visibleTabs(g)[0];
      if (target) openTab(target);
    });
    bar.append(b);

    const sub = document.createElement('div');
    sub.className = 'nav-sub';
    sub.dataset.group = g.id;
    subs[g.id] = sub;
  }

  /* move os botões originais para as sub-abas, na ordem do grupo */
  for (const g of GROUPS) {
    for (const tab of g.tabs) {
      const btn = nav.querySelector(':scope > [data-tab="' + tab + '"]');
      if (btn) subs[g.id].append(btn);
    }
  }
  /* qualquer aba que sobrar (adicionada no futuro) vai para Personagem */
  nav.querySelectorAll(':scope > [data-tab]').forEach(btn => subs.pessoa.append(btn));

  const subRow = document.createElement('div');
  subRow.className = 'nav-subrow';
  subRow.append(...Object.values(subs));
  nav.prepend(bar, subRow);
  nav.classList.add('grouped');

  /* tópicos personalizados (quando há menos de 3) entram no grupo Diário */
  const adoptTopics = () => {
    nav.querySelectorAll(':scope > .custom-nav').forEach(b => subs.registro.append(b));
  };
  new MutationObserver(adoptTopics).observe(nav, { childList: true });
  adoptTopics();

  function visibleTabs(g) {
    return g.tabs.filter(t => {
      const b = nav.querySelector('[data-tab="' + t + '"]');
      return b && !b.hidden;
    });
  }

  /* esconde o grupo inteiro se todas as abas dele foram ocultadas nas configurações */
  function syncHidden() {
    for (const g of GROUPS) {
      const empty = visibleTabs(g).length === 0 && !subs[g.id].querySelector('.custom-nav');
      bar.querySelector('[data-group="' + g.id + '"]').hidden = empty;
    }
  }
  new MutationObserver(syncHidden).observe(nav, { subtree: true, attributes: true, attributeFilter: ['hidden'] });

  function show(id) {
    const g = groupOf(id);
    if (id !== 'besta' && id !== 'custom-topic') lastTab[g.id] = id;
    bar.querySelectorAll('[data-group]').forEach(b => {
      const on = b.dataset.group === g.id;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on);
    });
    for (const [key, sub] of Object.entries(subs)) sub.classList.toggle('open', key === g.id);
    document.body.dataset.group = g.id;
    const current = subs[g.id].querySelector('[aria-current], .active');
    current?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  const previous = openTab;
  openTab = function (id) {
    previous(id);
    show(id);
  };

  syncHidden();
  show(document.body.dataset.chapter || 'ficha');
})();
