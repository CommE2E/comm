// @flow

import * as React from 'react';
import * as SimpleMarkdown from 'simple-markdown';

import { onlyEmojiRegex } from 'lib/shared/emojis';

import { getMarkdownStyles } from './styles';
import rules from './rules.react';

type Props = {|
  darkStyle: boolean,
  children: string,
|};
function Markdown(props: Props) {
  const style = React.useMemo(() => {
    return getMarkdownStyles(props.darkStyle ? 'dark' : 'light');
  }, [props.darkStyle]);
  const customRules = React.useMemo(() => rules(style), [style]);

  const parser = React.useMemo(() => SimpleMarkdown.parserFor(customRules), [
    customRules,
  ]);
  const ast = React.useMemo(() => parser(props.children), [
    parser,
    props.children,
  ]);

  const output = React.useMemo(() => {
    return SimpleMarkdown.outputFor(customRules, 'react');
  }, [customRules]);
  const emojiOnly = React.useMemo(() => onlyEmojiRegex.test(props.children), [
    props.children,
  ]);
  return React.useMemo(() => output(ast, { emojiOnly }), [
    ast,
    output,
    emojiOnly,
  ]);
}

export default Markdown;
