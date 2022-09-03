// @flow

import classNames from 'classnames';
import * as React from 'react';
import * as SimpleMarkdown from 'simple-markdown';
import tinycolor from 'tinycolor2';

import css from './markdown.css';
import type { MarkdownRules } from './rules.react';

type Props = {
  +children: string,
  +rules: MarkdownRules,
  +threadColor?: string,
};
function Markdown(props: Props): React.Node {
  const { children, rules, threadColor } = props;
  const { simpleMarkdownRules } = rules;

  const markdownClassName = React.useMemo(
    () =>
      classNames({
        [css.markdown]: true,
      }),
    [],
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

  React.useEffect(() => {
    const blockQuote = renderedOutput.find(
      element => element.type === 'blockquote',
    );
    if (blockQuote) {
      console.log(blockQuote);
      // how do I attach the style prop to the dynamically generated blockquote?
      blockQuote.props.style = {
        backgroundColor: tinycolor(threadColor).darken(20).toString(),
      };
    }
  }, [threadColor, renderedOutput]);

  return <div className={markdownClassName}>{renderedOutput}</div>;
}

export default Markdown;
