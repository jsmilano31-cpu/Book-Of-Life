import { sceneLabels } from '../models/experience.js';

export const $ = (selector) => document.querySelector(selector);
export const $$ = (selector) => [...document.querySelectorAll(selector)];

export function announce(text) {
  $('#announcement').textContent = text;
}

export function renderMode(mode) {
  document.body.dataset.mode = mode;
  const sections = {
    intro: '#intro-runway',
    book: '#book-section',
    finale: '#finale-section',
    credits: '#credits-section',
  };
  for (const [section, selector] of Object.entries(sections)) {
    const element = $(selector);
    element.hidden = section !== mode;
    element.inert = section !== mode;
  }
}

export function syncVideo({ mode, reduced, atmospherePaused }) {
  const video = $('#atmosphere-video');
  if (mode === 'intro' && !reduced && !atmospherePaused)
    video.play().catch(() => {});
  else video.pause();
}

export function renderScene(index) {
  $$('.cinematic-scene').forEach((scene, position) => {
    const active = position === index;
    scene.setAttribute('aria-hidden', String(!active));
    scene.inert = !active;
  });
  $$('.journey-markers button').forEach((button, position) => {
    const active = position === index;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  });
  $('#scroll-label').textContent = sceneLabels[index];
  const lastScene = index === sceneLabels.length - 1;
  $('#scroll-next').style.visibility = lastScene ? 'hidden' : 'visible';
  $('#skip-story').textContent = lastScene
    ? 'Open the book ?'
    : 'Enter the book ?';
}

export function renderProgress(progress) {
  $('.intro-progress span').style.width = progress * 100 + '%';
}

export function renderDiscovery({ title, text }) {
  $('#detail-title').textContent = title;
  const paragraph = document.createElement('p');
  paragraph.textContent = text;
  $('#detail-body').replaceChildren(paragraph);
  $('#detail-dialog').showModal();
}

export function renderBridge(lit) {
  $('#light-bridge').setAttribute('aria-pressed', String(lit));
  $('#bridge-interaction').classList.toggle('active', lit);
  $('#bridge-status').textContent = lit
    ? 'The golden path is lit.'
    : 'The path returns to rest.';
}

export function renderCandles(litCandles) {
  for (const candle of $$('[data-candle]')) {
    const lit = litCandles.has(candle.dataset.candle);
    candle.setAttribute('aria-pressed', String(lit));
    candle.classList.toggle('lit', lit);
  }
  const count = litCandles.size;
  const content = $('.memory-candles').closest('.page-content');
  content.classList.toggle('warmed', count > 0);
  const messages = [
    'A little light goes a long way.',
    '1 light for a memory held close.',
    '2 lights for a memory held close.',
    'Three lights. A world of memories.',
  ];
  content.querySelector('.candle-count').textContent = messages[count];
}

export function renderSoundPanel(open) {
  $('#sound-panel').hidden = !open;
  $('#sound-toggle').setAttribute('aria-expanded', String(open));
}

export function renderAtmospherePause(paused) {
  document.body.classList.toggle('motion-paused', paused);
  $('#motion-toggle').textContent = paused
    ? 'Resume atmosphere'
    : 'Pause atmosphere';
}

export function renderDrawer(open, reduced) {
  const drawer = $('#chapter-drawer');
  drawer.hidden = !open;
  drawer.inert = !open;
  $('#drawer-backdrop').hidden = !open;
  $('#chapters-toggle').setAttribute('aria-expanded', String(open));
  $('main').inert = open;
  $('.site-header').inert = open;
  if (!open) return;
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-modal', 'true');
  if (window.gsap && !reduced) {
    gsap.fromTo(
      drawer,
      { xPercent: 100 },
      { xPercent: 0, duration: 0.4, ease: 'power2.out' },
    );
  }
  $('#close-drawer').focus();
}

export function renderDecorations() {
  const ns = 'http://www.w3.org/2000/svg';
  const candles = $('#gate-candles');
  [5, 8, 11, 14, 18, 22, 78, 82, 86, 89, 92, 95].forEach((left, i) => {
    const candle = document.createElement('i');
    candle.className = 'gate-candle';
    candle.style.cssText = `left:${left}%;height:${17 + ((i * 13) % 25)}px;bottom:${8 + (i % 3) * 2}%;--delay:-${i * 0.47}s`;
    candles.append(candle);
  });
  $$('.flower-bank').forEach((bank, b) => {
    for (let i = 0; i < 27; i++) {
      const flower = document.createElementNS(ns, 'svg');
      flower.classList.add('bank-flower');
      const size = 25 + ((i * 23) % 48);
      flower.style.cssText = `--size:${size}px;--rotation:${i * 31}deg;--color:${['#bd6e25', '#d18b30', '#9d5526', '#d5983b', '#83502c'][(i + b) % 5]};left:${(i * 17) % 100}%;bottom:${(i * 19) % 76}px`;
      flower.innerHTML = '<use href="#icon-flower"/>';
      bank.append(flower);
    }
  });
}

export function renderChapterMenu(chapters) {
  $('#chapter-list').innerHTML = chapters
    .map(
      (chapter, i) =>
        `<li><button data-chapter-link="${i}"><span class="chapter-index">${String(i + 1).padStart(2, '0')}</span><span class="chapter-name">${chapter.title}</span><span class="chapter-arrow" aria-hidden="true">↗</span></button></li>`,
    )
    .join('');
}

export function renderCredits(values) {
  const root = $('#academic-credits');
  root.replaceChildren();
  const entries = [
    ['CREATED BY', values.team],
    [
      'COURSE & SECTION',
      [values.course, values.section].filter(Boolean).join(' · '),
    ],
    ['INSTRUCTOR', values.instructor],
    ['INSTITUTION', values.institution],
  ];
  for (const [label, value] of entries) {
    if (!value) continue;
    const group = document.createElement('div');
    group.className = 'credit-group';
    const heading = document.createElement('p');
    heading.className = 'eyebrow';
    heading.textContent = label;
    const content = document.createElement('p');
    content.className = 'credit-value';
    content.textContent = value;
    group.append(heading, content);
    root.append(group);
  }
  if (!entries.some(([, value]) => value)) {
    const group = document.createElement('div');
    group.className = 'credit-group';
    group.innerHTML =
      '<p class="eyebrow">AN ACADEMIC MULTIMEDIA PROJECT</p><p>Storytelling through the art of the web.</p>';
    root.append(group);
  }
}
