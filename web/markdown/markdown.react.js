// @flow

import * as React from 'react';
import PropTypes from 'prop-types';
import * as SimpleMarkdown from 'simple-markdown';

import { rules, advancedRules } from './rules.react';

type Props = {|
  children: string,
  onlyBasicRules?: boolean,
|};
class Markdown extends React.PureComponent<Props> {
  static propTypes = {
    children: PropTypes.string.isRequired,
    onlyBasicRules: PropTypes.bool,
  };

  ast: SimpleMarkdown.Parser;
  output: SimpleMarkdown.ReactOutput;

  constructor(props: Props) {
    super(props);

    const customRules = props.onlyBasicRules ? rules() : advancedRules();
    const parser = SimpleMarkdown.parserFor(customRules);
    this.ast = parser(this.props.children, { inline: true });
    this.output = SimpleMarkdown.outputFor(customRules, 'react');
  }

  render() {
    return this.output(this.ast);
  }
}

export default Markdown;
