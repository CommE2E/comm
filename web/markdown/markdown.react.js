// @flow

import classNames from 'classnames';
import * as React from 'react';
import * as SimpleMarkdown from 'simple-markdown';

import css from './markdown.css';
import type { MarkdownRules } from './rules.react';

type Props = {
  +children: string,
  +rules: MarkdownRules,
};
function Markdown(props: Props): React.Node {
  const { children, rules } = props;
  const { simpleMarkdownRules, useDarkStyle } = rules;

  const markdownClassName = classNames({
    [css.markdown]: true,
    [css.darkBackground]: useDarkStyle,
    [css.lightBackground]: !useDarkStyle,
  });

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
