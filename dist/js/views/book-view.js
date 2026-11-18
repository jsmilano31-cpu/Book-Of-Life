import { chapters } from '../models/story.js';
import {
  FIRST_PAGE,
  LAST_PAGE,
  chapterForPage,
  firstPageOfChapter,
} from '../models/book.js';

export function measureBook() {
  const single = window.innerWidth <= 760;
  const section = document.querySelector('#book-section');
  const sectionStyle = getComputedStyle(section);
  const occupied = [
    '.reader-heading',
    '.book-navigation',
    '.reader-footer',
  ].reduce((sum, selector) => {
    const element = section.querySelector(selector),
      style = getComputedStyle(element);
    return (
      sum +
      element.getBoundingClientRect().height +
      parseFloat(style.marginTop) +
      parseFloat(style.marginBottom)
    );
  }, 0);
  const availableHeight =
    window.innerHeight -
    parseFloat(sectionStyle.paddingTop) -
    parseFloat(sectionStyle.paddingBottom) -
    occupied -
    8;
  const maxHeight = single ? 595 : 620;
  const minHeight = single ? 290 : 300;
  const ratio = single ? 0.71 : 1.83;
  const availableWidth = window.innerWidth * 0.86;
  const height = Math.min(
    maxHeight,
    Math.max(minHeight, availableHeight),
    availableWidth / ratio,
  );
  const width = height * ratio;
  return { width: Math.round(width), height: Math.round(height), single };
}

export function sizeBookStage(stage, { width, height, single }) {
  stage.style.width = width + 'px';
  stage.style.height = height + 'px';
  stage.classList.toggle('single-page', single);
}

export function renderBook(element, pages, currentPage, single, native) {
  const chapter = chapterForPage(currentPage);
  const first = firstPageOfChapter(chapter);
  const visible = single ? [currentPage] : [first, first + 1];
  for (const page of pages) {
    const active = visible.includes(Number(page.dataset.page));
    page.classList.toggle('page-active', active);
    page.setAttribute('aria-hidden', String(!active));
    page.inert = !active;
    if (!native) page.hidden = !active;
  }
  element.classList.toggle('single-fallback', single);
  document.querySelector('#previous-page').disabled = currentPage <= FIRST_PAGE;
  document.querySelector('#next-page').disabled = single
    ? currentPage >= LAST_PAGE
    : chapter >= chapters.length - 1;
  const chapterNumber = String(chapter + 1).padStart(2, '0');
  const chapterTotal = String(chapters.length).padStart(2, '0');
  const pageNumber = currentPage - FIRST_PAGE + 1;
  const pageTotal = LAST_PAGE - FIRST_PAGE + 1;
  const pageCaption = single ? ` · PAGE ${pageNumber} / ${pageTotal}` : '';
  document.querySelector('#chapter-caption').textContent =
    `CHAPTER ${chapterNumber} / ${chapterTotal}${pageCaption}`;
  document.querySelector('#page-caption').textContent = chapters[chapter].title;
  document.querySelectorAll('[data-chapter-link]').forEach((button) => {
    const active = Number(button.dataset.chapterLink) === chapter;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  document.querySelector('#announcement').textContent =
    `Chapter ${chapter + 1}: ${chapters[chapter].title}`;
}
