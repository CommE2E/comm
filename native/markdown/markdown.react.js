// @flow

import type { TextStyle } from '../types/styles';
import type { TextStyle as FlattenedTextStyle } from 'react-native/Libraries/StyleSheet/StyleSheet';
import type { MarkdownRules } from './rules.react';

import * as React from 'react';
import * as SimpleMarkdown from 'simple-markdown';
import { Text, StyleSheet } from 'react-native';
import invariant from 'invariant';

import { onlyEmojiRegex } from 'lib/shared/emojis';

import { getMarkdownStyles } from './styles';

type Props = {|
  style: TextStyle,
  useDarkStyle: boolean,
  children: string,
  rules: MarkdownRules,
|};
function Markdown(props: Props) {
  const { useDarkStyle, rules } = props;
  const style = React.useMemo(() => {
    return getMarkdownStyles(useDarkStyle ? 'dark' : 'light');
  }, [useDarkStyle]);
  const { simpleMarkdownRules, emojiOnlyFactor } = React.useMemo(
    () => rules(style),
    [rules, style],
  );

  const parser = React.useMemo(
    () => SimpleMarkdown.parserFor(simpleMarkdownRules),
    [simpleMarkdownRules],
  );
  const ast = React.useMemo(
    () => parser(props.children, { disableAutoBlockNewlines: true }),
    [parser, props.children],
  );

  const output = React.useMemo(
    () => SimpleMarkdown.outputFor(simpleMarkdownRules, 'react'),
    [simpleMarkdownRules],
  );
  const renderedOutput = React.useMemo(() => output(ast), [ast, output]);

  const emojiOnly = React.useMemo(() => {
    if (emojiOnlyFactor === null || emojiOnlyFactor === undefined) {
      return false;
    }
    return onlyEmojiRegex.test(props.children);
  }, [emojiOnlyFactor, props.children]);
  const textStyle = React.useMemo(() => {
    if (
      !emojiOnly ||
      emojiOnlyFactor === null ||
      emojiOnlyFactor === undefined
    ) {
      return props.style;
    }
    const flattened: FlattenedTextStyle = (StyleSheet.flatten(
      props.style,
    ): any);
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
  }, [emojiOnly, props.style, emojiOnlyFactor]);

  return <Text style={textStyle}>{renderedOutput}</Text>;
}

export default Markdown;
