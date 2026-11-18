import {chapters, discoveries} from '../models/story.js';
import {createExperience, sceneAtProgress, sceneLabels} from '../models/experience.js';
import {FIRST_PAGE, firstPageOfChapter} from '../models/book.js';
import {Credits} from '../models/credits.js';
import {
  $, $$, announce, renderAtmospherePause, renderBridge, renderCandles, renderChapterMenu,
  renderCredits, renderDecorations, renderDiscovery, renderDrawer, renderMode, renderProgress,
  renderScene, renderSoundPanel, syncVideo,
} from '../views/experience-view.js';
import {
  animateBookEntrance, animateBookExit, animateCoverOpening, animateCredits, animateFinale,
  clearIntroMotion, createIntroAnimation, introScrollLength, renderFallbackScene,
  resetJourneyView, showStaticFinale,
} from '../views/cinematic-view.js';
import {AtmosphereView} from '../views/atmosphere-view.js';
import {AudioController} from './audio-controller.js';
import {BookController} from './book-controller.js';

const LAST_SCENE = sceneLabels.length - 1;

export function startExperience() {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const state = createExperience(motion.matches);
  const credits = new Credits();
  const audio = new AudioController();
  const effects = new AtmosphereView(state.reduced);
  const book = new BookController({
    reduced: state.reduced,
    onPageSound: () => audio.effect('page'),
  });

  let intro;
  let fallbackScroll;
  let transition;
  let finale;
  let finaleTimer;
  let drawerFocus;

  function updateIntro(progress, fallback = false) {
    if (state.mode !== 'intro') return;
    const scene = sceneAtProgress(progress);
    if (state.scene !== scene) {
      state.scene = scene;
      renderScene(scene);
      if (fallback) renderFallbackScene(scene);
    }
    renderProgress(progress);
  }

  function syncFallbackScroll() {
    updateIntro(Math.min(1, Math.max(0, window.scrollY / introScrollLength())), true);
  }

  function refreshIntro() {
    if (state.mode !== 'intro') return;
    if (intro) {
      intro.trigger.refresh();
      updateIntro(intro.trigger.progress);
    } else {
      syncFallbackScroll();
    }
  }

  function setupIntro() {
    intro?.trigger.kill();
    intro?.timeline.kill();
    fallbackScroll?.abort();
    clearIntroMotion();
    state.scene = null;

    if (window.gsap && window.ScrollTrigger) {
      intro = createIntroAnimation(state.reduced, updateIntro);
      if (state.mode !== 'intro') intro.trigger.disable(false);
      refreshIntro();
      return;
    }

    intro = undefined;
    fallbackScroll = new AbortController();
    const {signal} = fallbackScroll;
    let pending = false;
    window.addEventListener('scroll', () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        if (!signal.aborted) syncFallbackScroll();
      });
    }, {passive:true, signal});
    syncFallbackScroll();
  }

  function setMode(mode) {
    state.mode = mode;
    renderMode(mode);
    effects.setMode(mode);
    audio.setScene(mode);
    syncVideo(state);
    if (mode === 'intro') intro?.trigger.enable();
    else intro?.trigger.disable(false);
  }

  function cancelTransitions() {
    transition?.kill();
    finale?.kill();
    clearTimeout(finaleTimer);
    transition = undefined;
    finale = undefined;
  }

  function closeDrawer() {
    if ($('#chapter-drawer').hidden) return;
    renderDrawer(false, state.reduced);
    drawerFocus?.focus({preventScroll:true});
  }

  function restartIntro() {
    cancelTransitions();
    state.opening = false;
    closeDrawer();
    setMode('intro');
    window.scrollTo({top:0, behavior:'instant'});
    resetJourneyView();
    intro?.timeline.progress(0);
    state.scene = null;
    refreshIntro();
    $('#home-button').focus({preventScroll:true});
    announce('The journey begins again. Scroll to open the cemetery gate.');
  }

  function goToScene(index) {
    const progress = (index + .17) / sceneLabels.length;
    window.scrollTo({
      top: introScrollLength() * progress,
      behavior: state.reduced ? 'instant' : 'smooth',
    });
  }

  function openBook(page = FIRST_PAGE, instant = false) {
    if (state.opening) return;
    if (state.mode === 'book') {
      book.setPage(page);
      return;
    }

    cancelTransitions();
    state.opening = true;
    renderSoundPanel(false);
    closeDrawer();
    audio.effect('chime');
    effects.burst();

    function finishOpening() {
      transition = undefined;
      setMode('book');
      window.scrollTo({top:0, behavior:'instant'});
      book.init();
      book.resize();
      book.setPage(page);
      if (window.gsap && !state.reduced && !instant) animateBookEntrance();
      state.opening = false;
      announce('The book is open. Use the arrows, page corners, or keyboard to explore.');
      $('#next-page').focus({preventScroll:true});
    }

    if (instant || state.reduced || state.mode !== 'intro' || !window.gsap) {
      finishOpening();
    } else {
      transition = animateCoverOpening(state.scene === LAST_SCENE, finishOpening);
    }
  }

  function showCredits() {
    cancelTransitions();
    setMode('credits');
    renderCredits(credits.values);
    window.scrollTo({top:0, behavior:'instant'});
    if (window.gsap && !state.reduced) animateCredits();
    announce('The journey has reached the credits. Thank you for turning the pages.');
    $('#restart').focus({preventScroll:true});
  }

  function beginFinale() {
    if (state.mode !== 'book' || state.opening) return;
    state.opening = true;
    closeDrawer();
    audio.effect('chime');
    effects.burst();

    function revealFinale() {
      transition = undefined;
      setMode('finale');
      state.opening = false;
      window.scrollTo({top:0, behavior:'instant'});
      if (window.gsap) {
        finale = animateFinale(state.reduced, showCredits);
      } else {
        showStaticFinale();
        finaleTimer = setTimeout(showCredits, state.reduced ? 5000 : 13000);
      }
      announce('The pages become petals. The remembered world unfolds beyond the book.');
      $('#skip-finale').focus({preventScroll:true});
    }

    if (window.gsap && !state.reduced) transition = animateBookExit(revealFinale);
    else revealFinale();
  }

  function handleBookClick(event) {
    const discovery = event.target.closest('[data-discovery]');
    if (discovery) {
      event.stopPropagation();
      const detail = discoveries[discovery.dataset.discovery];
      if (detail) {
        renderDiscovery(detail);
        audio.effect();
      }
      return;
    }

    if (event.target.closest('#light-bridge')) {
      state.bridgeLit = !state.bridgeLit;
      renderBridge(state.bridgeLit);
      audio.effect();
      return;
    }

    const candle = event.target.closest('[data-candle]');
    if (candle) {
      const id = candle.dataset.candle;
      if (state.litCandles.has(id)) state.litCandles.delete(id);
      else state.litCandles.add(id);
      renderCandles(state.litCandles);
      audio.effect();
      return;
    }

    if (event.target.closest('#begin-finale')) beginFinale();
  }

  function handleDrawerKey(event) {
    if (event.key === 'Escape') {
      closeDrawer();
      return;
    }
    if (event.key !== 'Tab') return;

    const buttons = $$('#chapter-drawer button');
    const first = buttons[0];
    const last = buttons.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function bindInteractions() {
    $('#sound-toggle').addEventListener('click', () => renderSoundPanel($('#sound-panel').hidden));
    document.addEventListener('click', event => {
      if (!event.target.closest('#sound-panel,#sound-toggle')) renderSoundPanel(false);
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') renderSoundPanel(false);
    });
    $('#motion-toggle').addEventListener('click', () => {
      state.atmospherePaused = !state.atmospherePaused;
      renderAtmospherePause(state.atmospherePaused);
      effects.setPaused(state.atmospherePaused);
      syncVideo(state);
    });

    $('#chapters-toggle').addEventListener('click', () => {
      renderSoundPanel(false);
      drawerFocus = document.activeElement;
      renderDrawer(true, state.reduced);
    });
    $('#close-drawer').addEventListener('click', closeDrawer);
    $('#drawer-backdrop').addEventListener('click', closeDrawer);
    $('#chapter-drawer').addEventListener('keydown', handleDrawerKey);
    for (const button of $$('[data-chapter-link]')) {
      button.addEventListener('click', () => {
        closeDrawer();
        openBook(firstPageOfChapter(Number(button.dataset.chapterLink)), true);
      });
    }
    for (const button of $$('#home-button,#back-to-journey,#drawer-replay,#restart')) {
      button.addEventListener('click', restartIntro);
    }
    for (const button of $$('#about-button,#reader-about,#credits-sources')) {
      button.addEventListener('click', () => {
        closeDrawer();
        renderSoundPanel(false);
        $('#about-dialog').showModal();
      });
    }
    for (const button of $$('#artifact-open,#skip-story')) {
      button.addEventListener('click', () => openBook());
    }
    $('.skip-link').addEventListener('click', event => {
      event.preventDefault();
      openBook(FIRST_PAGE, true);
    });
    $('#scroll-next').addEventListener('click', () => goToScene(Math.min(LAST_SCENE, state.scene + 1)));
    for (const button of $$('.journey-markers button')) {
      button.addEventListener('click', () => goToScene(Number(button.dataset.scene)));
    }
    $('#return-book').addEventListener('click', () => openBook(firstPageOfChapter(chapters.length - 1), true));
    $('#skip-finale').addEventListener('click', showCredits);

    for (const button of $$('[data-close-dialog]')) {
      button.addEventListener('click', () => button.closest('dialog').close());
    }
    for (const dialog of $$('dialog')) {
      dialog.addEventListener('click', event => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right ||
            event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
      });
    }
    $('#storybook').addEventListener('click', handleBookClick);
    // Prevent page folds when a reader activates a control embedded in a page.
    window.jQuery?.('#storybook').on('mousedown touchstart', 'button,a,input', event => event.stopPropagation());

    const form = $('#credits-form');
    $('#edit-credits').addEventListener('click', () => {
      for (const [name, value] of Object.entries(credits.values)) form.elements.namedItem(name).value = value;
      $('#credits-dialog').showModal();
    });
    form.addEventListener('submit', event => {
      event.preventDefault();
      const persisted = credits.save(new FormData(form));
      renderCredits(credits.values);
      $('#credits-dialog').close();
      announce(persisted ? 'Your project credits have been updated.' :
        'Credits are updated for this visit. Browser storage is unavailable.');
    });
  }

  renderDecorations();
  renderChapterMenu(chapters);
  bindInteractions();
  setupIntro();
  credits.load().then(() => renderCredits(credits.values));
  if (state.reduced) syncVideo(state);
  motion.addEventListener('change', () => {
    state.reduced = motion.matches;
    effects.setReduced(state.reduced);
    book.setReduced(state.reduced);
    setupIntro();
    syncVideo(state);
  });
  window.addEventListener('pageshow', refreshIntro);

  // Keep the existing inspection interface available to browser checks.
  window.experience = {
    get mode() { return state.mode; },
    get chapter() { return book.chapter; },
    get bookReady() { return book.ready; },
    get bookEngine() { return book.native ? 'turnjs' : 'fallback'; },
    restart: restartIntro,
  };
}
