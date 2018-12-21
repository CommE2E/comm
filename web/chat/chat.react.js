// @flow

import * as React from 'react';

import ChatThreadList from './chat-thread-list.react';
import ChatInputStateContainer from './chat-input-state-container.react';

type Props = {|
|};
class Chat extends React.PureComponent<Props> {

  render() {
    return (
      <React.Fragment>
        <ChatThreadList />
        <ChatInputStateContainer />
      </React.Fragment>
    );
  }

}

export default Chat;
