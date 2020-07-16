// @flow

import type { MarkdownRules } from './rules.react';

import * as React from 'react';
import PropTypes from 'prop-types';
import * as SimpleMarkdown from 'simple-markdown';

type Props = {|
  children: string,
  rules: MarkdownRules,
|};
class Markdown extends React.PureComponent<Props> {
  static propTypes = {
    children: PropTypes.string.isRequired,
    rules: PropTypes.func.isRequired,
  };

  ast: SimpleMarkdown.Parser;
  output: SimpleMarkdown.ReactOutput;

  constructor(props: Props) {
    super(props);

    const { simpleMarkdownRules } = this.props.rules();
    const parser = SimpleMarkdown.parserFor(simpleMarkdownRules);
    this.ast = parser(this.props.children, { inline: true });
    this.output = SimpleMarkdown.outputFor(simpleMarkdownRules, 'react');
  }

  render() {
    return this.output(this.ast);
  }
}

export default Markdown;
