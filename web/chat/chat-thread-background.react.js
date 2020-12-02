// @flow

import {
  threadInBackgroundChatList,
  emptyItemText,
} from 'lib/shared/thread-utils';
import * as React from 'react';

import css from './chat-tabs.css';
import ChatThreadList from './chat-thread-list.react';

export default function ChatThreadBackground() {
  return (
    <ChatThreadList
      filterThreads={threadInBackgroundChatList}
      emptyItem={EmptyItem}
    />
  );
}

function EmptyItem() {
  return <div className={css.emptyItem}>{emptyItemText}</div>;
}
