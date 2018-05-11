// @flow

import * as React from 'react';

import css from './chat.css';
import ChatThreadList from './chat-thread-list.react';

type Props = {|
|};
class Chat extends React.PureComponent<Props> {

  render() {
    return (
      <div className={css['chat-container']}>
        <ChatThreadList />
        <div className={css['chat-content']}>
          <div className={css['chat-coming-soon']}>
            Chat coming soon!
          </div>
        </div>
      </div>
    );
  }

}

export default Chat;
