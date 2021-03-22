// @flow

let canvas;

function calculateMaxTextWidth(
  texts: $ReadOnlyArray<string>,
  font: string,
): number {
  if (!canvas) {
    canvas = document.createElement('canvas');
  }
  const context = canvas.getContext('2d');
  context.font = font;

  const widths = texts.map(text => context.measureText(text).width);
  return Math.max(...widths);
}

export { calculateMaxTextWidth };
