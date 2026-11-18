export const sceneLabels = [
  'SCROLL TO BEGIN THE JOURNEY',
  'FOLLOW THEIR STORY',
  'CROSS INTO THE UNKNOWN',
  'A WORLD AWAITS',
  'YOUR NEXT CHAPTER AWAITS',
];

export function createExperience(reduced) {
  return {
    mode: 'intro',
    scene: null,
    opening: false,
    reduced,
    atmospherePaused: false,
    bridgeLit: false,
    litCandles: new Set(),
  };
}

export function sceneAtProgress(progress) {
  return Math.min(
    sceneLabels.length - 1,
    Math.floor(progress * sceneLabels.length),
  );
}
