// @flow

import type { AppState } from '../redux/redux-setup';

import * as React from 'react';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';
import { unreadBackgroundCount } from 'lib/selectors/thread-selectors';

import ChatThreadTab from './chat-thread-tab.react';
import css from './chat-tabs.css';
import ChatThreadHome from './chat-thread-home.react';
import ChatThreadBackground from './chat-thread-background.react';

type Props = {|
  unreadBackgroundCount: ?number,
|};
type State = {|
  activeTab: string,
|};
class ChatTabs extends React.PureComponent<Props, State> {
  static propTypes = {
    unreadBackgroundCount: PropTypes.number,
  };
  state = {
    activeTab: 'HOME',
  };

  onClickHome = () => {
    this.setState({ activeTab: 'HOME' });
  };

  onClickBackground = () => {
    this.setState({ activeTab: 'BACKGROUND' });
  };

  render() {
    const { activeTab } = this.state;
    const threadList =
      activeTab === 'HOME' ? <ChatThreadHome /> : <ChatThreadBackground />;
    let backgroundTitle = 'BACKGROUND';
    if (this.props.unreadBackgroundCount) {
      backgroundTitle += ` (${this.props.unreadBackgroundCount})`;
    }

    return (
      <div className={css.container}>
        <div className={css.tabs}>
          <ChatThreadTab
            title="HOME"
            tabIsActive={this.state.activeTab === 'HOME'}
            onClick={this.onClickHome}
          />
          <ChatThreadTab
            title={backgroundTitle}
            tabIsActive={this.state.activeTab === 'BACKGROUND'}
            onClick={this.onClickBackground}
          />
        </div>
        <div className={css.threadList}>{threadList}</div>
      </div>
    );
  }
}

export default connect((state: AppState) => ({
  unreadBackgroundCount: unreadBackgroundCount(state),
}))(ChatTabs);
