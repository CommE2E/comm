// @flow

import type { TextStyle } from '../types/styles';

import * as React from 'react';
import * as SimpleMarkdown from 'simple-markdown';
import { Text } from 'react-native';

import { onlyEmojiRegex } from 'lib/shared/emojis';

import { getMarkdownStyles } from './styles';
import rules from './rules.react';

type Props = {|
  textStyle: TextStyle,
  useDarkStyle: boolean,
  children: string,
|};
function Markdown(props: Props) {
  const style = React.useMemo(() => {
    return getMarkdownStyles(props.useDarkStyle ? 'dark' : 'light');
  }, [props.useDarkStyle]);
  const customRules = React.useMemo(() => rules(style), [style]);

  const parser = React.useMemo(() => SimpleMarkdown.parserFor(customRules), [
    customRules,
  ]);
  const ast = React.useMemo(
    () => parser(props.children, { disableAutoBlockNewlines: true }),
    [parser, props.children],
  );

  const output = React.useMemo(() => {
    return SimpleMarkdown.outputFor(customRules, 'react');
  }, [customRules]);
  const emojiOnly = React.useMemo(() => onlyEmojiRegex.test(props.children), [
    props.children,
  ]);
  const { textStyle } = props;
  const renderedOutput = React.useMemo(
    () => output(ast, { emojiOnly, textStyle }),
    [ast, output, emojiOnly, textStyle],
  );

  return <Text>{renderedOutput}</Text>;
}

export default Markdown;
