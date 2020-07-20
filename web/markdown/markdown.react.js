// @flow

import type { MarkdownRules } from './rules.react';

import * as React from 'react';
import * as SimpleMarkdown from 'simple-markdown';
import classNames from 'classnames';

import css from './markdown.css';

type Props = {|
  children: string,
  rules: MarkdownRules,
  useDarkStyle: boolean,
|};
function Markdown(props: Props) {
  const { useDarkStyle, children, rules } = props;

  const markdownClassName = React.useMemo(
    () =>
      classNames({
        [css.markdown]: true,
        [css.darkBackground]: useDarkStyle,
        [css.lightBackground]: !useDarkStyle,
      }),
    [useDarkStyle],
  );

  const { simpleMarkdownRules } = React.useMemo(() => rules(), [rules]);

  const parser = React.useMemo(
    () => SimpleMarkdown.parserFor(simpleMarkdownRules),
    [simpleMarkdownRules],
  );
  const ast = React.useMemo(
    () => parser(children, { disableAutoBlockNewlines: true }),
    [parser, children],
  );

  const output = React.useMemo(
    () => SimpleMarkdown.outputFor(simpleMarkdownRules, 'react'),
    [simpleMarkdownRules],
  );
  const renderedOutput = React.useMemo(() => output(ast), [ast, output]);

  return <div className={markdownClassName}>{renderedOutput}</div>;
}

export default Markdown;
