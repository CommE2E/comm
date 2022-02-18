// @flow

import * as React from 'react';

import ChatMessageList from './chat-message-list.react';
import ChatTabs from './chat-tabs.react';
import { ThreadListProvider } from './thread-list-provider';

type Props = {
  +setModal: (modal: ?React.Node) => void,
};
function Chat(props: Props): React.Node {
  return (
    <>
      <ThreadListProvider>
        <ChatTabs />
      </ThreadListProvider>
      <ChatMessageList setModal={props.setModal} />
    </>
  );
}

export default Chat;
