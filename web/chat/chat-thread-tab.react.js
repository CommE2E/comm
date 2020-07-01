// @flow

import * as React from 'react';
import PropTypes from 'prop-types';

import css from './chat-tabs.css';

type Props = {|
  activeTab: string,
  title: string,
  onClick: (title: string) => void,
|};

class ChatThreadTab extends React.PureComponent<Props> {
  static propTypes = {
    activeTab: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    onClick: PropTypes.func.isRequired,
  };

  onClick = () => {
    this.props.onClick(this.props.title);
  };

  render() {
    const itemStyle =
      this.props.activeTab === this.props.title
        ? css.tabItemActive
        : css.tabItem;

    return (
      <button className={itemStyle} onClick={this.onClick}>
        {this.props.title}
      </button>
    );
  }
}

export default ChatThreadTab;
