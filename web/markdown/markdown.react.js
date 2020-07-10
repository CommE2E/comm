// @flow

import * as React from 'react';
import PropTypes from 'prop-types';
import * as SimpleMarkdown from 'simple-markdown';

import rules from './rules.react';

type Props = {|
  children: string,
|};
class Markdown extends React.PureComponent<Props> {
  static propTypes = {
    children: PropTypes.string.isRequired,
  };

  ast: SimpleMarkdown.Parser;
  output: SimpleMarkdown.ReactOutput;

  constructor(props: Props) {
    super(props);

    const customRules = rules();
    const parser = SimpleMarkdown.parserFor(customRules);
    this.ast = parser(this.props.children, { inline: true });
    this.output = SimpleMarkdown.outputFor(customRules, 'react');
  }

  render() {
    return <div>{this.output(this.ast)}</div>;
  }
}

export default Markdown;
