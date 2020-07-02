// @flow

import * as React from 'react';

import {
  threadInBackgroundChatList,
  emptyItemText,
} from 'lib/shared/thread-utils';

import ChatThreadList from './chat-thread-list.react';
import css from './chat-tabs.css';

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
