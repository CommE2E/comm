// @flow

import * as React from 'react';
import PropTypes from 'prop-types';

import ChatThreadTab from './chat-thread-tab.react';
import css from './chat-tabs.css';

type Props = {|
  children: Array<React.Element<any>>,
|};
type State = {|
  activeTab: string,
|};

class ChatTabs extends React.PureComponent<Props, State> {
  static propTypes = {
    children: PropTypes.array.isRequired,
  };

  constructor(props: Props) {
    super(props);

    this.state = {
      activeTab: 'HOME',
    };
  }

  onClickTabItem = (tab: string) => {
    this.setState({ activeTab: tab });
  };

  render() {
    const threads = this.props.children;
    const threadTabs = threads.map(child => (
      <ChatThreadTab
        activeTab={this.state.activeTab}
        key={child.props.title}
        title={child.props.title}
        onClick={this.onClickTabItem}
      />
    ));
    const threadTabContent = threads.map(child => {
      if (child.props.title === this.state.activeTab) {
        return child.props.children;
      }
    });

    return (
      <div className={css.container}>
        <ol>{threadTabs}</ol>
        <div>{threadTabContent}</div>
      </div>
    );
  }
}

export default ChatTabs;
