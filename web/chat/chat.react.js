// @flow

import * as React from 'react';

import ChatThreadList from './chat-thread-list.react';
import ChatMessageList from './chat-message-list.react';

type Props = {|
|};
class Chat extends React.PureComponent<Props> {

  render() {
    return (
      <React.Fragment>
        <ChatThreadList />
        <ChatMessageList />
      </React.Fragment>
    );
  }

}

export default Chat;
