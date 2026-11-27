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

  async function encode(json) {
    const bytes = new TextEncoder().encode(json);
    return canZip ? 'z.' + toB64(await pipe(bytes, new CompressionStream('deflate-raw'))) : 'j.' + toB64(bytes);
  }
  async function decode(payload) {
    const [kind, body] = [payload.slice(0, 2), payload.slice(2)];
    if (kind === 'z.') {
      if (!canZip) throw Error('Este navegador não consegue abrir links comprimidos. Atualize-o ou use o JSON.');
      return new TextDecoder().decode(await pipe(fromB64(body), new DecompressionStream('deflate-raw')));
    }
    if (kind === 'j.') return new TextDecoder().decode(fromB64(body));
    throw Error('Link de ficha em formato desconhecido.');
  }

  const base = () => location.origin + location.pathname;
  async function buildLink() {
    const backup = { format: 'ronin-ficha', version: 2, savedAt: new Date().toISOString(), data: state };
    let link = base() + PREFIX + await encode(JSON.stringify(backup));
    let noImages = false;
    if (link.length > MAX_WITH_IMAGES && JSON.stringify(state).includes('data:image')) {
      const slim = JSON.stringify(backup, (k, v) => (typeof v === 'string' && v.startsWith('data:image') ? '' : v));
      link = base() + PREFIX + await encode(slim);
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
      const raw = JSON.parse(await decode(payload));
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
