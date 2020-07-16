// @flow

import type { GlobalTheme } from '../types/themes';

import { getStylesForTheme } from '../themes/colors';

const unboundStyles = {
  link: {
    color: 'link',
    textDecorationLine: 'underline',
  },
};

export type MarkdownStyles = typeof unboundStyles;

export function getMarkdownStyles(theme: GlobalTheme) {
  return getStylesForTheme(unboundStyles, theme);
}
