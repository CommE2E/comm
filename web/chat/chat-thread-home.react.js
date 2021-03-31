// @flow

import * as React from 'react';

import { threadInHomeChatList } from 'lib/shared/thread-utils';

import ChatThreadList from './chat-thread-list.react';

type Props = {|
  +setModal: (modal: ?React.Node) => void,
  +forceIncludeActiveThread: boolean,
|};
export default function ChatThreadHome(props: Props) {
  return (
    <ChatThreadList
      filterThreads={threadInHomeChatList}
      setModal={props.setModal}
      forceIncludeActiveThread={props.forceIncludeActiveThread}
    />
  );
}
