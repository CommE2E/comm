// @flow

import Color from 'color';

function colorIsDark(color: string) {
  return Color(`#${color}`).dark();
}

export {
  colorIsDark,
}
