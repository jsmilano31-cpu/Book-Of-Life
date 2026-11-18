import {chapters} from './story.js';

export const FIRST_PAGE = 2;
export const LAST_PAGE = FIRST_PAGE + chapters.length * 2 - 1;

export function firstPageOfChapter(chapter) {
  return FIRST_PAGE + chapter * 2;
}

export function chapterForPage(page) {
  return Math.floor((page - FIRST_PAGE) / 2);
}

export function nextBookPage(page, single, direction) {
  return single ? page + direction : firstPageOfChapter(chapterForPage(page)) + 2 * direction;
}
