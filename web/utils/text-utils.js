// @flow

let canvas;

function calculateMaxTextWidth(
  texts: $ReadOnlyArray<string>,
  fontSize: number,
): number {
  const font =
    `${fontSize}px "Inter", -apple-system, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", ` +
    '"Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", ui-sans-serif';

  if (!canvas) {
    canvas = document.createElement('canvas');
  }
  const context = canvas.getContext('2d');
  context.font = font;

  const widths = texts.map(text => context.measureText(text).width);
  return Math.max(...widths);
}

export { calculateMaxTextWidth };
