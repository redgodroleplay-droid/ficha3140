/* Easter eggs da ficha. Nada aqui altera os dados do personagem.
   Achados ficam em localStorage ('ronin-eggs') só para mostrar o contador. */
(() => {
  const EGGS = {
    nat20: 'Corte perfeito',
    nat1: 'Hoje perdi novamente',
    logo: 'Pai, eu consegui',
    vorpal: 'Passos de Vorpal',
    konami: 'Passo do Vendaval',
    sozinho: 'Sozinho, senhor',
    madrugada: 'Madrugada'
  };
  const KEY = 'ronin-eggs';
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const found = (() => { try { return new Set(JSON.parse(localStorage.getItem(KEY)) || []); } catch { return new Set(); } })();

  function mark(id) {
    const isNew = !found.has(id);
    found.add(id);
    try { localStorage.setItem(KEY, JSON.stringify([...found])); } catch {}
    return isNew;
  }

  /* ---------- aviso flutuante ---------- */
  let toastTimer;
  function toast(id, lines, ms = 5200) {
    const isNew = mark(id);
    document.querySelector('.egg-toast')?.remove();
    clearTimeout(toastTimer);
    const box = el('div', undefined, 'egg-toast');
    box.setAttribute('role', 'status');
    const head = el('p', '隠 · ' + EGGS[id] + (isNew ? ' — novo' : ''), 'egg-toast-head');
    box.append(head);
    lines.forEach((line, k) => {
      const p = el('p', line, 'egg-line');
      if (!calm) p.style.animationDelay = (0.35 + k * 1.1) + 's';
      box.append(p);
    });
    box.append(el('p', found.size + ' / ' + Object.keys(EGGS).length + ' segredos encontrados', 'egg-count'));
    box.onclick = () => box.remove();
    document.body.append(box);
    toastTimer = setTimeout(() => box.classList.add('egg-out'), ms + lines.length * 900);
    box.addEventListener('animationend', e => { if (e.animationName === 'egg-out') box.remove(); });
  }

  /* corte vermelho atravessando a tela */
  function slash(angle = -12) {
    if (calm) return;
    const s = el('div', undefined, 'egg-slash');
    s.style.setProperty('--angle', angle + 'deg');
    document.body.append(s);
    s.addEventListener('animationend', () => s.remove());
  }

  /* ---------- 1 e 2. d20 natural 20 ou 1 ---------- */
  const detail = document.getElementById('roll-detail');
  const dialog = document.getElementById('roll-dialog');
  if (detail && dialog) {
    const note = el('p', '', 'egg-roll-note');
    detail.after(note);
    new MutationObserver(() => {
      const text = detail.textContent;
      const m = text.match(/^d20: (\d+)\s/) || text.match(/^1d20 \[(\d+)\]/);
      note.className = 'egg-roll-note';
      note.textContent = '';
      dialog.classList.remove('egg-crit', 'egg-fumble');
      if (!m) return;
      if (m[1] === '20') {
        note.textContent = '会心 — o inimigo só percebe depois.';
        note.classList.add('crit');
        void dialog.offsetWidth;
        dialog.classList.add('egg-crit');
        if (!found.has('nat20')) toast('nat20', ['Vinte natural.', 'Um corte que nenhum caderno ensinou.']);
      } else if (m[1] === '1') {
        note.textContent = '“Hoje perdi novamente.”';
        note.classList.add('fumble');
        void dialog.offsetWidth;
        dialog.classList.add('egg-fumble');
        if (!found.has('nat1')) toast('nat1', ['“Não sei quantas vezes ainda consigo suportar isso.”', '“Mas amanhã ainda preciso acordar.”']);
      }
    }).observe(detail, { childList: true, characterData: true, subtree: true });
  }

  /* ---------- 3. logo 剣 clicado 7 vezes (a idade da noite em que tudo mudou) ---------- */
  const logo = document.querySelector('.masthead .mark b');
  if (logo) {
    let clicks = [];
    logo.addEventListener('click', () => {
      const now = Date.now();
      clicks = clicks.filter(t => now - t < 3500);
      clicks.push(now);
      logo.classList.remove('egg-wobble'); void logo.offsetWidth; logo.classList.add('egg-wobble');
      if (clicks.length >= 7) {
        clicks = [];
        logo.classList.add('egg-crack');
        setTimeout(() => logo.classList.remove('egg-crack'), 2600);
        toast('logo', ['— Pai, eu consegui.', '— Guarde isso.', 'A espada de madeira já estava rachada perto do cabo.']);
      }
    });
  }

  /* ---------- palavras digitadas fora dos campos ---------- */
  const typing = t => t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  let buffer = '';
  const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
  let konami = 0;
  document.addEventListener('keydown', e => {
    if (typing(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();

    konami = k === KONAMI[konami] ? konami + 1 : (k === KONAMI[0] ? 1 : 0);
    if (konami === KONAMI.length) { konami = 0; vendaval(); }

    if (k.length !== 1) return;
    buffer = (buffer + k).slice(-12);
    if (buffer.endsWith('vorpal')) { buffer = ''; vorpal(); }
    if (buffer.endsWith('sozinho')) { buffer = ''; sozinho(); }
  });

  /* ---------- 4. "vorpal": o familiar atravessa a tela ---------- */
  function vorpal() {
    const fam = (state.familiars || []).find(f => /vorpal/i.test(f.name || ''));
    const name = fam?.name || 'Vorpal';
    if (!calm) {
      const runner = el('div', undefined, 'egg-vorpal');
      runner.innerHTML = '<div class="egg-hop"><svg viewBox="0 0 64 48" width="72" height="54" aria-hidden="true">' +
        '<g fill="#cfd6d8" stroke="#0a0909" stroke-width="1.2">' +
        '<path d="M30 14 L22 1 L33 11 Z"/><path d="M36 13 L38 0 L41 12 Z"/><path d="M27 15 L14 6 L28 12 Z"/><path d="M40 14 L52 4 L43 15 Z"/></g>' +
        '<ellipse cx="26" cy="33" rx="17" ry="12" fill="#f5eee1"/><circle cx="40" cy="22" r="9" fill="#f5eee1"/>' +
        '<circle cx="9" cy="31" r="4" fill="#f5eee1"/><circle cx="43" cy="21" r="1.8" fill="#e8432c"/>' +
        '<ellipse cx="34" cy="44" rx="6" ry="2.5" fill="#f5eee1"/><ellipse cx="18" cy="44" rx="7" ry="2.5" fill="#f5eee1"/></svg></div>';
      document.body.append(runner);
      runner.addEventListener('animationend', e => { if (e.animationName === 'egg-run') runner.remove(); });
    }
    toast('vorpal', [name + ' passou por aqui.', 'As lâminas dos chifres tilintaram, e ninguém viu para onde ele foi.']);
  }

  /* ---------- 5. código Konami: Passo do Vendaval ---------- */
  function vendaval() {
    slash(-8);
    setTimeout(() => slash(14), 260);
    if (!calm) {
      document.body.classList.remove('egg-shake'); void document.body.offsetWidth;
      document.body.classList.add('egg-shake');
      setTimeout(() => document.body.classList.remove('egg-shake'), 700);
    }
    toast('konami', ['Passo do Vendaval.', '“O inimigo não vê a espada sendo desembainhada. Apenas percebe que você já está atrás dele.”']);
  }

  /* ---------- 6. "sozinho" ---------- */
  function sozinho() {
    toast('sozinho', ['— Onde aprendeu essas técnicas?', '— Sozinho, senhor.', 'Não era inteiramente verdade. Mas parecia ser.']);
  }

  /* ---------- 7. madrugada (0h às 4h), uma vez por sessão ---------- */
  const hour = new Date().getHours();
  let seen = false;
  try { seen = sessionStorage.getItem('ronin-egg-night') === '1'; sessionStorage.setItem('ronin-egg-night', '1'); } catch {}
  if (hour < 4 && !seen) {
    setTimeout(() => toast('madrugada', ['Madrugada.', 'As luzes da cidade continuam acesas, e você também.', 'Ninguém vai conferir se você dormiu. Durma mesmo assim.']), 6000);
  }

  /* ---------- console ---------- */
  console.log('%c剣%c  Você abriu o console.\nUm rōnin também lê os cadernos dos outros.\nDica: há ' + Object.keys(EGGS).length + ' segredos nesta ficha. Um deles começa com ↑ ↑ ↓ ↓.',
    'font:700 28px serif;color:#e8432c', 'font:14px serif;color:#d8b36a');
})();
