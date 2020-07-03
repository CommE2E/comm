// @flow

import type { AppState } from '../redux-setup';

import * as React from 'react';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';
import { unreadBackgroundCount } from 'lib/selectors/thread-selectors';

import ChatThreadTab from './chat-thread-tab.react';
import css from './chat-tabs.css';
import ChatThreadHome from './chat-thread-home.react';
import ChatThreadBackground from './chat-thread-background.react';

type Props = {|
  unreadBgrCount?: number,
|};
type State = {|
  activeTab: string,
|};
class ChatTabs extends React.PureComponent<Props, State> {
  static propTypes = {
    unreadBgrCount: PropTypes.number,
  };
  state = {
    activeTab: 'HOME',
  };

  onClickTabItem = (tab: string) => {
    this.setState({ activeTab: tab });
  };

  render() {
    const { activeTab } = this.state;
    const { unreadBgrCount } = this.props;
    const threadList =
      activeTab === 'HOME' ? <ChatThreadHome /> : <ChatThreadBackground />;
    let backgroundTitle = `BACKGROUND`;
    if (unreadBgrCount) {
      backgroundTitle += ` (${unreadBgrCount})`;
    }
    return (
      <div className={css.container}>
        <div className={css.tabs}>
          <ChatThreadTab
            activeTab={this.state.activeTab}
            name="HOME"
            title="HOME"
            onClick={this.onClickTabItem}
          />
          <ChatThreadTab
            activeTab={this.state.activeTab}
            title={backgroundTitle}
            name="BACKGROUND"
            onClick={this.onClickTabItem}
          />
        </div>
        <div className={css.threadList}>{threadList}</div>
      </div>
    );
  }
}

export default connect((state: AppState) => ({
  unreadBgrCount: unreadBackgroundCount(state),
}))(ChatTabs);
