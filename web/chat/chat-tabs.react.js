// @flow

import * as React from 'react';

import ChatThreadTab from './chat-thread-tab.react';
import css from './chat-tabs.css';
import ChatThreadHome from './chat-thread-home.react';
import ChatThreadBackground from './chat-thread-background.react';

type Props = {||};
type State = {|
  activeTab: string,
|};

class ChatTabs extends React.PureComponent<Props, State> {
  state = {
    activeTab: 'HOME',
  };

  onClickTabItem = (tab: string) => {
    this.setState({ activeTab: tab });
  };

  render() {
    const { activeTab } = this.state;
    const threadList =
      activeTab === 'HOME' ? <ChatThreadHome /> : <ChatThreadBackground />;

    return (
      <div className={css.container}>
        <ChatThreadTab
          activeTab={this.state.activeTab}
          title="HOME"
          onClick={this.onClickTabItem}
        />
        <ChatThreadTab
          activeTab={this.state.activeTab}
          title="BACKGROUND"
          onClick={this.onClickTabItem}
        />
        <div>{threadList}</div>
      </div>
    );
  }
}

export default ChatTabs;
