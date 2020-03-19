// @flow

let canvas;

function calculateTextWidth(text: string, font: string): number {
  if (!canvas) {
    canvas = document.createElement('canvas');
  }
  const context = canvas.getContext('2d');
  context.font = font;
  const { width } = context.measureText(text);
  return width;
}

export { calculateTextWidth };
