import { createPages } from '../view/book-pages.js';
import { measureBook, sizeBookStage, renderBook } from '../view/book-view.js';
import {
  FIRST_PAGE,
  LAST_PAGE,
  chapterForPage,
  nextBookPage,
} from '../model/book.js';

/** Turn.js remains isolated here; cinematic navigation never drives its page state. */
export class BookController {
  constructor({ onPageSound, reduced }) {
    this.element = document.querySelector('#storybook');
    this.stage = document.querySelector('#book-stage');
    this.onPageSound = onPageSound;
    this.reduced = reduced;
    this.currentPage = FIRST_PAGE;
    this.ready = false;
    this.turning = false;
    this.native = false;
    this.swipe = null;
    document
      .querySelector('#previous-page')
      .addEventListener('click', () => this.navigate(-1));
    document
      .querySelector('#next-page')
      .addEventListener('click', () => this.navigate(1));
    document.addEventListener('keydown', (event) => {
      if (
        document.body.dataset.mode !== 'book' ||
        document.querySelector('dialog[open]') ||
        !document.querySelector('#chapter-drawer').hidden
      )
        return;
      if (/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        this.navigate(1);
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        this.navigate(-1);
      }
    });
    this.stage.addEventListener(
      'pointerdown',
      (event) => {
        if (
          event.pointerType !== 'touch' ||
          event.target.closest('button,a,input')
        )
          return;
        const rect = this.stage.getBoundingClientRect();
        const nearSide =
          event.clientX - rect.left < 40 || rect.right - event.clientX < 40;
        const nearEnd =
          event.clientY - rect.top < 50 || rect.bottom - event.clientY < 50;
        if (this.native && nearSide && nearEnd) {
          this.swipe = null;
          return;
        }
        this.swipe = {
          x: event.clientX,
          y: event.clientY,
          page: this.currentPage,
        };
      },
      { passive: true },
    );
    this.stage.addEventListener(
      'pointercancel',
      () => {
        this.swipe = null;
      },
      { passive: true },
    );
    this.stage.addEventListener(
      'pointerup',
      (event) => {
        if (!this.swipe) return;
        const start = this.swipe;
        this.swipe = null;
        const dx = event.clientX - start.x,
          dy = event.clientY - start.y;
        if (
          Math.abs(dx) > 60 &&
          Math.abs(dx) > Math.abs(dy) * 1.7 &&
          this.currentPage === start.page &&
          !this.turning
        )
          this.navigate(dx < 0 ? 1 : -1);
      },
      { passive: true },
    );
    let resizeTimer;
    window.addEventListener(
      'resize',
      () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          if (this.ready && !document.querySelector('#book-section').hidden)
            this.resize();
        }, 160);
      },
      { passive: true },
    );
  }
  init() {
    if (this.ready) return;
    this.element.innerHTML = createPages();
    this.pages = [...this.element.children];
    const d = measureBook();
    this.single = d.single;
    sizeBookStage(this.stage, d);
    try {
      if (!window.jQuery?.fn.turn) throw new Error('Turn.js is unavailable');
      this.$book = window.jQuery(this.element);
      this.native = true;
      this.$book.turn({
        width: d.width,
        height: d.height,
        page: FIRST_PAGE,
        display: d.single ? 'single' : 'double',
        duration: this.reduced ? 1 : 900,
        acceleration: true,
        gradients: true,
        when: {
          turning: (event, page) => {
            if (page < FIRST_PAGE || page > LAST_PAGE) {
              event.preventDefault();
              return;
            }
            this.turning = true;
            this.onPageSound?.();
          },
          turned: (_event, page) => {
            this.turning = false;
            this.currentPage = page;
            this.sync();
          },
          end: () => {
            this.turning = false;
          },
        },
      });
      this.element.dataset.engine = 'turnjs';
      if (this.reduced) this.$book.turn('disable', true);
    } catch (error) {
      this.native = false;
      console.warn('Using accessible book fallback:', error.message);
      this.element.classList.add('fallback-book');
      this.element.dataset.engine = 'fallback';
      this.element.style.width = d.width + 'px';
      this.element.style.height = d.height + 'px';
    }
    this.ready = true;
    this.sync();
  }
  resize() {
    const d = measureBook();
    sizeBookStage(this.stage, d);
    if (this.native) {
      this.$book.turn('stop');
      if (d.single !== this.single) {
        this.$book.turn('display', d.single ? 'single' : 'double');
        if (!d.single && this.currentPage % 2 === 1) this.currentPage--;
        this.$book.turn('page', this.currentPage);
      }
      this.$book.turn('size', d.width, d.height);
    } else {
      this.element.style.width = d.width + 'px';
      this.element.style.height = d.height + 'px';
    }
    this.single = d.single;
    this.sync();
  }
  setPage(page) {
    const target = Math.max(FIRST_PAGE, Math.min(LAST_PAGE, Number(page)));
    if (!this.ready) this.init();
    if (this.native) {
      this.$book.turn('stop');
      this.turning = false;
      this.$book.turn('page', target);
      if (this.reduced) {
        this.$book.turn('stop');
        this.turning = false;
      }
    }
    this.currentPage = target;
    this.sync();
  }
  setReduced(reduced) {
    this.reduced = reduced;
    if (this.ready && this.native) {
      this.$book.turn('stop');
      this.$book.turn('disable', reduced);
      this.turning = false;
    }
  }
  navigate(direction) {
    if (!this.ready || this.turning) return;
    const target = nextBookPage(this.currentPage, this.single, direction);
    if (target < FIRST_PAGE || target > LAST_PAGE) return;
    if (!this.native) this.onPageSound?.();
    this.setPage(target);
  }
  get chapter() {
    return chapterForPage(this.currentPage);
  }

  sync() {
    renderBook(
      this.element,
      this.pages,
      this.currentPage,
      this.single,
      this.native,
    );
  }
}
