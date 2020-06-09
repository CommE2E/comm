// @flow

import * as React from 'react';
import * as SimpleMarkdown from 'simple-markdown';

import { getMarkdownStyles } from '../themes/markdown-styles';
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

  // We want to parse childen as one block, instead of inline.
  // To be interpreted as a one block, simple-markdown rules require \n\n at the end.
  // We don't need to add this manually and specify inline as false,
  // simple-markdown has this as default
  const ast = React.useMemo(() => parser(props.children), [
    parser,
    props.children,
  ]);

  const output = React.useMemo(() => {
    return SimpleMarkdown.outputFor(customRules, 'react');
  }, [customRules]);

  return React.useMemo(() => output(ast), [ast, output]);
}

export default Markdown;
