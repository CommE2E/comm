// @flow

import classNames from 'classnames';
import * as React from 'react';
import * as SimpleMarkdown from 'simple-markdown';
import tinycolor from 'tinycolor2';

import { type ThreadInfo } from 'lib/types/thread-types';

import css from './markdown.css';
import type { MarkdownRules } from './rules.react';

type Props = {
  +children: string,
  +rules: MarkdownRules,
  +threadInfo?: ThreadInfo,
};
function Markdown(props: Props): React.Node {
  const { children, rules, threadInfo } = props;
  const { simpleMarkdownRules, useDarkStyle } = rules;

  const markdownClassName = React.useMemo(
    () =>
      classNames({
        [css.markdown]: true,
        [css.darkBackground]: useDarkStyle,
        [css.lightBackground]: !useDarkStyle,
      }),
    [useDarkStyle],
  );

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

  let darkerThreadColor;
  if (threadInfo) {
    darkerThreadColor = tinycolor(threadInfo.color).darken(20).toString();
  }

  return (
    <div
      style={{ background: darkerThreadColor }}
      className={markdownClassName}
    >
      {renderedOutput}
    </div>
  );
}

export default Markdown;
