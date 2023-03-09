// @flow

import invariant from 'invariant';

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

const numberOfPossibleByteValues = 256;

function generateRandomString(length: number, availableSigns: string): string {
  invariant(length >= 0, 'length must be non-negative');
  invariant(
    availableSigns !== '' || length === 0,
    "cannot create a random string of non-zero length from availableSigns = ''",
  );
  invariant(
    numberOfPossibleByteValues >= availableSigns.length,
    `The number of available signs must not exceed ${numberOfPossibleByteValues}`,
  );

  const validByteUpperBound =
    availableSigns.length *
    Math.floor(numberOfPossibleByteValues / availableSigns.length);
  // Generating more bytes than the required length,
  // proportionally to how many values will be omitted
  // due to uniformness requirement,
  // to lower the chances of having to draw again
  const drawBytes = Math.floor(
    length * (1 + 2 * (1 - validByteUpperBound / numberOfPossibleByteValues)),
  );

  let str = '';

  while (str.length < length) {
    const rand = new Uint8Array(drawBytes);
    crypto.getRandomValues(rand);

    for (let i = 0; str.length < length && i < drawBytes; i++) {
      if (rand[i] < validByteUpperBound) {
        const index = rand[i] % availableSigns.length;
        str += availableSigns.charAt(index);
      }
    }
  }
  return str;
}

export { calculateMaxTextWidth, generateRandomString };
