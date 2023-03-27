// @flow

import stringHash from 'string-hash';
import tinycolor from 'tinycolor2';

import { values } from '../utils/objects.js';

function colorIsDark(color: string): boolean {
  return tinycolor(`#${color}`).isDark();
}

const selectedThreadColorsObj = Object.freeze({
  a: '4b87aa',
  b: '5c9f5f',
  c: 'b8753d',
  d: 'aa4b4b',
  e: '6d49ab',
  f: 'c85000',
  g: '008f83',
  h: '648caa',
  i: '57697f',
  j: '575757',
});

const selectedThreadColors: $ReadOnlyArray<string> = values(
  selectedThreadColorsObj,
);
export type SelectedThreadColors = $Values<typeof selectedThreadColorsObj>;

function generateRandomColor(): string {
  return selectedThreadColors[
    Math.floor(Math.random() * selectedThreadColors.length)
  ];
}

function generatePendingThreadColor(userIDs: $ReadOnlyArray<string>): string {
  const ids = [...userIDs].sort().join('#');
  const colorIdx = stringHash(ids) % selectedThreadColors.length;
  return selectedThreadColors[colorIdx];
}

export {
  colorIsDark,
  generateRandomColor,
  generatePendingThreadColor,
  selectedThreadColors,
};
