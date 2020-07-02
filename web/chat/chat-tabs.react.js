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
  homeTab = (
    <ChatThreadTab
      activeTab={this.state.activeTab}
      key="HOME"
      title="HOME"
      onClick={this.onClickTabItem}
    />
  );
  backgroundTab = (
    <ChatThreadTab
      activeTab={this.state.activeTab}
      key="BACKGROUND"
      title="BACKGROUND"
      onClick={this.onClickTabItem}
    />
  );
  render() {
    const threadTabs = [this.homeTab, this.backgroundTab];
    const threadList =
      this.state.activeTab === 'HOME' ? (
        <ChatThreadHome />
      ) : (
        <ChatThreadBackground />
      );
    return (
      <div className={css.container}>
        <ol>{threadTabs}</ol>
        <div>{threadList}</div>
      </div>
    );
  }
}

export default ChatTabs;
