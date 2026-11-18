/* Sumi-e em SVG: ensō atrás do nome, hanko nos títulos, fissuras de magma quando o selo
   da Shodhoruan abre, sangue escorrendo da Ame no Habakiri desembainhada e a corda
   shimenawa com shide pendurada. Os SVGs são desenhados uma vez; o que se move usa só
   transform/opacidade (barato para a GPU). */
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const effectsOff = () => document.body.classList.contains('effects-off') || reduced.matches;
  function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }
  const f = n => Math.round(n * 10) / 10;

  /* ---------- Ensō: círculo zen de pincel, desenhado ao abrir ---------- */
  (() => {
    const identity = document.querySelector('.identity');
    if (!identity) return;
    const cx = 130, cy = 130, r = 100;
    const arc = (rad, a0, a1) => {
      const p = a => [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad];
      const [x0, y0] = p(a0), [x1, y1] = p(a1);
      return `M${f(x0)} ${f(y0)} A${rad} ${rad} 0 1 1 ${f(x1)} ${f(y1)}`;
    };
    const a0 = Math.PI * 0.62, a1 = Math.PI * 0.42 + Math.PI * 2 - 0.0001;
    const len = Math.round(r * (a1 - a0));
    const wrap = document.createElement('div');
    wrap.className = 'enso';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.innerHTML = `<svg viewBox="0 0 260 260">
      <path class="stroke" d="${arc(r, a0, a1)}" stroke-width="15" style="--len:${len}"/>
      <path class="dry" d="${arc(r + 6, a0 + 0.25, a1 - 0.3)}" stroke-width="2.2" style="--len:${len}"/>
      <path class="dry" d="${arc(r - 7, a0 + 0.1, a1 - 0.6)}" stroke-width="1.4" style="--len:${len}"/>
      <circle cx="${f(cx + Math.cos(a1) * r + 14)}" cy="${f(cy + Math.sin(a1) * r - 4)}" r="2.6"/>
      <circle cx="${f(cx + Math.cos(a1) * r + 22)}" cy="${f(cy + Math.sin(a1) * r + 3)}" r="1.4"/></svg>`;
    identity.prepend(wrap);
    /* desenha quando a visão geral aparece */
    /* espera um pouco para o navegador pintar o estado inicial e então anima o traço */
    setTimeout(() => wrap.classList.add('drawn'), 350);
  })();

  /* ---------- Hanko: carimbo vermelho com o kanji da seção ---------- */
  (() => {
    const title = document.querySelector('.section-title');
    const chapter = document.getElementById('chapter');
    if (!title || !chapter) return;
    const stamp = document.createElement('div');
    stamp.className = 'hanko';
    stamp.setAttribute('aria-hidden', 'true');
    title.append(stamp);
    let last = '';
    function update() {
      const kanji = (chapter.textContent.match(/[぀-ヿ一-鿿]+/) || [''])[0].slice(0, 2);
      if (kanji === last) return;
      last = kanji;
      if (!kanji) { stamp.hidden = true; return; }
      stamp.hidden = false;
      const r = rng(kanji.charCodeAt(0) * 31 + (kanji.charCodeAt(1) || 7));
      /* borda irregular de carimbo: quadrado com cantos e lados tremidos, falhas de tinta */
      const j = () => f((r() - 0.5) * 5);
      const d = `M${6 + j()} ${8 + j()} Q50 ${3 + j()} ${94 + j()} ${7 + j()} Q${97 + j()} 50 ${93 + j()} ${94 + j()} Q50 ${97 + j()} ${7 + j()} ${93 + j()} Q${3 + j()} 50 ${6 + j()} ${8 + j()} Z`;
      let gaps = '';
      for (let i = 0; i < 9; i++) gaps += `<circle cx="${f(8 + r() * 84)}" cy="${f(8 + r() * 84)}" r="${f(0.6 + r() * 1.6)}" fill="#0a0909" opacity="${f(0.4 + r() * 0.5)}"/>`;
      const size = kanji.length > 1 ? 34 : 54;
      const text = kanji.length > 1
        ? `<text x="50" y="34" font-size="${size}" text-anchor="middle" dominant-baseline="central">${kanji[0]}</text><text x="50" y="70" font-size="${size}" text-anchor="middle" dominant-baseline="central">${kanji[1]}</text>`
        : `<text x="50" y="52" font-size="${size}" text-anchor="middle" dominant-baseline="central">${kanji}</text>`;
      stamp.innerHTML = `<svg viewBox="0 0 100 100"><path class="ink" d="${d}"/><path d="${d}" fill="none" stroke="#f5eee1" stroke-opacity=".35" stroke-width="2.5" transform="translate(50 50) scale(.84) translate(-50 -50)"/>${text}${gaps}</svg>`;
      stamp.classList.remove('stamp');
      void stamp.offsetWidth;
      if (!reduced.matches) stamp.classList.add('stamp');
    }
    new MutationObserver(update).observe(chapter, { childList: true, characterData: true, subtree: true });
    update();
  })();

  /* ---------- Fissuras de magma nas bordas (selo aberto) ---------- */
  (() => {
    const layer = document.createElement('div');
    layer.className = 'magma';
    layer.setAttribute('aria-hidden', 'true');
    document.body.append(layer);
    function crack(r, x, y, ang, len, depth, out) {
      let d = `M${f(x)} ${f(y)}`;
      const steps = 5 + Math.floor(r() * 4), seg = len / steps;
      for (let i = 0; i < steps; i++) {
        ang += (r() - 0.5) * 0.9;
        x += Math.cos(ang) * seg; y += Math.sin(ang) * seg;
        d += ` L${f(x)} ${f(y)}`;
        if (depth > 0 && r() < 0.28) crack(r, x, y, ang + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.6), len * 0.45, depth - 1, out);
      }
      out.push([d, depth]);
    }
    function draw() {
      const w = innerWidth, h = innerHeight, r = rng(666 + Math.round(w / 80));
      const paths = [];
      const n = Math.max(6, Math.round((w + h) / 180));
      for (let i = 0; i < n; i++) {
        const side = i % 4, t = r();
        const [x, y, ang] = side === 0 ? [t * w, 0, Math.PI / 2] : side === 1 ? [w, t * h, Math.PI] : side === 2 ? [t * w, h, -Math.PI / 2] : [0, t * h, 0];
        crack(r, x, y, ang + (r() - 0.5) * 0.8, Math.min(w, h) * (0.07 + r() * 0.1), 2, paths);
      }
      const body = paths.map(([d, depth]) => `<path class="crack" d="${d}" stroke-width="${f(1.2 + depth * 1.3)}"/>`).join('');
      const core = paths.map(([d, depth]) => `<path class="core" d="${d}" stroke-width="${f(0.4 + depth * 0.4)}"/>`).join('');
      layer.innerHTML = `<div class="glow"><svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${body}</svg></div>
        <div class="pulse"><svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${core}</svg></div>`;
    }
    let t;
    addEventListener('resize', () => { clearTimeout(t); t = setTimeout(draw, 200); });
    draw();
  })();

  /* ---------- Sangue da Ame no Habakiri desembainhada ---------- */
  (() => {
    const root = document.getElementById('cursed-weapons');
    if (!root) return;
    function blood(card) {
      const r = rng(1312);
      const w = 600;
      let runs = '';
      /* faixa no topo + filetes de comprimentos diferentes, cada um com gota na ponta */
      runs += `<path class="run" style="--t:.6s;--d:0s" d="M0 0 H${w} V5 Q${w * 0.75} 9 ${w / 2} 6 Q${w * 0.25} 3 0 7 Z"/>`;
      for (let i = 0; i < 9; i++) {
        const x = 30 + r() * (w - 60), len = 20 + r() * 80, wd = 2.5 + r() * 3.5;
        runs += `<path class="run" style="--t:${f(1.2 + r() * 1.8)}s;--d:${f(0.3 + r() * 1.2)}s" d="M${f(x - wd)} 4 C${f(x - wd)} ${f(len * 0.6)} ${f(x - wd * 0.6)} ${f(len)} ${f(x)} ${f(len + wd)} C${f(x + wd * 0.6)} ${f(len)} ${f(x + wd)} ${f(len * 0.6)} ${f(x + wd)} 4 Z"/>`;
        runs += `<ellipse class="shine" cx="${f(x - wd * 0.3)}" cy="${f(len * 0.7)}" rx=".8" ry="${f(len * 0.2)}"/>`;
      }
      const el = document.createElement('div');
      el.className = 'hk-blood';
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML = `<svg viewBox="0 0 ${w} 120" preserveAspectRatio="none">${runs}</svg>`;
      for (let i = 0; i < 4; i++) {
        const d = document.createElement('i');
        d.className = 'hk-drop';
        d.style.cssText = `--x:${f(8 + r() * 84)}%;--y:${f(40 + r() * 50)}px;--t:${f(2.2 + r() * 1.6)}s;--d:${f(1.5 + r() * 3)}s`;
        el.append(d);
      }
      card.append(el);
    }
    function sync() {
      root.querySelectorAll('.hk-card').forEach(card => {
        const has = card.querySelector(':scope > .hk-blood');
        const drawn = card.classList.contains('hk-drawn');
        if (drawn && !has) blood(card);
        if (!drawn && has) has.remove();
      });
    }
    new MutationObserver(sync).observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
    sync();
  })();

  /* ---------- Corda shimenawa com shide (papéis em zigue-zague) ---------- */
  (() => {
    /* papel shide: tira de 8px dobrada em degraus (zigue-zague) */
    const shideStrip = (x, flip) => {
      const s = flip ? -1 : 1, offs = [0, 6, 0, 6], step = 13;
      const right = [], left = [];
      offs.forEach((o, k) => {
        const L = x + o * s, y0 = k * step, y1 = y0 + step;
        right.push(`${L + 8} ${y0}`, `${L + 8} ${y1}`);
        left.unshift(`${L} ${y1}`, `${L} ${y0}`);
      });
      return `<polygon points="${[...right, ...left].join(' ')}" fill="#f5eee1" stroke="#c9bb9f" stroke-width=".6"/>`;
    };
    let rope = '';
    for (let i = 0; i < 9; i++) rope += `<ellipse cx="${12 + i * 9}" cy="${30 + Math.sin(i / 8 * Math.PI) * 6}" rx="7" ry="5.5" fill="url(#rope)" stroke="#5a3f22" stroke-width=".8" transform="rotate(-28 ${12 + i * 9} ${30 + Math.sin(i / 8 * Math.PI) * 6})"/>`;
    const svg = `<svg viewBox="0 0 96 150" aria-hidden="true" focusable="false">
      <defs><linearGradient id="rope" x1="0" x2="1"><stop offset="0" stop-color="#8c6a3c"/><stop offset=".5" stop-color="#e9d3a2"/><stop offset="1" stop-color="#7a5a30"/></linearGradient></defs>
      <path d="M48 0 L48 22" stroke="#b48a52" stroke-width="3"/>
      <g class="shide-swing" style="transform-origin:48px 0">
        ${rope}
        <circle cx="48" cy="34" r="6.5" fill="#e8432c" stroke="#8f1f14" stroke-width="1.2"/>
        <g class="shide-paper" style="transform-origin:48px 40px">
          <g transform="translate(0 40)">${shideStrip(22, false)}${shideStrip(66, true)}</g>
          <path d="M45 40 L45 92 M48 40 L48 98 M51 40 L51 90" stroke="#e8432c" stroke-width="1.6" stroke-linecap="round"/>
        </g>
      </g></svg>`;
    const el = document.createElement('div');
    el.className = 'shide';
    el.innerHTML = svg + '<button class="shide-hit" type="button" aria-label="Balançar a corda shimenawa" title="Balançar"></button>';
    /* PC: pendurada na ponta da vara do estandarte. Telas estreitas (estandarte vira faixa):
       vai para o corpo da página, senão ficaria presa atrás dos cartões. */
    const banner = document.querySelector('.crest-banner');
    const narrow = matchMedia('(max-width: 980px)');
    const masthead = document.querySelector('.masthead');
    const place = () => {
      const target = banner && !narrow.matches ? banner : document.body;
      if (el.parentElement !== target) target.append(el);
      /* no celular: logo abaixo do cabeçalho, que muda de altura */
      el.style.top = narrow.matches && masthead ? Math.round(masthead.getBoundingClientRect().height) - 4 + 'px' : '';
    };
    place();
    narrow.addEventListener('change', place);
    addEventListener('resize', place);
    const swing = el.querySelector('.shide-swing'), paper = el.querySelector('.shide-paper'), hit = el.querySelector('.shide-hit');
    let a1 = 0, v1 = 0, a2 = 0, v2 = 0, t = 0, last = performance.now(), running = false;
    const kick = force => { v1 += force; v2 -= force * 1.1; start(); };
    function step(now) {
      const dt = Math.min(0.033, (now - last) / 1000); last = now; t += dt;
      const calm = effectsOff();
      const wind = calm ? 0 : Math.sin(t * 0.8) * 0.12 + Math.sin(t * 2.1) * 0.05;
      const acc1 = -12 * a1 - 1.5 * v1 + wind;
      const acc2 = -22 * a2 - 2.2 * v2 - acc1 * 0.5 + (calm ? 0 : Math.sin(t * 5.3) * 0.25);
      v1 += acc1 * dt; a1 += v1 * dt; v2 += acc2 * dt; a2 += v2 * dt;
      a1 = Math.max(-0.7, Math.min(0.7, a1)); a2 = Math.max(-0.8, Math.min(0.8, a2));
      swing.style.transform = `rotate(${a1}rad)`;
      paper.style.transform = `rotate(${a2}rad)`;
      if (document.hidden || (calm && Math.abs(a1) + Math.abs(v1) + Math.abs(a2) + Math.abs(v2) < 0.002)) { running = false; return; }
      requestAnimationFrame(step);
    }
    function start() { if (running || reduced.matches) return; running = true; last = performance.now(); requestAnimationFrame(step); }
    let lastY = scrollY;
    addEventListener('scroll', () => { const dy = scrollY - lastY; lastY = scrollY; kick(Math.max(-1, Math.min(1, dy * 0.01))); }, { passive: true });
    hit.addEventListener('click', () => kick((Math.random() < 0.5 ? -1 : 1) * 1.5));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
    new MutationObserver(start).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    setTimeout(() => kick(0.8), 500);
    start();
  })();
})();
