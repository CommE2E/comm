// @flow

import * as React from 'react';
import PropTypes from 'prop-types';

import ChatMessageList from './chat-message-list.react';
import InputStateContainer from '../input/input-state-container.react';
import ChatThreadTabs from './chat-tabs.react';
import ChatThreadHome from './chat-thread-home.react';
import ChatThreadBackground from './chat-thread-background.react';
import ThreadsTab from './threads-tab.react';

type Props = {|
  setModal: (modal: ?React.Node) => void,
|};

class Chat extends React.PureComponent<Props> {
  static propTypes = {
    setModal: PropTypes.func.isRequired,
  };

  render() {
    return (
      <>
        <ChatThreadTabs>
          <ThreadsTab title="HOME">
            <ChatThreadHome />
          </ThreadsTab>
          <ThreadsTab title="BACKGROUND">
            <ChatThreadBackground />
          </ThreadsTab>
        </ChatThreadTabs>
        <InputStateContainer setModal={this.props.setModal}>
          <ChatMessageList setModal={this.props.setModal} />
        </InputStateContainer>
      </>
    );
  }
}

export default Chat;
