// @flow

import * as React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

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
    const isActive = this.props.activeTab === this.props.title;
    const className = classNames({
      [css.tabItem]: true,
      [css.tabItemActive]: isActive,
      [css.tabItemInactive]: !isActive,
    });
    return (
      <div className={className} onClick={this.onClick}>
        {this.props.title}
      </div>
    );
  }
}

export default ChatThreadTab;
