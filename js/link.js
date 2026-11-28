/* =========================================================
   Salvamento por link: a ficha inteira vai comprimida dentro do
   próprio link (depois do #, então nada é enviado ao servidor).
   - "Copiar link da ficha" em Configurações gera o link.
   - Abrir um link desses pergunta se deve carregar a ficha e,
     se sim, substitui os dados deste navegador.
   Imagens (data:image) só vão no link se ele continuar curto;
   senão ficam de fora e o retrato atual é mantido ao carregar.
   ========================================================= */
(() => {
  const PREFIX = '#ficha=';
  const MAX_WITH_IMAGES = 60000; // caracteres; acima disso, as imagens saem do link
  const canZip = typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';

  const toB64 = bytes => {
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  const fromB64 = text => {
    const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((text.length + 3) % 4));
    return Uint8Array.from(bin, c => c.charCodeAt(0));
  };
  const pipe = async (bytes, stream) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());

  const zip = async text => toB64(await pipe(new TextEncoder().encode(text), new CompressionStream('deflate-raw')));
  const unzip = async body => {
    if (!canZip) throw Error('Este navegador não consegue abrir links comprimidos. Atualize-o ou use o JSON.');
    return new TextDecoder().decode(await pipe(fromB64(body), new DecompressionStream('deflate-raw')));
  };

  /* ---------- diferença em relação à ficha-base ----------
     O link d1 só leva o que mudou em relação a assets/ficha-base-1.json
     (a ficha como vem de fábrica). Esse arquivo NUNCA deve ser editado:
     links antigos dependem dele. Se um dia precisar de outra base,
     crie ficha-base-2.json e um prefixo d2, mantendo o d1 funcionando. */
  const BASE_URL = 'assets/ficha-base-1.json';
  const DEL = '~';     // chave apagada
  const ARR = '#';     // array do mesmo tamanho, só com os índices que mudaram
  const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function diff(a, b) {
    if (same(a, b)) return undefined;
    if (isObj(a) && isObj(b)) {
      const out = {};
      for (const k of Object.keys(a)) { const d = diff(a[k], b[k]); if (d !== undefined) out[k] = d; }
      for (const k of Object.keys(b)) if (!(k in a)) out[k] = { [DEL]: 1 };
      return out;
    }
    if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) {
      const out = { [ARR]: 1 };
      a.forEach((v, i) => { const d = diff(v, b[i]); if (d !== undefined) out[i] = d; });
      return out;
    }
    return a === undefined ? null : a;
  }
  const isDel = v => isObj(v) && Object.keys(v).length === 1 && v[DEL] === 1;
  function patch(b, d) {
    if (Array.isArray(b) && isObj(d) && d[ARR] === 1) {
      const out = b.slice();
      for (const k of Object.keys(d)) if (k !== ARR) out[Number(k)] = patch(b[Number(k)], d[k]);
      return out;
    }
    if (isObj(b) && isObj(d) && !(ARR in d)) {
      const out = { ...b };
      for (const k of Object.keys(d)) { if (isDel(d[k])) delete out[k]; else out[k] = patch(b[k], d[k]); }
      return out;
    }
    return d;
  }
  let baseCache = null;
  const loadBase = async () => baseCache || (baseCache = fetch(BASE_URL, { cache: 'force-cache' }).then(r => {
    if (!r.ok) throw Error('Não foi possível ler a ficha-base (' + r.status + ').');
    return r.json();
  }).catch(e => { baseCache = null; throw e; }));

  async function encode(data, savedAt) {
    if (!canZip) return 'j.' + toB64(new TextEncoder().encode(JSON.stringify({ format: 'ronin-ficha', version: 2, savedAt, data })));
    try {
      const d = diff(JSON.parse(JSON.stringify(data)), await loadBase()) || {}; // JSON tira os undefined, como no backup
      return 'd1.' + await zip(JSON.stringify({ t: Math.round(Date.parse(savedAt) / 1000).toString(36), d }));
    } catch {
      return 'z.' + await zip(JSON.stringify({ format: 'ronin-ficha', version: 2, savedAt, data }));
    }
  }
  /* devolve o backup no formato do "Importar JSON" */
  async function decode(payload) {
    if (payload.startsWith('d1.')) {
      const { t, d } = JSON.parse(await unzip(payload.slice(3)));
      const savedAt = t ? new Date(parseInt(t, 36) * 1000).toISOString() : undefined;
      return { format: 'ronin-ficha', version: 2, savedAt, data: patch(structuredClone(await loadBase()), d || {}) };
    }
    if (payload.startsWith('z.')) return JSON.parse(await unzip(payload.slice(2)));
    if (payload.startsWith('j.')) return JSON.parse(new TextDecoder().decode(fromB64(payload.slice(2))));
    throw Error('Link de ficha em formato desconhecido.');
  }

  const base = () => location.origin + location.pathname;
  async function buildLink() {
    const savedAt = new Date().toISOString();
    let link = base() + PREFIX + await encode(state, savedAt);
    let noImages = false;
    if (link.length > MAX_WITH_IMAGES && JSON.stringify(state).includes('data:image')) {
      const slim = JSON.parse(JSON.stringify(state, (k, v) => (typeof v === 'string' && v.startsWith('data:image') ? '' : v)));
      link = base() + PREFIX + await encode(slim, savedAt);
      noImages = true;
    }
    return { link, noImages };
  }

  /* ---------- carregar a ficha de um link ---------- */
  async function loadFromHash() {
    if (!location.hash.startsWith(PREFIX)) return;
    const payload = location.hash.slice(PREFIX.length);
    const clearHash = () => history.replaceState(null, '', base() + location.search);
    try {
      const raw = await decode(payload);
      const next = validateBackup(raw);
      if (!next.portrait && state.portrait) next.portrait = state.portrait; // retrato ficou fora do link
      const when = raw.savedAt ? ' (salva em ' + new Date(raw.savedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) + ')' : '';
      if (!confirm('Carregar a ficha de ' + (next.name || 'personagem') + when + ' que veio neste link?\n\nIsso substitui os dados deste navegador. Se quiser guardar a ficha atual, cancele e exporte o JSON antes.')) { clearHash(); return; }
      localStorage.setItem(key, JSON.stringify(next));
      clearHash();
      location.reload();
    } catch (error) {
      clearHash();
      alert('Não foi possível carregar a ficha do link. ' + (error.message || ''));
    }
  }

  /* ---------- botão em Configurações ---------- */
  const toolbar = document.querySelector('#export')?.parentElement;
  if (toolbar) {
    const copy = el('button', '🔗 Copiar link da ficha');
    copy.type = 'button';
    copy.id = 'save-link';
    const box = el('div', undefined, 'save-link-box');
    box.hidden = true;
    const field = el('input');
    field.readOnly = true;
    field.setAttribute('aria-label', 'Link de salvamento da ficha');
    const note = el('small', '', 'save-link-note');
    note.setAttribute('role', 'status');
    box.append(field, note);
    toolbar.append(copy);
    toolbar.after(box);

    copy.onclick = async () => {
      copy.disabled = true;
      try {
        const { link, noImages } = await buildLink();
        field.value = link;
        box.hidden = false;
        let copied = false;
        try { await navigator.clipboard.writeText(link); copied = true; } catch {}
        if (!copied) { field.focus(); field.select(); }
        const kb = (link.length / 1024).toFixed(1).replace('.', ',');
        note.textContent = (copied ? 'Link copiado' : 'Copie o link acima') + ' (' + kb + ' KB). Ele guarda a ficha como está agora; depois de mudar algo, gere outro.' +
          (noImages ? ' As imagens ficaram de fora para o link não ficar enorme; o retrato de quem abrir é mantido.' : '') +
          ' Quem abrir o link pode carregar a ficha, então só envie para quem você confia.';
      } catch (error) {
        note.textContent = 'Não foi possível gerar o link. ' + (error.message || '');
        box.hidden = false;
      } finally {
        copy.disabled = false;
      }
    };
    field.onfocus = () => field.select();
  }

  loadFromHash();
  window.addEventListener('hashchange', loadFromHash);
})();
