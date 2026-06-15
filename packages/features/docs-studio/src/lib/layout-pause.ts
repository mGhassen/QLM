let pauseCount = 0;

export function pauseDocLayout() {
  pauseCount += 1;
}

export function resumeDocLayout() {
  pauseCount = Math.max(0, pauseCount - 1);
}

export function isDocLayoutPaused() {
  return pauseCount > 0;
}
