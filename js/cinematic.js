const intro = $('#intro');
const audio = $('#ambient');
const preferencesKey = 'lucy-presentation-v1';
let presentation = {};
try {
  presentation = JSON.parse(localStorage.getItem(preferencesKey)) || {};
} catch {}
function savePresentation() {
  try { localStorage.setItem(preferencesKey, JSON.stringify(presentation)); } catch {}
}
audio.volume = typeof presentation.volume === 'number' ? Math.min(1, Math.max(0, presentation.volume)) : 0.4;
audio.muted = Boolean(presentation.muted);
$('#music-volume').value = audio.volume;
$('#intro-auto').checked = presentation.auto !== false;
$('#effects').checked = presentation.effects !== false;
function updateAudio() {
  $('#music-play').textContent = audio.paused ? 'Tocar trilha' : 'Pausar trilha';
  $('#intro-audio').textContent = audio.paused ? 'Ativar áudio' : 'Pausar áudio';
  $('#music-mute').setAttribute('aria-pressed', String(audio.muted));
  $('#music-mute').textContent = audio.muted ? 'Reativar som' : 'Silenciar';
}
async function toggleAudio() {
  if (!audio.paused) {
    audio.pause();
    return;
  }
  try { await audio.play(); } catch { $('#saved').textContent = 'Não foi possível reproduzir a trilha.'; }
}
for (const event of ['play', 'pause', 'volumechange']) audio.addEventListener(event, updateAudio);
$('#music-play').onclick = $('#intro-audio').onclick = toggleAudio;
$('#music-mute').onclick = () => { audio.muted = !audio.muted; presentation.muted = audio.muted; savePresentation(); };
$('#music-volume').oninput = event => { audio.volume = Number(event.target.value); presentation.volume = audio.volume; savePresentation(); };
let localTrack;
$('#music-file').onchange = event => {
  const file = event.target.files[0];
  if (!file) return;
  const playing = !audio.paused;
  if (localTrack) URL.revokeObjectURL(localTrack);
  localTrack = URL.createObjectURL(file);
  audio.src = localTrack;
  if (playing) toggleAudio();
};
$('#intro-auto').onchange = event => { presentation.auto = event.target.checked; savePresentation(); };
$('#effects').onchange = event => {
  presentation.effects = event.target.checked;
  intro.classList.toggle('effects-off', !presentation.effects);
  savePresentation();
};
intro.classList.toggle('effects-off', presentation.effects === false);
for (let i = 0; i < 42; i++) {
  const drop = el('i', undefined, i % 7 === 0 ? 'petal' : 'rain');
  drop.style.setProperty('--x', Math.random() * 100 + '%');
  drop.style.setProperty('--delay', -Math.random() * 8 + 's');
  drop.style.setProperty('--time', (i % 7 === 0 ? 7 + Math.random() * 5 : .7 + Math.random() * 1.1) + 's');
  $('.weather').append(drop);
}
function showIntro() {
  if (settings.open) settings.close();
  $('#intro-title').textContent = state.name || 'Lucifer Adritch';
  intro.classList.remove("gate-opening");
  intro.showModal();
  $('#intro-start').focus();
}

function openSheet() {
  clearTimeout(gateTimer);
  presentation.seen = true;
  savePresentation();
  intro.close();
  openTab('ficha');
  document.querySelector('nav [data-tab="ficha"]').focus({preventScroll:true});
}

let gateTimer;
$('#intro-start').onclick = () => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return openSheet();
  if (intro.classList.contains('gate-opening')) return;
  intro.classList.add('gate-opening');
  gateTimer = setTimeout(openSheet, 640);
};
intro.addEventListener('cancel', event => {
  event.preventDefault();
  openSheet();
});
$('#intro-replay').onclick = showIntro;

updateAudio();
if (presentation.auto !== false && !presentation.seen) showIntro();

const banner = $('.crest-banner');
const bannerWind = el('div', undefined, 'banner-wind');
bannerWind.setAttribute('aria-hidden', 'true');
for (let index = 0; index < 7; index++) {
  const petal = el('i');
  petal.style.setProperty('--height', (14 + index * 12) + '%');
  petal.style.setProperty('--duration', (8 + index * 0.8) + 's');
  petal.style.setProperty('--delay', (-index * 2.3) + 's');
  bannerWind.append(petal);
}
banner.append(bannerWind);
const effectsControl = $('#effects');
function syncBannerWind() {
  document.body.classList.toggle('effects-off', !effectsControl.checked);
}
effectsControl.addEventListener('change', syncBannerWind);
syncBannerWind();
