/* =========================================================
   Laca e kintsugi: acrescenta a cada .card uma camada decorativa
   (cantoneiras de metal kanagu + fissura dourada de kintsugi).
   Não altera o fundo dos cartões; só põe um <span> por cima,
   sem receber clique. Cartões recriados recebem a camada de novo.
   ========================================================= */
(() => {
  const VARIANTS = 4;
  let seed = 0;
  let queued = false;

  function dress(root) {
    root.querySelectorAll('.card').forEach(card => {
      if (card.querySelector(':scope > .kanagu')) return;
      const layer = document.createElement('span');
      layer.className = 'kanagu';
      layer.setAttribute('aria-hidden', 'true');
      layer.dataset.k = String(seed++ % VARIANTS);
      card.prepend(layer);
    });
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; dress(document); });
  }

  dress(document);
  new MutationObserver(schedule).observe(document.querySelector('main') || document.body, { childList: true, subtree: true });
})();
