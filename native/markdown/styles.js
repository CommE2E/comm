// @flow

import _memoize from 'lodash/memoize';
import { Platform } from 'react-native';

import { getStylesForTheme } from '../themes/colors';
import type { GlobalTheme } from '../types/themes';

const unboundStyles = {
  link: {
    color: 'markdownLink',
    textDecorationLine: 'underline',
  },
  italics: {
    fontStyle: 'italic',
  },
  bold: {
    fontWeight: 'bold',
  },
  underline: {
    textDecorationLine: 'underline',
  },
  strikethrough: {
    textDecorationLine: 'line-through',
    textDecorationStyle: 'solid',
  },
  inlineCode: {
    backgroundColor: 'codeBackground',
    fontFamily: (Platform.select({
      ios: 'Menlo',
      default: 'monospace',
    }): string),
    fontSize: (Platform.select({
      ios: 17,
      default: 18,
    }): number),
  },
  h1: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  h2: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  h3: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  h4: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  h5: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  h6: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  blockQuote: {
    borderLeftColor: '#00000066',
    borderLeftWidth: 8,
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    marginVertical: 6,
  },
  codeBlock: {
    backgroundColor: 'codeBackground',
    padding: 10,
    borderRadius: 5,
    marginVertical: 6,
  },
  codeBlockText: {
    fontFamily: (Platform.select({
      ios: 'Menlo',
      default: 'monospace',
    }): string),
    fontSize: (Platform.select({
      ios: 17,
      default: 18,
    }): number),
  },
  listBulletStyle: {
    fontWeight: 'bold',
  },
  listRow: {
    flexDirection: 'row',
  },
  insideListView: {
    flexShrink: 1,
  },
};

export type MarkdownStyles = typeof unboundStyles;

const getMarkdownStyles: GlobalTheme => MarkdownStyles = _memoize(
  (theme: GlobalTheme) => {
    return getStylesForTheme(unboundStyles, theme);
  },
);

export { getMarkdownStyles };
