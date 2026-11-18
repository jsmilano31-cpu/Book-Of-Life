import { $, $$ } from './experience-view.js';
import { sceneLabels } from '../models/experience.js';

export function introScrollLength() {
  return Math.max(1, $('#intro-runway').offsetHeight - window.innerHeight);
}

export function renderFallbackScene(index) {
  $$('.cinematic-scene').forEach((scene, position) => {
    scene.style.opacity = position === index ? 1 : 0;
    scene.style.visibility = position === index ? 'visible' : 'hidden';
  });
}

export function createIntroAnimation(reduced, onProgress) {
  gsap.registerPlugin(ScrollTrigger);
  const scenes = $$('.cinematic-scene');
  gsap.set(scenes, { autoAlpha: (index) => (index === 0 ? 1 : 0) });
  const timeline = gsap.timeline({ defaults: { ease: 'none' }, paused: true });
  timeline.to({}, { duration: sceneLabels.length }, 0);
  if (!reduced) {
    timeline.to(
      '.gate-left',
      {
        rotationY: -82,
        transformOrigin: '0% 50%',
        duration: 1.0,
        ease: 'power1.inOut',
      },
      0.12,
    );
    timeline.to(
      '.gate-right',
      {
        rotationY: 82,
        transformOrigin: '100% 50%',
        duration: 1.0,
        ease: 'power1.inOut',
      },
      0.12,
    );
    timeline.to(
      '.hero-copy',
      { yPercent: -12, scale: 0.96, duration: 0.85 },
      0.12,
    );
    timeline.to('.cemetery-background', { scale: 1.22, duration: 1.1 }, 0);
  }
  for (let i = 1; i < scenes.length; i++) {
    const at = i - 0.08;
    timeline.to(scenes[i - 1], { autoAlpha: 0, duration: 0.26 }, at);
    timeline.to(scenes[i], { autoAlpha: 1, duration: 0.32 }, at);
    if (!reduced) {
      const copy = scenes[i].querySelector('.scene-copy, .awakening-copy');
      timeline.fromTo(copy, { y: 35 }, { y: 0, duration: 0.6 }, at);
      const image = scenes[i].querySelector('img.scene-image');
      if (image)
        timeline.fromTo(
          image,
          { scale: 1.1 },
          { scale: 1.02, duration: 1.05 },
          at,
        );
    }
  }
  if (!reduced) {
    timeline.fromTo(
      '.artifact-button',
      { y: 70, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5 },
      3.95,
    );
    timeline.fromTo(
      '.artifact-light',
      { scale: 0.2 },
      { scale: 1.1, duration: 0.6 },
      4.1,
    );
    timeline.fromTo(
      '.artifact-cover',
      { rotationY: 0 },
      { rotationY: -12, duration: 0.55, ease: 'power1.out' },
      4.25,
    );
  }
  const trigger = ScrollTrigger.create({
    trigger: '#intro-runway',
    start: 'top top',
    end: 'bottom bottom',
    animation: timeline,
    scrub: reduced ? true : 0.55,
    invalidateOnRefresh: true,
    onUpdate: (self) => onProgress(self.progress),
  });
  gsap.from('.hero-copy>*', {
    y: reduced ? 0 : 18,
    opacity: 0,
    duration: reduced ? 0.1 : 1.2,
    stagger: reduced ? 0 : 0.1,
    ease: 'power2.out',
    delay: 0.1,
  });
  return { trigger, timeline };
}

export function clearIntroMotion() {
  window.gsap?.set(
    '.scene-copy,.awakening-copy,.hero-copy,.gate-leaf,.artifact-button,.artifact-light,.artifact-cover,.cinematic-scene .scene-image',
    {
      clearProps: 'transform,opacity',
    },
  );
}

export function resetJourneyView() {
  window.gsap?.set('#intro-stage', { opacity: 1 });
  window.gsap?.set('#book-stage', { clearProps: 'transform,opacity' });
}

export function animateCoverOpening(awakened, onComplete) {
  const timeline = gsap.timeline({
    onComplete: () => {
      gsap.set('#intro-stage', { opacity: 1 });
      onComplete();
    },
  });
  if (awakened)
    timeline.to(
      '.artifact-cover',
      { rotationY: -72, duration: 0.65, ease: 'power2.inOut' },
      0,
    );
  timeline.to(
    '#intro-stage',
    { opacity: 0, duration: 0.6 },
    awakened ? 0.3 : 0,
  );
  return timeline;
}

export function animateBookEntrance() {
  gsap.fromTo(
    '#book-stage',
    { opacity: 0, y: 30, rotationX: 12 },
    {
      opacity: 1,
      y: 0,
      rotationX: 0,
      duration: 1,
      ease: 'power2.out',
      clearProps: 'transform',
    },
  );
}

export function animateBookExit(onComplete) {
  return gsap.to('#book-stage', {
    scale: 1.25,
    opacity: 0,
    rotationX: -5,
    duration: 1.4,
    ease: 'power2.in',
    onComplete: () => {
      onComplete();
      gsap.set('#book-stage', { clearProps: 'transform,opacity' });
    },
  });
}

export function animateFinale(reduced, onComplete) {
  gsap.set('.finale-copy', { opacity: 0 });
  gsap.set('.finale-world', { scale: 1.22, xPercent: 0 });
  gsap.set('.finale-light', { opacity: 1 });
  return gsap
    .timeline({ onComplete })
    .to('.finale-light', { opacity: 0, duration: reduced ? 0.4 : 1.8 })
    .to(
      '.finale-world',
      {
        scale: 1.02,
        xPercent: reduced ? 0 : -2,
        duration: reduced ? 0.8 : 10,
        ease: 'power1.out',
      },
      0,
    )
    .to(
      '.finale-copy',
      { opacity: 1, y: reduced ? 0 : -12, duration: 1.3 },
      reduced ? 0.3 : 2.5,
    )
    .to('.finale-copy', { opacity: 0, duration: 1 }, reduced ? 4 : 10.8)
    .to('.finale-light', { opacity: 0.8, duration: 1 }, reduced ? 4.6 : 12);
}

export function showStaticFinale() {
  $('#finale-section .finale-copy').style.opacity = 1;
}

export function animateCredits() {
  gsap.fromTo(
    '.credits-inner',
    { y: 25, opacity: 0 },
    { y: 0, opacity: 1, duration: 1.2 },
  );
}
