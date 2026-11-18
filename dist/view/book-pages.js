import { chapters } from '../model/story.js';

const flower = '<svg aria-hidden="true"><use href="#icon-flower"/></svg>';
const pageNumber = (n) =>
  `<span class="page-number" aria-hidden="true">${n}</span>`;
const hotspot = (key, x, y, label) =>
  `<button class="hotspot" data-discovery="${key}" style="left:${x}%;top:${y}%" aria-label="${label}">+</button>`;

function interactiveContent(index) {
  if (index === 1)
    return `<div class="bridge-interaction" id="bridge-interaction"><svg class="bridge-svg" viewBox="0 0 400 110" role="img" aria-label="A bridge through the remembered city. Activate the flower below to light its route."><g class="bridge-buildings"><path d="M5 90V48h27V29h18v61h25V13h25v77h17V38h20v52h23V63h27v27M282 90V38h25V19h27v71h20V50h17V32h24v58"/></g><path class="bridge-base" d="M10 93C90 93 90 35 200 35S310 93 390 93M10 101C90 101 90 43 200 43S310 101 390 101M38 94V84m35-3V68m36-14V42m38 3V33m53 8V29m53 16V33m38 21V42m36 39V68m35 26V84"/><path class="bridge-path" d="M10 91C90 91 90 33 200 33S310 91 390 91"/></svg><button class="paper-button" id="light-bridge" aria-pressed="false">${flower} Follow the marigolds</button><span class="sr-only" id="bridge-status" aria-live="polite"></span></div>`;
  if (index === 2)
    return `<div class="object-list"><button class="paper-button" data-discovery="lights">The lights ✧</button><button class="paper-button" data-discovery="architecture">The towers ↟</button><button class="paper-button" data-discovery="decorations">The celebration ✦</button></div>`;
  if (index === 3)
    return `<div class="object-list"><button class="paper-button" data-discovery="guitar">A guitar ♬</button><button class="paper-button" data-discovery="family">A family ✧</button><button class="paper-button" data-discovery="courage">A choice ✦</button></div>`;
  if (index === 4)
    return `<div class="memory-candles" role="group" aria-label="Candles of remembrance">${['A person', 'A place', 'A moment'].map((label, i) => `<button class="memory-candle" data-candle="${i}" aria-pressed="false" aria-label="Light a candle for ${label.toLowerCase()}"><span class="wax" aria-hidden="true"></span><span>${label}</span></button>`).join('')}</div><p class="candle-count" aria-live="polite">A little light goes a long way.</p>`;
  if (index === 5)
    return `<div class="object-list guide-objects"><button class="paper-button" data-discovery="marigold">${flower} Marigolds</button><button class="paper-button" data-discovery="candle">✧ Candlelight</button><button class="paper-button" data-discovery="guitar">♬ Music</button><button class="paper-button" data-discovery="memory">✦ Memory</button></div>`;
  if (index === 6)
    return `<div class="final-page-mark" aria-hidden="true">✧</div><button class="gold-button" id="begin-finale">Let the story unfold <svg><use href="#icon-arrow"/></svg></button>`;
  return '';
}

export function createPages() {
  const pages = [];
  pages.push(
    `<div class="page cover-page" data-page="1"><div class="page-cover">${flower}<p>EVERY SOUL HAS A STORY</p><h3>The Book<br><em>of Life</em></h3><p>BEYOND THE PAGES</p></div></div>`,
  );
  chapters.forEach((c, index) => {
    const leftNum = 2 + index * 2;
    const picture = `media/images/${c.image}`;
    let hotspots = '';
    if (index === 0)
      hotspots = hotspot(
        'welcome',
        65,
        31,
        'Discover a welcome in the glowing window',
      );
    if (index === 2)
      hotspots =
        hotspot(
          'architecture',
          30,
          30,
          'Discover the remembered city architecture',
        ) + hotspot('lights', 68, 52, 'Discover the city lights');
    if (index === 3)
      hotspots = hotspot('family', 72, 35, 'Discover the ancestors’ story');
    if (index === 4)
      hotspots = hotspot('family', 60, 35, 'Discover a family connection');
    const art = `<div class="page-art" style="background-image:url('${picture}');background-position:${index === 0 ? 'left center' : c.position || 'center'}"></div>`;
    pages.push(
      `<div class="page art-page ${index === 0 ? 'panorama-page panorama-left' : ''}" data-page="${leftNum}" data-chapter="${index}"><div class="page-inner">${art}<div class="page-art-caption"><p class="eyebrow">CHAPTER ${String(index + 1).padStart(2, '0')} · ${index === 0 ? 'THE ARRIVAL' : c.title.toUpperCase()}</p><h3>${c.artTitle}</h3><p>${c.artText}</p><span class="ornament-divider" aria-hidden="true">─ ✦ ─</span></div>${hotspots}${pageNumber(leftNum - 1)}</div></div>`,
    );
    if (index === 0) {
      pages.push(
        `<div class="page art-page panorama-page panorama-right" data-page="${leftNum + 1}" data-chapter="0"><div class="page-inner"><div class="page-art" style="background-image:url('${picture}')"></div><div class="page-art-caption"><p class="eyebrow">YOUR JOURNEY BEGINS HERE</p><h3>${c.heading}</h3><p>${c.paragraphs.join('<br><br>')}</p><p class="chapter-quote" style="font:italic 23px var(--serif);color:var(--gold-bright);margin-top:20px">${c.quote}</p></div>${hotspot('welcome', 47, 22, 'Discover a welcome in the remembered city')}${pageNumber(leftNum)}</div></div>`,
      );
    } else {
      pages.push(
        `<div class="page text-page" data-page="${leftNum + 1}" data-chapter="${index}"><div class="page-inner page-content ${index === 6 ? 'final-page-copy' : ''}"><p class="eyebrow">${String(index + 1).padStart(2, '0')} · THE BOOK OF LIFE</p><h3>${c.heading}</h3>${c.paragraphs.map((p) => `<p>${p}</p>`).join('')}${index !== 6 ? `<p class="chapter-quote">${c.quote}</p>` : ''}${interactiveContent(index)}<p class="interaction-hint">${c.hint}</p><svg class="page-mini-flower" aria-hidden="true"><use href="#icon-flower"/></svg>${pageNumber(leftNum)}</div></div>`,
      );
    }
  });
  pages.push(
    `<div class="page cover-page" data-page="16"><div class="page-cover">${flower}<h3>The story<br><em>lives on.</em></h3><p>BEYOND THE PAGES</p></div></div>`,
  );
  return pages.join('');
}
