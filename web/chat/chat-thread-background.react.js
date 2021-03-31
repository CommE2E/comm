// @flow

import * as React from 'react';

import {
  threadInBackgroundChatList,
  emptyItemText,
} from 'lib/shared/thread-utils';

import css from './chat-tabs.css';
import ChatThreadList from './chat-thread-list.react';

type Props = {|
  +setModal: (modal: ?React.Node) => void,
  +forceIncludeActiveThread: boolean,
|};
export default function ChatThreadBackground(props: Props) {
  return (
    <ChatThreadList
      filterThreads={threadInBackgroundChatList}
      setModal={props.setModal}
      emptyItem={EmptyItem}
      forceIncludeActiveThread={props.forceIncludeActiveThread}
    />
  );
}

function EmptyItem() {
  return <div className={css.emptyItem}>{emptyItemText}</div>;
}
