// @flow

import type { GlobalTheme } from '../types/themes';

import { getStylesForTheme } from '../themes/colors';

const unboundStyles = {
  link: {
    color: 'link',
    textDecorationLine: 'underline',
  },
  paragraph: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  text: {
    color: 'listForegroundLabel',
    fontFamily: 'Arial',
    fontSize: 18,
  },
  emojiOnlyText: {
    fontSize: 36,
  },
};

export type MarkdownStyles = typeof unboundStyles;

export function getMarkdownStyles(theme: GlobalTheme) {
  return getStylesForTheme(unboundStyles, theme);
}
