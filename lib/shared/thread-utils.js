// @flow

import Color from 'color';

function colorIsDark(color: string) {
  return Color(`#${color}`).dark();
}

// Randomly distributed in RGB-space
const hexNumerals = '0123456789abcdef';
function generateRandomColor() {
  let color = "";
  for (let i = 0; i < 6; i++) {
    color += hexNumerals[Math.floor(Math.random() * 16)];
  }
  return color;
}

export {
  colorIsDark,
  generateRandomColor,
}
