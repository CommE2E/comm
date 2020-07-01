// @flow

import * as React from 'react';

import { threadInBackgroundChatList } from 'lib/shared/thread-utils';

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
  return (
    <div className={css.emptyItem}>
      Background threads are just like normal threads, except they appear in
      this tab instead of Home, and they don&apos;t contribute to your unread
      count.{'\n\n'}
      To move a thread over here, switch the “Background” option in its
      settings.
    </div>
  );
}
