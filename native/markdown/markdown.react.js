// @flow

import type { TextStyle } from '../types/styles';
import type { TextStyle as FlattenedTextStyle } from 'react-native/Libraries/StyleSheet/StyleSheet';
import type { MarkdownRules } from './rules.react';

import * as React from 'react';
import * as SimpleMarkdown from 'simple-markdown';
import { View, Text, StyleSheet } from 'react-native';
import invariant from 'invariant';

import { onlyEmojiRegex } from 'lib/shared/emojis';

import { getMarkdownStyles } from './styles';

type Props = {|
  style: TextStyle,
  useDarkStyle: boolean,
  children: string,
  rules: MarkdownRules,
  // We need to use a Text container for Entry because it needs to match up
  // exactly with TextInput. However, if we use a Text container, we can't
  // support styles for things like blockQuote, which rely on rendering as a
  // View, and Views can't be nested inside Texts without explicit height and
  // width
  container: 'View' | 'Text',
|};
function Markdown(props: Props) {
  const { style, useDarkStyle, children, rules, container } = props;

  const markdownStyles = React.useMemo(() => {
    return getMarkdownStyles(useDarkStyle ? 'dark' : 'light');
  }, [useDarkStyle]);
  const { simpleMarkdownRules, emojiOnlyFactor } = React.useMemo(
    () => rules(markdownStyles),
    [rules, markdownStyles],
  );

  const parser = React.useMemo(
    () => SimpleMarkdown.parserFor(simpleMarkdownRules),
    [simpleMarkdownRules],
  );
  const ast = React.useMemo(
    () => parser(children, { disableAutoBlockNewlines: true, container }),
    [parser, children, container],
  );

  const output = React.useMemo(
    () => SimpleMarkdown.outputFor(simpleMarkdownRules, 'react'),
    [simpleMarkdownRules],
  );

  const emojiOnly = React.useMemo(() => {
    if (emojiOnlyFactor === null || emojiOnlyFactor === undefined) {
      return false;
    }
    return onlyEmojiRegex.test(children);
  }, [emojiOnlyFactor, children]);
  const textStyle = React.useMemo(() => {
    if (
      !emojiOnly ||
      emojiOnlyFactor === null ||
      emojiOnlyFactor === undefined
    ) {
      return style;
    }
    const flattened: FlattenedTextStyle = (StyleSheet.flatten(style): any);
    invariant(
      flattened && typeof flattened === 'object',
      `Markdown component should have style`,
    );
    const { fontSize } = flattened;
    invariant(
      fontSize,
      `style prop should have fontSize if using emojiOnlyFactor`,
    );
    return { ...flattened, fontSize: fontSize * emojiOnlyFactor };
  }, [emojiOnly, style, emojiOnlyFactor]);

  const renderedOutput = React.useMemo(
    () => output(ast, { textStyle, container }),
    [ast, output, textStyle, container],
  );

  if (container === 'Text') {
    return <Text>{renderedOutput}</Text>;
  } else {
    return <View>{renderedOutput}</View>;
  }
}

export default Markdown;
